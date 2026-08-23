"""Cost-savings estimate for a matched order (vs running the backhaul empty).

Transparent, monotonic formula so the figure is always proportional to the
input (success metric in the PRD):

- ``revenue`` = freight revenue the order generates = rate_per_ton_km * weight * haul_km
- ``marginal_cost`` = extra fuel/maintenance to deviate from the direct empty return
- ``savings`` = max(0, revenue - marginal_cost)
- ``extra_distance_km`` = the detour beyond the direct origin->destination return leg

Constants are documented defaults and can be overridden per deployment.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from .features import Order, Truck
from .geo import haversine_km

#: Operating cost per km (fuel + maintenance, Rp) for a typical delivery truck.
COST_PER_KM = 5_500.0
#: Freight rate per ton-km (Rp), used to estimate order revenue.
FREIGHT_RATE_PER_TON_KM = 1_250.0


@dataclass(frozen=True)
class CostEstimate:
    """Savings breakdown shown on the recommendation card."""

    savings_idr: int
    revenue_idr: int
    marginal_cost_idr: int
    extra_distance_km: float
    haul_distance_km: float


def _coords(cities: Mapping[str, Mapping[str, float]], name: str) -> tuple[float, float]:
    indexed = {key.strip().lower(): value for key, value in cities.items()}
    point = indexed[name.strip().lower()]
    return float(point["lat"]), float(point["lon"])


def estimate_savings(
    truck: Truck,
    order: Order,
    cities: Mapping[str, Mapping[str, float]],
    cost_per_km: float = COST_PER_KM,
    rate_per_ton_km: float = FREIGHT_RATE_PER_TON_KM,
) -> CostEstimate:
    """Compute the cost-savings estimate for carrying ``order`` on the backhaul."""
    origin_lat, origin_lon = _coords(cities, truck.origin)
    dest_lat, dest_lon = _coords(cities, truck.destination)
    pickup_lat, pickup_lon = _coords(cities, order.pickup_city)
    drop_lat, drop_lon = _coords(cities, order.dropoff_city)

    route_km = haversine_km(origin_lat, origin_lon, dest_lat, dest_lon)
    haul_km = haversine_km(pickup_lat, pickup_lon, drop_lat, drop_lon)
    detour_km = max(
        0.0,
        haversine_km(dest_lat, dest_lon, pickup_lat, pickup_lon)
        + haul_km
        + haversine_km(drop_lat, drop_lon, origin_lat, origin_lon)
        - route_km,
    )

    revenue = rate_per_ton_km * order.weight_tons * haul_km
    marginal_cost = cost_per_km * detour_km
    savings = max(0.0, revenue - marginal_cost)

    return CostEstimate(
        savings_idr=round(savings),
        revenue_idr=round(revenue),
        marginal_cost_idr=round(marginal_cost),
        extra_distance_km=round(detour_km, 1),
        haul_distance_km=round(haul_km, 1),
    )
