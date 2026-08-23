"""Seeded synthetic dataset generator for Backflow AI.

Produces the single-company (internal) synthetic datasets required by PRD 14.2:

- ``cities.json`` — fixed Indonesian cities with coordinates.
- ``trucks.csv`` — trucks with route, arrival date, free capacity, accepted types.
- ``orders.csv`` — internal orders with pickup/dropoff, window, weight, cargo text.
- ``labels.csv`` — one row per truck x active-order pair with the four fit
  dimensions and the ``match_berhasil`` ground-truth label.

Ground truth is derived by construction (see :func:`_make_constructed_order`)
plus full evaluation via :func:`label_rules.label_match`. Everything is seeded
through a single :class:`random.Random` instance, so re-running with the same
seed reproduces byte-identical files (reproducibility requirement).

Usage::

    python data/scripts/generate_dataset.py [--seed 42] [--n-trucks 40] [--n-orders 200]
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import pandas as pd

DATA_DIR = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from cargo_catalog import CATEGORIES, DESCRIPTION_ITEMS  # noqa: E402
from label_rules import MAX_WAIT_DAYS, explain_label, route_fit  # noqa: E402
from preprocess import normalize_city  # noqa: E402

DEFAULT_SEED = 42
BASE_DATE = date(2026, 9, 1)

CITIES: dict[str, dict[str, float]] = {
    "Jakarta": {"lat": -6.2088, "lon": 106.8456},
    "Bekasi": {"lat": -6.2383, "lon": 106.9756},
    "Bogor": {"lat": -6.5971, "lon": 106.8060},
    "Tangerang": {"lat": -6.1783, "lon": 106.6319},
    "Depok": {"lat": -6.4025, "lon": 106.7942},
    "Bandung": {"lat": -6.9175, "lon": 107.6191},
    "Cirebon": {"lat": -6.7320, "lon": 108.5523},
    "Semarang": {"lat": -6.9667, "lon": 110.4167},
    "Solo": {"lat": -7.5667, "lon": 110.8167},
    "Yogyakarta": {"lat": -7.7956, "lon": 110.3695},
    "Surabaya": {"lat": -7.2575, "lon": 112.7521},
    "Malang": {"lat": -7.9797, "lon": 112.6304},
    "Medan": {"lat": 3.5952, "lon": 98.6722},
    "Pekanbaru": {"lat": 0.5071, "lon": 101.4478},
    "Palembang": {"lat": -2.9761, "lon": 104.7754},
    "Bandar Lampung": {"lat": -5.3971, "lon": 105.2668},
    "Makassar": {"lat": -5.1477, "lon": 119.4327},
}

#: Sampling weights per city for random orders/trucks (economic-size proxy).
CITY_WEIGHTS: dict[str, float] = {
    "Jakarta": 5.0, "Surabaya": 4.0, "Bandung": 4.0, "Semarang": 4.0,
    "Bekasi": 3.0, "Tangerang": 3.0, "Yogyakarta": 3.0, "Medan": 3.0,
    "Cirebon": 2.0, "Bogor": 2.0, "Depok": 2.0, "Solo": 2.0,
    "Malang": 2.0, "Pekanbaru": 2.0, "Palembang": 2.0, "Bandar Lampung": 2.0,
    "Makassar": 2.0,
}

#: Plausible high-traffic corridors used to seed truck routes.
ROUTES: list[tuple[str, str]] = [
    ("Jakarta", "Surabaya"), ("Surabaya", "Jakarta"),
    ("Jakarta", "Semarang"), ("Semarang", "Jakarta"),
    ("Jakarta", "Bandung"), ("Bandung", "Jakarta"),
    ("Jakarta", "Yogyakarta"), ("Yogyakarta", "Jakarta"),
    ("Surabaya", "Semarang"), ("Semarang", "Surabaya"),
    ("Surabaya", "Malang"), ("Malang", "Surabaya"),
    ("Semarang", "Solo"), ("Solo", "Semarang"),
    ("Jakarta", "Cirebon"), ("Cirebon", "Jakarta"),
    ("Medan", "Pekanbaru"), ("Pekanbaru", "Medan"),
    ("Jakarta", "Palembang"), ("Palembang", "Jakarta"),
    ("Bandar Lampung", "Jakarta"), ("Jakarta", "Bandar Lampung"),
]

#: Fraction of orders explicitly constructed to be a valid match for a truck.
CONSTRUCTED_ORDER_RATIO = 0.35
#: Fraction of trucks that accept "all types (flexible)".
FLEXIBLE_TRUCK_RATIO = 0.2


def _pick_city(rng: random.Random, exclude: str | None = None) -> str:
    """Return a random city, optionally excluding one."""
    population = [c for c in CITIES if c != exclude]
    weights = [CITY_WEIGHTS[c] for c in population]
    return rng.choices(population, weights=weights, k=1)[0]


def _on_route_cities(origin: str, destination: str) -> list[str]:
    """Return cities lying within the corridor of ``origin -> destination``."""
    return [c for c in CITIES if route_fit(c, origin, destination, CITIES)]


def _describe(rng: random.Random, category: str) -> str:
    """Compose a realistic Indonesian free-text cargo description."""
    item = rng.choice(DESCRIPTION_ITEMS[category])
    qty = rng.randint(1, 60)
    return f"{qty} {item} untuk pengiriman {category}"


def _make_truck(rng: random.Random, truck_id: int) -> dict[str, Any]:
    """Generate one seeded truck row."""
    origin, destination = rng.choice(ROUTES)
    categories = list(CATEGORIES)
    if rng.random() < FLEXIBLE_TRUCK_RATIO:
        accepted: list[str] = []
    else:
        accepted = rng.sample(categories, k=rng.randint(1, 3))
    return {
        "truck_id": f"TRK-{truck_id:03d}",
        "origin": origin,
        "destination": destination,
        "arrival_date": (BASE_DATE + timedelta(days=rng.randint(0, 13))).isoformat(),
        "free_capacity_tons": round(rng.uniform(2.0, 18.0), 1),
        "accepted_cargo_types": json.dumps(accepted, ensure_ascii=False),
    }


def _make_constructed_order(
    rng: random.Random, order_id: int, truck: dict[str, Any]
) -> dict[str, Any]:
    """Build an order guaranteed to be a valid match for ``truck``.

    The pickup city is on the truck's route corridor, the window overlaps the
    truck's arrival, the weight fits the free capacity, and the cargo category
    is accepted. This guarantees at least one positive pair per constructed
    order and makes the ground truth auditable ("positive by construction").
    """
    arrival = date.fromisoformat(truck["arrival_date"])
    accepted = json.loads(truck["accepted_cargo_types"])
    category = (
        rng.choice(list(CATEGORIES)) if not accepted else rng.choice(accepted)
    )
    on_route = _on_route_cities(truck["origin"], truck["destination"])
    pickup_city = rng.choice(on_route)
    pickup_start = arrival + timedelta(days=rng.randint(0, MAX_WAIT_DAYS - 1))
    pickup_end = pickup_start + timedelta(days=rng.randint(1, 3))
    capacity = float(truck["free_capacity_tons"])
    weight = round(rng.uniform(0.5, capacity * 0.85), 1)
    return {
        "order_id": f"ORD-{order_id:04d}",
        "pickup_city": pickup_city,
        "dropoff_city": _pick_city(rng, exclude=pickup_city),
        "pickup_start": pickup_start.isoformat(),
        "pickup_end": pickup_end.isoformat(),
        "weight_tons": weight,
        "cargo_description": _describe(rng, category),
        "cargo_category": category,
        "status": "active",
    }


def _make_random_order(rng: random.Random, order_id: int) -> dict[str, Any]:
    """Build a fully random order (may or may not match any truck)."""
    pickup_city = _pick_city(rng)
    pickup_start = BASE_DATE + timedelta(days=rng.randint(0, 20))
    pickup_end = pickup_start + timedelta(days=rng.randint(1, 4))
    category = rng.choice(list(CATEGORIES))
    status = "active" if rng.random() < 0.9 else "closed"
    return {
        "order_id": f"ORD-{order_id:04d}",
        "pickup_city": pickup_city,
        "dropoff_city": _pick_city(rng, exclude=pickup_city),
        "pickup_start": pickup_start.isoformat(),
        "pickup_end": pickup_end.isoformat(),
        "weight_tons": round(rng.uniform(0.5, 12.0), 1),
        "cargo_description": _describe(rng, category),
        "cargo_category": category,
        "status": status,
    }


def generate(
    seed: int = DEFAULT_SEED,
    n_trucks: int = 40,
    n_orders: int = 200,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Generate trucks, orders, and ground-truth labels (all seeded)."""
    rng = random.Random(seed)
    trucks = [_make_truck(rng, i) for i in range(1, n_trucks + 1)]
    orders = []
    for i in range(1, n_orders + 1):
        if rng.random() < CONSTRUCTED_ORDER_RATIO:
            orders.append(_make_constructed_order(rng, i, rng.choice(trucks)))
        else:
            orders.append(_make_random_order(rng, i))

    trucks_df = pd.DataFrame(trucks)
    orders_df = pd.DataFrame(orders)

    active = orders_df[orders_df["status"] == "active"]
    active_map = {
        row.order_id: row for row in active.itertuples(index=False)
    }
    truck_map = {
        row.truck_id: row for row in trucks_df.itertuples(index=False)
    }

    label_rows = []
    for truck_id, order_id in _all_pairs(trucks_df["truck_id"], active["order_id"]):
        truck = truck_map[truck_id]
        order = active_map[order_id]
        fits = explain_label(
            order.pickup_city,
            truck.origin,
            truck.destination,
            CITIES,
            date.fromisoformat(order.pickup_start),
            date.fromisoformat(order.pickup_end),
            date.fromisoformat(truck.arrival_date),
            float(order.weight_tons),
            float(truck.free_capacity_tons),
            order.cargo_category,
            json.loads(truck.accepted_cargo_types),
        )
        label_rows.append(
            {
                "truck_id": truck_id,
                "order_id": order_id,
                **fits,
            }
        )
    labels_df = pd.DataFrame(label_rows)
    return trucks_df, orders_df, labels_df


