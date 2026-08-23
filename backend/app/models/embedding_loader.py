"""Runtime loader for the fine-tuned embedding model (ONNX).

Loads the ONNX graph exported by ``data/scripts/finetune_embedding.py`` and runs
inference with ``onnxruntime`` + ``tokenizers`` (no torch required at runtime,
satisfying "load without re-training" and keeping the request path light).

Expected artifact files next to this module in ``artifacts/``:

- ``embedding.onnx`` — encoder (transformer + pooling + L2 normalize)
- ``tokenizer.json`` — HuggingFace tokenizer config
- ``embedding_config.json`` — ``{base_model, max_seq_len, ...}``

``encode()`` returns L2-normalized embeddings, so cosine similarity between two
sentences is simply their dot product.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np

ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"


class EmbeddingModel:
    """Minimal torch-free wrapper around the exported ONNX encoder."""

    def __init__(
        self,
        onnx_path: Path = ARTIFACTS_DIR / "embedding.onnx",
        tokenizer_path: Path = ARTIFACTS_DIR / "tokenizer.json",
        config_path: Path = ARTIFACTS_DIR / "embedding_config.json",
    ) -> None:
        import onnxruntime as ort
        from tokenizers import Tokenizer

        if not onnx_path.exists():
            raise FileNotFoundError(
                f"embedding artifact not found: {onnx_path}. "
                "Run data/scripts/finetune_embedding.py (Kaggle/Colab) and place "
                "the artifacts in backend/app/models/artifacts/."
            )
        self.session = ort.InferenceSession(
            str(onnx_path), providers=["CPUExecutionProvider"]
        )
        self.tokenizer = Tokenizer.from_file(str(tokenizer_path))
        self.input_names = [i.name for i in self.session.get_inputs()]

        self.max_seq_len = 128
        if config_path.exists():
            config: dict[str, Any] = json.loads(config_path.read_text(encoding="utf-8"))
            self.max_seq_len = int(config.get("max_seq_len", self.max_seq_len))
        self.tokenizer.enable_truncation(max_length=self.max_seq_len)
        self.tokenizer.enable_padding(length=self.max_seq_len)

    def _encode_tokens(self, texts: list[str]) -> dict[str, np.ndarray]:
        """Tokenize texts into ONNX input tensors."""
        batch = [self.tokenizer.encode(t) for t in texts]
        input_ids = np.array([b.ids for b in batch], dtype=np.int64)
        attention_mask = np.array([b.attention_mask for b in batch], dtype=np.int64)
        feed = {
            "input_ids": input_ids,
            "attention_mask": attention_mask,
        }
        if "token_type_ids" in self.input_names:
            feed["token_type_ids"] = np.zeros_like(input_ids, dtype=np.int64)
        return feed

    def encode(self, texts: list[str]) -> np.ndarray:
        """Return L2-normalized ``(n, dim)`` embeddings for ``texts``."""
        if not texts:
            return np.zeros((0, 1), dtype=np.float32)
        feed = self._encode_tokens(texts)
        output = self.session.run(None, feed)[0]
        if output.ndim == 3:  # last_hidden_state -> mean-pool + normalize
            mask = feed["attention_mask"][:, :, None].astype(np.float32)
            pooled = (output * mask).sum(axis=1) / np.maximum(mask.sum(axis=1), 1e-9)
            output = pooled
        norms = np.linalg.norm(output, axis=1, keepdims=True)
        return output / np.maximum(norms, 1e-9)
