"""Fine-tune the embedding model on the synthetic Indonesian logistics data.

Run this on **Kaggle or Google Colab** (GPU, fast HuggingFace download) — not in
the sandbox. The script:

1. Builds semantic-similarity pairs from the synthetic orders (positive = cargo
   description vs its own category phrase; negative = description vs a wrong
   category phrase).
2. Fine-tunes a pretrained multilingual SentenceTransformer with
   ``CosineSimilarityLoss`` (PRD 14.3: embedding must be fine-tuned).
3. Exports the full encoder (transformer + mean-pooling + L2 normalize) to a
   single ``embedding.onnx`` plus ``tokenizer.json`` and ``embedding_config.json``.

Download the three artifact files back into ``backend/app/models/artifacts/``.

Colab quickstart::

    !pip install -q sentence-transformers transformers tokenizers onnx onnxruntime
    !git clone https://github.com/<org>/backflow-ai.git
    %cd backflow-ai
    !python data/scripts/finetune_embedding.py --data-dir data --out-dir /content/artifacts

Documentation: ``docs/ai-model.md``, decision ``docs/decisions.md`` D7-D8.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path
from typing import Any

import numpy as np
import torch
from sentence_transformers import InputExample, SentenceTransformer, losses
from torch import nn
from torch.onnx import export as torch_onnx_export

import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

from cargo_catalog import CATEGORIES  # noqa: E402

DEFAULT_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


class _PoolingWrapper(nn.Module):
    """Wraps the SentenceTransformer to export pooled + normalized embeddings.

    SentenceTransformer.forward expects a ``features`` dict, which torch.onnx
    cannot express directly. This wrapper exposes ``(input_ids, attention_mask)``
    and returns the final ``(batch, dim)`` normalized embedding, matching the
    training-time output of SentenceTransformer.encode().
    """

    def __init__(self, model: SentenceTransformer) -> None:
        super().__init__()
        self.transformer = model[0]  # underlying transformer module
        self.pooler = model[1]       # mean-pooling module

    def forward(self, input_ids: torch.Tensor, attention_mask: torch.Tensor) -> torch.Tensor:
        features = {
            "input_ids": input_ids,
            "attention_mask": attention_mask,
            "token_type_ids": torch.zeros_like(input_ids, dtype=torch.long),
        }
        sentence_embedding = self.pooler(self.transformer(features))["sentence_embedding"]
        return nn.functional.normalize(sentence_embedding, p=2, dim=1)


def _category_phrase(category: str) -> str:
    """Compose the canonical text used to represent a cargo category."""
    keywords = CATEGORIES.get(category, [])
    return f"{category} ({', '.join(keywords[:4])})"


def build_pairs(
    orders_csv: Path, negatives_per_positive: int, seed: int
) -> list[InputExample]:
    """Build positive/negative semantic pairs from the synthetic orders."""
    import pandas as pd

    rng = random.Random(seed)
    orders = pd.read_csv(orders_csv)
    descriptions = orders["cargo_description"].tolist()
    categories = list(CATEGORIES)

    pairs: list[InputExample] = []
    for desc in descriptions:
        # Positive pair: description vs its own category phrase.
        category = str(orders.loc[orders["cargo_description"] == desc, "cargo_category"].iloc[0])
        pairs.append(InputExample(texts=[desc, _category_phrase(category)], label=1.0))
        # Negative pairs: description vs unrelated category phrases.
        others = [c for c in categories if c != category]
        for _ in range(negatives_per_positive):
            wrong = rng.choice(others)
            pairs.append(InputExample(texts=[desc, _category_phrase(wrong)], label=0.0))
    return pairs


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=Path("data"))
    parser.add_argument("--out-dir", type=Path, default=Path("embedding_artifacts"))
    parser.add_argument("--model-name", type=str, default=DEFAULT_MODEL)
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=2e-5)
    parser.add_argument("--max-seq-len", type=int, default=128)
    parser.add_argument("--negatives", type=int, default=2)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    torch.manual_seed(args.seed)
    np.random.seed(args.seed)
    random.seed(args.seed)

    model = SentenceTransformer(args.model_name)
    model.max_seq_length = args.max_seq_len

    print(f"base model: {args.model_name} (fine-tuning in progress)")
    pairs = build_pairs(args.data_dir / "orders.csv", args.negatives, args.seed)
    print(f"pairs: {len(pairs)} ({len(pairs)} = pos + {args.negatives}x neg)")

    train_dataloader = torch.utils.data.DataLoader(
        pairs, batch_size=args.batch_size, shuffle=True
    )
    loss = losses.CosineSimilarityLoss(model)
    warmup = int(len(train_dataloader) * args.epochs * 0.1)
    model.fit(
        train_objectives=[(train_dataloader, loss)],
        epochs=args.epochs,
        warmup_steps=warmup,
        optimizer_params={"lr": args.lr},
        show_progress_bar=True,
    )

    # Export ONNX: encoder + pooling + normalization in one graph.
    wrapper = _PoolingWrapper(model)
    wrapper.eval()
    dummy_ids = torch.ones(1, args.max_seq_len, dtype=torch.long)
    dummy_mask = torch.ones(1, args.max_seq_len, dtype=torch.long)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    onnx_path = args.out_dir / "embedding.onnx"
    torch_onnx_export(
        wrapper,
        (dummy_ids, dummy_mask),
        str(onnx_path),
        input_names=["input_ids", "attention_mask"],
        output_names=["sentence_embedding"],
        dynamic_axes={
            "input_ids": {0: "batch", 1: "seq_len"},
            "attention_mask": {0: "batch", 1: "seq_len"},
            "sentence_embedding": {0: "batch"},
        },
        opset_version=14,
    )

    # Persist tokenizer + config next to the ONNX graph.
    model.tokenizer.save_pretrained(str(args.out_dir))  # writes tokenizer.json etc.
    config: dict[str, Any] = {
        "base_model": args.model_name,
        "fine_tuned": True,
        "loss": "CosineSimilarityLoss",
        "epochs": args.epochs,
        "learning_rate": args.lr,
        "max_seq_len": args.max_seq_len,
        "negative_pairs_per_positive": args.negatives,
        "seed": args.seed,
        "embedding_dim": model.get_sentence_embedding_dimension(),
        "onnx_opset": 14,
    }
    (args.out_dir / "embedding_config.json").write_text(
        json.dumps(config, indent=2), encoding="utf-8"
    )

    print(f"\nartifacts written to {args.out_dir.resolve()}:")
    print("  embedding.onnx, tokenizer.json, embedding_config.json")
    print("Download these files to backend/app/models/artifacts/")


if __name__ == "__main__":
    main()
