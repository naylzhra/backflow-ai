"""Best-match selection and edge cases.

Scores every candidate order for a truck, enforces the capacity hard constraint,
and returns **exactly one** result: a recommendation, a "no decent match" state
(score below threshold), or an "empty candidates" state (PRD 13.3).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping

from .features import Order, Truck, build_feature_vector
from .scoring import MATCH_THRESHOLD, compose_score, explain, sub_scores


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


def find_best_match(
    truck: Truck,
    orders: list[Order],
    cities: Mapping[str, Mapping[str, float]],
    semantic: Any,
    scoring_model: Any = None,
    threshold: float = MATCH_THRESHOLD,
) -> MatchResult:
    """Score all orders for ``truck`` and return the single best outcome.

    Orders exceeding the truck's free capacity are excluded (never recommended).
    """
    if not orders:
        return MatchResult(status="empty", best_order=None, candidate_count=0)

    candidates = [
        order for order in orders if order.weight_tons <= truck.free_capacity_tons
    ]
    if not candidates:
        return MatchResult(status="empty", best_order=None, candidate_count=len(orders))

    best: tuple[float, Order | None, dict[str, float], dict[str, float]] = (
        -1.0, None, {}, {},
    )
    for order in candidates:
        features = build_feature_vector(truck, order, cities, semantic)
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
