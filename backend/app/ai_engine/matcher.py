from __future__ import annotations

from datetime import date, datetime
from typing import Any


ROUTE_WEIGHT = 0.40
CAPACITY_WEIGHT = 0.30
SCHEDULE_WEIGHT = 0.20
CARGO_WEIGHT = 0.10
MATCH_THRESHOLD = 50.0


def _normalize(value: Any) -> str:
    return str(value or "").strip().lower()


def _get_city(location: Any) -> str:
    if isinstance(location, dict):
        return _normalize(location.get("city"))
    return _normalize(location)


def _parse_date(value: Any) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return datetime.fromisoformat(str(value)).date()


def _route_score(truck_data: dict, order: dict) -> float:
    truck_origin = _get_city(truck_data.get("origin"))
    truck_destination = _get_city(truck_data.get("destination"))
    order_pickup = _get_city(order.get("pickup"))
    order_destination = _get_city(order.get("destination"))

    score = 0.0
    if order_pickup == truck_destination:
        score += 50.0
    if order_destination == truck_origin:
        score += 50.0
    return score


def _capacity_score(truck_data: dict, order: dict) -> float:
    capacity = float(truck_data.get("empty_capacity_ton", 0))
    weight = float(order.get("weight_ton", 0))
    if capacity <= 0 or weight <= 0 or weight > capacity:
        return 0.0
    return min((weight / capacity) * 100.0, 100.0)


def _schedule_score(truck_data: dict, order: dict) -> float:
    try:
        truck_date = _parse_date(truck_data.get("arrival_date"))
        order_date = _parse_date(order.get("date"))
    except (TypeError, ValueError):
        return 0.0

    difference = abs((order_date - truck_date).days)
    if difference == 0:
        return 100.0
    if difference == 1:
        return 50.0
    return 0.0


def _cargo_score(truck_data: dict, order: dict) -> float:
    truck_cargo_types = truck_data.get("cargo_types", [])
    order_cargo = _normalize(order.get("cargo_type"))
    normalized_types = {_normalize(x) for x in truck_cargo_types}
    return 100.0 if order_cargo and order_cargo in normalized_types else 0.0


def _calculate_score(route: float, capacity: float, schedule: float, cargo: float) -> float:
    return (
        route * ROUTE_WEIGHT
        + capacity * CAPACITY_WEIGHT
        + schedule * SCHEDULE_WEIGHT
        + cargo * CARGO_WEIGHT
    )


def match_backhaul(truck_data: dict, candidate_orders: list[dict]) -> dict:
    if not candidate_orders:
        return {"status": "no_match", "match_score": 0.0, "recommendation": None}

    scored_orders = []
    for order in candidate_orders:
        capacity = _capacity_score(truck_data, order)
        if capacity == 0.0:
            continue

        route = _route_score(truck_data, order)
        schedule = _schedule_score(truck_data, order)
        cargo = _cargo_score(truck_data, order)
        score = _calculate_score(route, capacity, schedule, cargo)

        scored_orders.append(
            {
                "order": order,
                "match_score": round(score, 2),
                "score_breakdown": {
                    "route": round(route, 2),
                    "capacity": round(capacity, 2),
                    "schedule": round(schedule, 2),
                    "cargo": round(cargo, 2),
                },
            }
        )

    if not scored_orders:
        return {"status": "no_match", "match_score": 0.0, "recommendation": None}

    best = max(scored_orders, key=lambda item: item["match_score"])
    if best["match_score"] < MATCH_THRESHOLD:
        return {
            "status": "low_score",
            "match_score": best["match_score"],
            "recommendation": None,
        }

    return {
        "status": "matched",
        "match_score": best["match_score"],
        "recommendation": best["order"],
        "score_breakdown": best["score_breakdown"],
    }
