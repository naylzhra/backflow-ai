"""Geometry helpers for route-corridor matching (canonical source).

Kept in the runtime package so the docker image (which only ships ``backend/``)
can compute route fit identically to the labeling/training pipeline. This is the
single source of truth; ``data/scripts/label_rules.py`` re-imports from here.
"""

from __future__ import annotations

from math import asin, cos, hypot, radians, sin, sqrt

#: Corridor half-width (km) around the straight origin -> destination route
#: inside which a pickup city counts as "on the route" (decision D3).
CORRIDOR_WIDTH_KM = 120.0

#: Maximum number of days after the truck's arrival date that an order's pickup
#: window may still start and be considered schedule-compatible.
MAX_WAIT_DAYS = 7

#: Approximate kilometres per degree on the equirectangular projection.
_KM_PER_DEGREE = 111.32


def haversine_km(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """Great-circle distance in kilometres between two coordinates."""
    rlat1, rlat2 = radians(lat1), radians(lat2)
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = (
        (sin(dlat / 2) ** 2)
        + cos(rlat1) * cos(rlat2) * (sin(dlon / 2) ** 2)
    )
    return 2 * 6371.0 * asin(sqrt(a))


def point_to_segment_km(
    lat: float,
    lon: float,
    a_lat: float,
    a_lon: float,
    b_lat: float,
    b_lon: float,
) -> float:
    """Distance in km from ``(lat, lon)`` to the segment ``A-B``.

    Uses an equirectangular projection around the segment's mid-latitude, which
    is accurate enough for corridor classification within Indonesia.
    """
    ref = cos(radians((a_lat + b_lat) / 2.0))
    px, py = lon * ref, lat
    ax, ay = a_lon * ref, a_lat
    bx, by = b_lon * ref, b_lat
    dx, dy = bx - ax, by - ay
    seg_len_sq = dx * dx + dy * dy
    if seg_len_sq == 0.0:
        dist = hypot(px - ax, py - ay)
    else:
        t = ((px - ax) * dx + (py - ay) * dy) / seg_len_sq
        t = max(0.0, min(1.0, t))
        dist = hypot(px - ax - t * dx, py - ay - t * dy)
    return dist * _KM_PER_DEGREE
