"""Pure ground-truth labeling rules for synthetic backhaul matching data.

Every function here is deterministic and free of third-party dependencies so the
jury can audit exactly how ``match_berhasil`` is derived from the four fit
dimensions defined in PRD 14.1: route fit, schedule fit, capacity fit, and
semantic fit.

Geometry constants and helpers are re-imported from the canonical runtime module
``backend/app/ai_engine/geo.py`` so labeling, training, and inference never
drift (decision D4). The script remains runnable standalone because the repo is
always present (path shim below).
"""

from __future__ import annotations

import sys
from datetime import date, timedelta
from pathlib import Path
from typing import Mapping

_REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_REPO_ROOT / "backend"))

from app.ai_engine.geo import (  # noqa: E402
    CORRIDOR_WIDTH_KM,
    MAX_WAIT_DAYS,
    haversine_km,
    point_to_segment_km,
)


def route_fit(
    pickup_city: str,
    origin: str,
    destination: str,
    cities: Mapping[str, Mapping[str, float]],
) -> bool:
    """Return True when ``pickup_city`` lies within the route corridor.

    A pickup is considered on-route when it is the origin or destination itself,
    or when its distance to the straight origin -> destination segment is below
    :data:`CORRIDOR_WIDTH_KM`.
    """
    pickup = pickup_city.strip().lower()
    start = origin.strip().lower()
    end = destination.strip().lower()
    if pickup == start or pickup == end:
        return True
    indexed: dict[str, dict[str, float]] = {
        name.strip().lower(): coords for name, coords in cities.items()
    }
    if pickup not in indexed or start not in indexed or end not in indexed:
        return False
    point = indexed[pickup]
    start_coord = indexed[start]
    end_coord = indexed[end]
    return (
        point_to_segment_km(
            point["lat"],
            point["lon"],
            start_coord["lat"],
            start_coord["lon"],
            end_coord["lat"],
            end_coord["lon"],
        )
        <= CORRIDOR_WIDTH_KM
    )


def schedule_fit(
    pickup_start: date,
    pickup_end: date,
    arrival_date: date,
    max_wait_days: int = MAX_WAIT_DAYS,
) -> bool:
    """Return True when the pickup window overlaps the backhaul window.

    The backhaul window is ``[arrival_date, arrival_date + max_wait_days]``.
    """
    backhaul_end = arrival_date + timedelta(days=max_wait_days)
    return pickup_start <= backhaul_end and pickup_end >= arrival_date


def capacity_fit(weight_tons: float, free_capacity_tons: float) -> bool:
    """Return True when the order weight fits the truck's free capacity."""
    return weight_tons > 0.0 and weight_tons <= free_capacity_tons


def semantic_fit(
    cargo_category: str, accepted_cargo_types: list[str] | None
) -> bool:
    """Return True when the cargo category is accepted by the truck.

    An empty or None accepted list means the truck is flexible ("Semua jenis")
    and accepts every category.
    """
    if not accepted_cargo_types:
        return True
    return cargo_category in accepted_cargo_types


def label_match(
    pickup_city: str,
    origin: str,
    destination: str,
    cities: Mapping[str, Mapping[str, float]],
    pickup_start: date,
    pickup_end: date,
    arrival_date: date,
    weight_tons: float,
    free_capacity_tons: float,
    cargo_category: str,
    accepted_cargo_types: list[str] | None,
) -> int:
    """Return ``1`` when all four fit dimensions hold, otherwise ``0``.

    This is the ground-truth rule for ``match_berhasil`` (PRD 14.2).
    """
    return int(
        route_fit(pickup_city, origin, destination, cities)
        and schedule_fit(pickup_start, pickup_end, arrival_date)
        and capacity_fit(weight_tons, free_capacity_tons)
        and semantic_fit(cargo_category, accepted_cargo_types)
    )


def explain_label(
    pickup_city: str,
    origin: str,
    destination: str,
    cities: Mapping[str, Mapping[str, float]],
    pickup_start: date,
    pickup_end: date,
    arrival_date: date,
    weight_tons: float,
    free_capacity_tons: float,
    cargo_category: str,
    accepted_cargo_types: list[str] | None,
) -> dict[str, bool]:
    """Return the four fit booleans plus the combined label for auditability."""
    fits = {
        "route_fit": route_fit(pickup_city, origin, destination, cities),
        "schedule_fit": schedule_fit(pickup_start, pickup_end, arrival_date),
        "capacity_fit": capacity_fit(weight_tons, free_capacity_tons),
        "semantic_fit": semantic_fit(cargo_category, accepted_cargo_types),
    }
    fits["match_berhasil"] = int(all(fits.values()))
    return fits
