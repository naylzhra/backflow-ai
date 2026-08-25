"""Build the scoring-model feature matrix from the synthetic data.

One row per truck x active-order pair (aligned with ``labels.csv``). Produces
``features.csv`` with four numeric features plus the ``match_berhasil`` target.
Feature computation is delegated to ``app.ai_engine.features`` — the same
canonical builder used at inference time — so training and runtime never drift
(decision D4).

The semantic feature uses the fine-tuned ``embedding.onnx`` when present, with a
seeded TF-IDF fallback otherwise (decision D9); the active backend is printed
as ``semantic mode:``.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))
sys.path.insert(0, str(DATA_DIR.parent / "backend"))

from app.ai_engine.features import (  # noqa: E402
    FEATURES,
    Order,
    Truck,
    build_feature_vector,
)
from app.ai_engine.semantic import SemanticScorer  # noqa: E402

ARTIFACTS_DIR = DATA_DIR.parent / "backend" / "app" / "models" / "artifacts"


def _to_truck(row: pd.Series) -> Truck:
    return Truck(
        truck_id=str(row.truck_id),
        origin=str(row.origin),
        destination=str(row.destination),
        arrival_date=date.fromisoformat(str(row.arrival_date)),
        free_capacity_tons=float(row.free_capacity_tons),
        accepted_cargo_types=json.loads(str(row.accepted_cargo_types)),
    )


def _to_order(row: pd.Series) -> Order:
    return Order(
        order_id=str(row.order_id),
        pickup_city=str(row.pickup_city),
        dropoff_city=str(row.dropoff_city),
        pickup_start=date.fromisoformat(str(row.pickup_start)),
        pickup_end=date.fromisoformat(str(row.pickup_end)),
        weight_tons=float(row.weight_tons),
        cargo_description=str(row.cargo_description),
    )


def _build_semantic(trucks: pd.DataFrame, orders: pd.DataFrame) -> SemanticScorer:
    """ONNX scorer when the artifact exists; TF-IDF fallback otherwise."""
    onnx_path = ARTIFACTS_DIR / "embedding.onnx"
    if onnx_path.exists():
        from app.models.embedding_loader import EmbeddingModel

        return SemanticScorer(
            embedding_model=EmbeddingModel(
                onnx_path=onnx_path,
                tokenizer_path=ARTIFACTS_DIR / "tokenizer.json",
                config_path=ARTIFACTS_DIR / "embedding_config.json",
            )
        )
    return SemanticScorer(corpus_texts=orders["cargo_description"].tolist())


def _precompute_semantic(
    trucks: pd.DataFrame,
    active_orders: pd.DataFrame,
    semantic: SemanticScorer,
) -> dict[str, dict[str, float]]:
    """Embed every description and category phrase once, then precompute
    per-truck max-cosine scores so the ONNX/TF-IDF encoder runs on a handful of
    batches instead of once per truck x order pair."""
    from app.ai_engine.semantic import category_phrase

    descriptions = active_orders["cargo_description"].tolist()
    all_categories: set[str] = set()
    for accepted in trucks["accepted_cargo_types"]:
        for category in json.loads(str(accepted)):
            all_categories.add(category)
    sorted_categories = sorted(all_categories)

    desc_vectors = dict(zip(descriptions, semantic.encode(descriptions)))
    cat_vectors = dict(
        zip(
            sorted_categories,
            semantic.encode([category_phrase(c) for c in sorted_categories]),
        )
    )

    precomputed: dict[str, dict[str, float]] = {}
    for truck_row in trucks.itertuples(index=False):
        accepted = json.loads(str(truck_row.accepted_cargo_types))
        truck_id = str(truck_row.truck_id)
        if not accepted:
            precomputed[truck_id] = {d: 1.0 for d in descriptions}
            continue
        cat_vecs = [cat_vectors[cat] for cat in accepted]
        precomputed[truck_id] = {
            d: float(max(np.dot(desc_vectors[d], v) for v in cat_vecs))
            for d in descriptions
        }
    return precomputed


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=DATA_DIR / "features.csv")
    args = parser.parse_args()

    cities = json.loads((DATA_DIR / "cities.json").read_text(encoding="utf-8"))
    trucks = pd.read_csv(DATA_DIR / "trucks.csv")
    orders = pd.read_csv(DATA_DIR / "orders.csv")
    labels = pd.read_csv(DATA_DIR / "labels.csv")

    semantic = _build_semantic(trucks, orders)
    active_orders = orders[orders["status"] == "active"]
    precomputed = _precompute_semantic(trucks, active_orders, semantic)

    order_rows = {
        str(r.order_id): r for r in active_orders.itertuples(index=False)
    }
    truck_rows = {str(r.truck_id): r for r in trucks.itertuples(index=False)}

    rows = []
    for label_row in labels.itertuples(index=False):
        truck = _to_truck(truck_rows[str(label_row.truck_id)])
        order = _to_order(order_rows[str(label_row.order_id)])
        features = build_feature_vector(
            truck,
            order,
            cities,
            semantic_score=precomputed[str(label_row.truck_id)][order.cargo_description],
        )
        rows.append({**features, "match_berhasil": int(label_row.match_berhasil)})

    features_df = pd.DataFrame(rows)
    features_df.to_csv(args.out, index=False)
    print(f"semantic mode: {semantic.mode}")
    print(f"features written: {args.out} ({len(features_df)} rows)")
    print(
        f"class balance: {features_df['match_berhasil'].value_counts().to_dict()}"
    )


if __name__ == "__main__":
    main()
