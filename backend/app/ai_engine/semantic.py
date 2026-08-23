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


def category_phrase(category: str) -> str:
    """Canonical text used to represent a cargo category for embedding."""
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

    def similarity(self, text_a: str, text_b: str) -> float:
        """Cosine similarity in ``[0, 1]`` between two texts."""
        if self._embedding is not None:
            va, vb = self._embedding.encode([text_a, text_b])
            return float(np.dot(va, vb))
        if self._tfidf is None:
            return 0.0
        import scipy.sparse as sp

        va = self._tfidf.transform([text_a])
        vb = self._tfidf.transform([text_b])
        norm = lambda v: v / (sp.linalg.norm(v) + 1e-9)
        return float((norm(va) @ norm(vb).T).toarray()[0, 0])

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