def _all_pairs(truck_ids: list[Any], order_ids: list[Any]) -> list[tuple[Any, Any]]:
    """Return the full truck x active-order cross product."""
    return [(t, o) for t in truck_ids for o in order_ids]


def _summary(
    trucks_df: pd.DataFrame,
    orders_df: pd.DataFrame,
    labels_df: pd.DataFrame,
) -> None:
    """Print dataset statistics for quick auditability."""
    total = len(labels_df)
    positives = int(labels_df["match_berhasil"].sum())
    print(f"trucks:            {len(trucks_df)}")
    print(f"orders (all):      {len(orders_df)}")
    print(f"orders (active):   {int((orders_df['status'] == 'active').sum())}")
    print(f"pairs (active):    {total}")
    print(f"positive labels:   {positives} ({positives / total:.1%})")
    for col in ("route_fit", "schedule_fit", "capacity_fit", "semantic_fit"):
        share = float(labels_df[col].mean())
        print(f"  {col:14s}: {share:.1%}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--n-trucks", type=int, default=40)
    parser.add_argument("--n-orders", type=int, default=200)
    parser.add_argument("--outdir", type=Path, default=DATA_DIR)
    args = parser.parse_args()

    trucks_df, orders_df, labels_df = generate(
        seed=args.seed, n_trucks=args.n_trucks, n_orders=args.n_orders
    )

    cities_out = {
        name: coords
        for name, coords in sorted(CITIES.items())
    }
    args.outdir.mkdir(parents=True, exist_ok=True)
    (args.outdir / "cities.json").write_text(
        json.dumps(cities_out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    trucks_df.to_csv(args.outdir / "trucks.csv", index=False)
    orders_df.to_csv(args.outdir / "orders.csv", index=False)
    labels_df.to_csv(args.outdir / "labels.csv", index=False)

    _summary(trucks_df, orders_df, labels_df)
    print(f"\nwritten to {args.outdir}")


if __name__ == "__main__":
    main()
