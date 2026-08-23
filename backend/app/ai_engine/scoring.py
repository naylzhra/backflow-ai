"""Score composition and transparency explanation.

Two layers:

- ``sub_scores`` breaks a feature vector into four interpretable 0-1 scores
  (route / schedule / capacity / semantic) for the UI's transparency note.
- ``compose_score`` produces the final 0-100 score. The primary scorer is the
  trained model (``model.pkl``, XGBoost/RandomForest) which implicitly learned
  the composition from the synthetic ground truth. If no model is available a
  documented weighted sum of the sub-scores is used as a deterministic fallback.
"""

from __future__ import annotations

from typing import Any, Mapping

from .geo import CORRIDOR_WIDTH_KM

#: Fallback composition weights (used only when no trained model is loaded).
WEIGHTS: dict[str, float] = {
    "route_fit": 0.3,
    "schedule_fit": 0.2,
    "capacity_fit": 0.2,
    "semantic_fit": 0.3,
}

#: Below this composed score no recommendation is shown (PRD 13.3).
MATCH_THRESHOLD = 50.0


def sub_scores(features: Mapping[str, float]) -> dict[str, float]:
    """Turn the raw feature vector into four interpretable 0-1 sub-scores.

    - route: 1 when the pickup is on the corridor, decaying to 0 at the corridor edge.
    - schedule: 1 when the pickup window fully overlaps the backhaul window.
    - capacity: 1 when the order fits, decaying to 0 at twice the capacity.
    - semantic: the cargo-to-truck semantic similarity.
    """
    route_distance = max(0.0, float(features["route_distance_km"]))
    overlap = max(0.0, float(features["schedule_overlap_days"]))
    ratio = max(0.0, float(features["capacity_ratio"]))
    similarity = max(0.0, min(1.0, float(features["semantic_similarity"])))
    return {
        "route_fit": max(0.0, 1.0 - route_distance / CORRIDOR_WIDTH_KM),
        "schedule_fit": min(1.0, overlap),
        "capacity_fit": max(0.0, min(1.0, 2.0 - ratio)),
        "semantic_fit": similarity,
    }


def weighted_compose(sub: Mapping[str, float]) -> float:
    """Deterministic weighted sum of sub-scores mapped to 0-100."""
    return sum(WEIGHTS[key] * sub[key] for key in WEIGHTS) * 100.0


def compose_score(
    features: Mapping[str, float],
    sub: Mapping[str, float] | None = None,
    scoring_model: Any = None,
) -> float:
    """Final 0-100 match score.

    Uses the trained scoring model when available; otherwise falls back to the
    weighted composition of the four sub-scores.
    """
    if scoring_model is not None:
        vector = [features[name] for name in features]
        return round(scoring_model.predict(vector) * 100.0, 1)
    sub = sub if sub is not None else sub_scores(features)
    return round(weighted_compose(sub), 1)


def explain(score: float, sub: Mapping[str, float], model_name: str | None) -> str:
    """Short Indonesian explanation shown on the recommendation card."""
    source = f"model {model_name}" if model_name else "aturan pembobotan"
    return (
        f"Skor {score:.0f}% dihitung AI dari kecocokan rute "
        f"({sub['route_fit']:.0%}), jadwal ({sub['schedule_fit']:.0%}), "
        f"kapasitas ({sub['capacity_fit']:.0%}), dan jenis muatan "
        f"({sub['semantic_fit']:.0%}) menggunakan {source}."
    )
