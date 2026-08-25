"""Best-match selection and edge cases.

Scores every candidate order for a truck, enforces the capacity hard constraint,
and returns **exactly one** result: a recommendation, a "no decent match" state
(score below threshold), or an "empty candidates" state (PRD 13.3).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping

import numpy as np

from .features import Order, Truck, build_feature_vector
from .scoring import MATCH_THRESHOLD, compose_score, explain, sub_scores
from .semantic import SemanticScorer, category_phrase


@dataclass(frozen=True)
class MatchResult:
    """Outcome of a matching run (exactly one best recommendation)."""

    status: str  # "ok" | "low" | "empty"
    best_order: Order | None
    score: float = 0.0
    sub_scores: dict[str, float] = field(default_factory=dict)
    candidate_count: int = 0
    explanation: str = ""
    model_name: str | None = None


def _batch_semantic_scores(
    semantic: SemanticScorer, accepted_types: list[str], descriptions: list[str]
) -> list[float]:
    """Semantic score of every description vs the truck's accepted types.

    Batches the embedding of all descriptions and category phrases into two
    ONNX/TF-IDF calls instead of one per candidate, keeping inference well under
    the 3s latency target. Flexible trucks (empty accepted list) score 1.0.
    """
    if not accepted_types:
        return [1.0] * len(descriptions)
    desc_vectors = semantic.encode(descriptions)  # (n, dim)
    phrases = [category_phrase(category) for category in accepted_types]
    cat_vectors = semantic.encode(phrases)  # (k, dim)
    similarities = desc_vectors @ cat_vectors.T  # (n, k)
    return [float(similarities[i].max()) for i in range(len(descriptions))]


def find_best_match(
    truck: Truck,
    orders: list[Order],
    cities: Mapping[str, Mapping[str, float]],
    semantic: SemanticScorer,
    scoring_model: Any = None,
    threshold: float = MATCH_THRESHOLD,
) -> MatchResult:
    """Score all orders for ``truck`` and return the single best outcome.

    Orders exceeding the truck's free capacity are excluded (never recommended).
    Semantic similarity is computed in one batched pass for all candidates.
    """
    if not orders:
        return MatchResult(status="empty", best_order=None, candidate_count=0)

    candidates = [
        order for order in orders if order.weight_tons <= truck.free_capacity_tons
    ]
    if not candidates:
        return MatchResult(status="empty", best_order=None, candidate_count=len(orders))

    sem_scores = _batch_semantic_scores(
        semantic, truck.accepted_cargo_types, [o.cargo_description for o in candidates]
    )

    best: tuple[float, Order | None, dict[str, float], dict[str, float]] = (
        -1.0, None, {}, {},
    )
    for order, sem_score in zip(candidates, sem_scores):
        features = build_feature_vector(
            truck, order, cities, semantic_score=sem_score
        )
        sub = sub_scores(features)
        score = compose_score(features, sub, scoring_model)
        if score > best[0]:
            best = (score, order, sub, features)

    score, best_order, sub, features = best
    explanation = explain(score, sub, scoring_model.manifest.get("model") if scoring_model else None)
    if score < threshold:
        return MatchResult(
            status="low",
            best_order=None,
            score=score,
            sub_scores=sub,
            candidate_count=len(candidates),
            explanation="Belum ada kecocokan yang layak untuk rute ini.",
        )
    return MatchResult(
        status="ok",
        best_order=best_order,
        score=score,
        sub_scores=sub,
        candidate_count=len(candidates),
        explanation=explanation,
    )
