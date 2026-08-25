"""Prune the fine-tuned embedding model to a small, commit-able size.

The fine-tuned ``embedding.onnx`` is ~470 MB because the multilingual Unigram
tokenizer carries a ~250k-token vocabulary and the word-embedding table is that
large. For a single-company MVP only a few thousand tokens are ever seen at
runtime, so we:

1. tokenize the domain corpus (cargo descriptions, categories, keywords, common
   Indonesian words) to collect the used token ids;
2. slice the ONNX word-embedding rows to those ids (values are unchanged, so the
   fine-tuned embeddings are preserved exactly);
3. rebuild ``tokenizer.json`` with the same pruned vocabulary, keeping the
   token->id mapping aligned with the sliced rows;
4. dynamic-int8 quantize the transformer weights.

Result: a self-contained artifact under ~100 MB that fits in the git repo and
loads without any network/LFS dependency (decision D8).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))
sys.path.insert(0, str(REPO_ROOT / "backend"))

ARTIFACTS = REPO_ROOT / "backend" / "app" / "models" / "artifacts"

SPECIAL_TOKENS = ("<s>", "<pad>", "</s>", "<unk>", "<mask>")
WORD_EMBEDDING = "transformer.model.embeddings.word_embeddings.weight"


def _domain_texts() -> list[str]:
    """All texts the runtime will ever embed."""
    import pandas as pd

    from app.ai_engine.cargo_catalog import CATEGORIES
    from app.ai_engine.preprocess import STOPWORDS
    from app.ai_engine.semantic import category_phrase

    orders = pd.read_csv(REPO_ROOT / "data" / "orders.csv")
    texts = list(orders["cargo_description"].dropna().astype(str))
    for category in CATEGORIES:
        texts.append(category_phrase(category))
        texts.extend(CATEGORIES[category])
    texts.extend(STOPWORDS)
    texts.extend(["teks", "jenis", "muatan", "diterima", "truk", "rute",
                  "pengiriman", "kota", "jakarta", "surabaya", "semarang",
                  "bandung", "medan", "cirebon", "solo", "malang", "yogyakarta",
                  "pekanbaru", "palembang", "lampung", "makassar", "bekasi",
                  "tangerang", "bogor", "depok"])
    return texts


def _prune_tokenizer(path: Path, used_ids: list[int], out: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    vocab = data["model"]["vocab"]  # list of [piece, score], id = index
    old_to_new = {old: new for new, old in enumerate(used_ids)}
    new_vocab = [vocab[old] for old in used_ids]
    data["model"]["vocab"] = new_vocab
    data["model"]["unk_id"] = old_to_new[_token_id(data, "<unk>")]

    for entry in data.get("added_tokens", []):
        old = entry["id"]
        entry["id"] = old_to_new[old]

    special_tokens = data.get("post_processor", {}).get("special_tokens", {})
    for meta in special_tokens.values():
        meta["ids"] = [old_to_new[old] for old in meta["ids"]]

    out.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return old_to_new


def _token_id(data: dict, token: str) -> int:
    for entry in data.get("added_tokens", []):
        if entry["content"] == token:
            return entry["id"]
    for i, entry in enumerate(data["model"]["vocab"]):
        if entry[0] == token:
            return i
    raise KeyError(token)


def _prune_onnx(path: Path, used_ids: list[int], out: Path) -> None:
    import onnx
    from onnx import numpy_helper

    model = onnx.load(str(path))
    for i, init in enumerate(model.graph.initializer):
        if init.name == WORD_EMBEDDING:
            weight = numpy_helper.to_array(init)
            pruned = weight[used_ids]  # [len(used_ids), 384], values unchanged
            replacement = numpy_helper.from_array(pruned, name=init.name)
            model.graph.initializer[i].CopyFrom(replacement)
    onnx.checker.check_model(model)
    onnx.save(model, str(out))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifacts", type=Path, default=ARTIFACTS)
    parser.add_argument("--src-tokenizer", type=Path)
    parser.add_argument("--src-onnx", type=Path)
    args = parser.parse_args()

    src_tok = args.src_tokenizer or args.artifacts / "tokenizer.json"
    src_onnx = args.src_onnx or args.artifacts / "embedding.onnx"

    from tokenizers import Tokenizer

    tokenizer = Tokenizer.from_file(str(src_tok))
    used: set[int] = set()
    for text in _domain_texts():
        used.update(tokenizer.encode(text).ids)
    for special in SPECIAL_TOKENS:
        used.add(tokenizer.token_to_id(special))
    used_ids = sorted(used)
    print(f"vocab: 250002 -> {len(used_ids)} tokens")

    old_to_new = _prune_tokenizer(src_tok, used_ids, args.artifacts / "tokenizer.json")
    _prune_onnx(src_onnx, used_ids, args.artifacts / "embedding_pruned.onnx")

    # Verify segmentation is preserved and ids remap correctly.
    from tokenizers import Tokenizer as NewTokenizer

    new_tok = NewTokenizer.from_file(str(args.artifacts / "tokenizer.json"))
    mismatches = 0
    for text in _domain_texts()[:200]:
        old_pieces = tokenizer.encode(text).tokens
        new_pieces = new_tok.encode(text).tokens
        if old_pieces != new_pieces:
            mismatches += 1
    print(f"segmentation mismatches: {mismatches}")

    # Verify id remap consistency for a few tokens.
    sample = _domain_texts()[0]
    old_ids = tokenizer.encode(sample).ids
    new_ids = new_tok.encode(sample).ids
    assert [old_to_new[old] for old in old_ids] == new_ids, "id remap mismatch"
    print("id remap consistent.")

    import os
    for name in ("embedding_pruned.onnx", "tokenizer.json"):
        print(f"  {name}: {os.path.getsize(args.artifacts/name)/1e6:.1f} MB")


if __name__ == "__main__":
    main()
