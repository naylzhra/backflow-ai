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

    rows = []
    for label_row in labels.itertuples(index=False):
        truck = _to_truck(trucks[trucks.truck_id == label_row.truck_id].iloc[0])
        order = _to_order(
            active_orders[active_orders.order_id == label_row.order_id].iloc[0]
        )
        features = build_feature_vector(truck, order, cities, semantic)
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
