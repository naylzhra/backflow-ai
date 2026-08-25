"""Feature vector builder shared by training and inference.

Turns one truck x order pair into the four numeric features consumed by the
scoring model. This is the canonical implementation; the training script
(``data/scripts/build_features.py``) imports it so training and runtime compute
byte-identical features (decision D4).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Mapping

from .geo import point_to_segment_km
from .preprocess import capacity_ratio, schedule_overlap_days, normalize_city
from .semantic import SemanticScorer

#: Canonical feature order (must match the scoring-model manifest).
FEATURES: list[str] = [
    "route_distance_km",
    "schedule_overlap_days",
    "capacity_ratio",
    "semantic_similarity",
]


@dataclass(frozen=True)
class Truck:
    """A truck about to run an (empty) backhaul after arriving at ``destination``."""

    truck_id: str
    origin: str
    destination: str
    arrival_date: date
    free_capacity_tons: float
    accepted_cargo_types: list[str]  # empty list = flexible ("Semua jenis")


@dataclass(frozen=True)
class Order:
    """An internal shipment that could fill the backhaul."""

    order_id: str
    pickup_city: str
    dropoff_city: str
    pickup_start: date
    pickup_end: date
    weight_tons: float
    cargo_description: str


def _coords(cities: Mapping[str, Mapping[str, float]], name: str) -> tuple[float, float]:
    """Resolve ``(lat, lon)`` for a city name, case-insensitively."""
    norm_name = normalize_city(name)
    indexed = {key.strip().lower(): value for key, value in cities.items()}
    point = indexed[norm_name.strip().lower()]
    return float(point["lat"]), float(point["lon"])


def build_feature_vector(
    truck: Truck,
    order: Order,
    cities: Mapping[str, Mapping[str, float]],
    semantic: SemanticScorer | None = None,
    semantic_score: float | None = None,
) -> dict[str, float]:
    """Return the four features for one truck x order pair.

    ``semantic_score`` overrides the semantic feature so bulk feature extraction
    can precompute embeddings once and inject the value (avoids re-encoding per
    pair); otherwise the scorer is invoked.
    """
    pl, pn = _coords(cities, order.pickup_city)
    ol, on = _coords(cities, truck.origin)
    dl, dn = _coords(cities, truck.destination)
    if semantic_score is None:
        if semantic is None:
            semantic_score = 0.0
        else:
            semantic_score = semantic.score_cargo_vs_types(
                order.cargo_description, truck.accepted_cargo_types
            )
    return {
        "route_distance_km": round(
            point_to_segment_km(pl, pn, ol, on, dl, dn), 2
        ),
        "schedule_overlap_days": schedule_overlap_days(
            order.pickup_start, order.pickup_end, truck.arrival_date
        ),
        "capacity_ratio": round(
            capacity_ratio(order.weight_tons, truck.free_capacity_tons), 4
        ),
        "semantic_similarity": round(float(semantic_score), 4),
    }
