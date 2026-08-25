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
    print("\n" + "=" * 80)
    print(f"🤖 [AI ENGINE] INITIATING BACKHAUL SEARCH FOR TRUCK: {truck.truck_id or 'TRK-PROD'}")
    print(f"   Route: {truck.origin} ➔ {truck.destination} | Empty Capacity: {truck.free_capacity_tons} Tons | Arrival Date: {truck.arrival_date}")
    print(f"   Accepted Cargo Types: {list(truck.accepted_cargo_types)}")
    print(f"   Total Orders in Database: {len(orders)}")
    
    candidates = [
        order for order in orders if order.weight_tons <= truck.free_capacity_tons
    ]
    print(f"   Candidates passing capacity hard-constraint: {len(candidates)} / {len(orders)}")
    print("-" * 80)
    
    if not candidates:
        print("❌ [AI DECISION] NO MATCH: Zero candidates passed the capacity check.")
        print("=" * 80 + "\n")
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
        
        # Log evaluation of each candidate in the terminal
        print(f"📝 [AI EVALUATOR] Order {order.order_id} ({order.pickup_city} ➔ {order.dropoff_city}):")
        print(f"     Detour Distance  : {features.get('route_distance_km', 0.0):.2f} km")
        print(f"     Route Fit        : {sub.get('route_fit', 0.0) * 100.0:.1f}%")
        print(f"     Schedule Fit     : {sub.get('schedule_fit', 0.0) * 100.0:.1f}%")
        print(f"     Capacity Ratio   : {sub.get('capacity_fit', 0.0) * 100.0:.1f}%")
        print(f"     Semantic Fit     : {sub.get('semantic_fit', 0.0) * 100.0:.1f}%")
        print(f"     ➡️ Predicted Match Score: {score:.1f}%")
        print(f"     --------------------------------------------------")
        
        if score > best[0]:
            best = (score, order, sub, features)

    score, best_order, sub, features = best
    model_lbl = scoring_model.manifest.get("model") if scoring_model else "XGBoost (Fallback Weights)"
    explanation = explain(score, sub, model_lbl)
    
    if score < threshold:
        print(f"⚠️ [AI DECISION] REJECTED: Best score ({score:.1f}%) is below minimum threshold ({threshold}%).")
        print(f"   Reason: {explanation}")
        print("=" * 80 + "\n")
        return MatchResult(
            status="low",
            best_order=None,
            score=score,
            sub_scores=sub,
            candidate_count=len(candidates),
            explanation="Belum ada kecocokan yang layak untuk rute ini.",
        )
        
    print(f"🏆 [AI DECISION] BEST MATCH FOUND: {best_order.order_id} ({best_order.pickup_city} ➔ {best_order.dropoff_city})")
    print(f"   Model used: {model_lbl} | Score: {score:.1f}%")
    print(f"   Reason: {explanation}")
    print("=" * 80 + "\n")
    return MatchResult(
        status="ok",
        best_order=best_order,
        score=score,
        sub_scores=sub,
        candidate_count=len(candidates),
        explanation=explanation,
    )
