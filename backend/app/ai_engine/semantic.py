"""Semantic similarity scorer shared by training and inference.

Primary backend is the fine-tuned ``embedding.onnx`` (via
``app.models.embedding_loader``). When the artifact is missing (e.g. before the
Kaggle/Colab fine-tune is downloaded) it falls back to a seeded TF-IDF cosine so
the pipeline stays testable end-to-end (decision D9). Either way, the *same*
scorer is used at training and inference time so ``semantic_similarity`` never
drifts.
"""

from __future__ import annotations

from typing import Any

import numpy as np

from .cargo_catalog import CATEGORIES
from .preprocess import categorize_cargo


def normalize_category(name: str) -> str:
    """Map an accepted-cargo-type string to the canonical category key.

    The frontend may send capitalized or paraphrased labels (e.g. "Tekstil").
    Exact keys pass through; anything else is mapped via the cargo catalog so
    the embedding phrase always matches the training-time vocabulary.
    """
    key = name.strip()
    if key in CATEGORIES:
        return key
    mapped = categorize_cargo(key)
    return mapped or key


def category_phrase(category: str) -> str:
    """Canonical text used to represent a cargo category for embedding."""
    category = normalize_category(category)
    keywords = CATEGORIES.get(category, [])
    return f"{category} ({', '.join(keywords[:4])})"


class SemanticScorer:
    """Computes cosine similarity between two texts (or cargo vs accepted types)."""

    def __init__(
        self,
        embedding_model: Any = None,
        corpus_texts: list[str] | None = None,
    ) -> None:
        self._embedding = embedding_model
        self._tfidf: Any = None
        self._corpus_matrix: Any = None
        self._mode = "none"
        if self._embedding is not None:
            self._mode = "onnx-fine-tuned"
        elif corpus_texts:
            self._fit_tfidf(corpus_texts)
            self._mode = "tfidf-fallback"

    @property
    def mode(self) -> str:
        """Identifier of the active semantic backend."""
        return self._mode

    def _fit_tfidf(self, texts: list[str]) -> None:
        from sklearn.feature_extraction.text import TfidfVectorizer

        self._tfidf = TfidfVectorizer(lowercase=True)
        self._corpus_matrix = self._tfidf.fit_transform(texts)

    def encode(self, texts: list[str]) -> np.ndarray:
        """L2-normalized embedding matrix ``(n, dim)`` for ``texts``.

        Uses the fine-tuned ONNX embedding when available, otherwise the TF-IDF
        vectors. Batching here is what keeps training-time feature extraction fast.
        """
        if self._embedding is not None:
            return self._embedding.encode(texts)
        if self._tfidf is not None:
            dense = self._tfidf.transform(texts).toarray()
            norms = np.linalg.norm(dense, axis=1, keepdims=True) + 1e-9
            return dense / norms
        return np.zeros((len(texts), 1), dtype=np.float32)

    def similarity(self, text_a: str, text_b: str) -> float:
        """Cosine similarity in ``[0, 1]`` between two texts."""
        matrix = self.encode([text_a, text_b])
        return float(np.dot(matrix[0], matrix[1]))

    def score_cargo_vs_types(
        self, cargo_description: str, accepted_cargo_types: list[str]
    ) -> float:
        """Cargo-to-truck semantic score; ``1.0`` when the truck is flexible.

        An empty accepted list means "Semua jenis" (flexible), so every category
        is accepted. Otherwise the maximum similarity across the accepted
        category phrases is returned.
        """
        if not accepted_cargo_types:
            return 1.0
        scores = [
            self.similarity(cargo_description, category_phrase(category))
            for category in accepted_cargo_types
        ]
        return float(max(scores)) if scores else 0.0

    def score_cargo_vs_category(self, cargo_description: str) -> float:
        """Similarity of a description to its own inferred category phrase."""
        category = categorize_cargo(cargo_description)
        if not category:
            return 0.0
        return self.similarity(cargo_description, category_phrase(category))
