"""Shared preprocessing utilities for Backflow AI.

This module is used BOTH at training time and at inference time so the
transforms applied to a cargo description or schedule are byte-identical in
production (a hard reproducibility requirement for the AIC COMPFEST 18
submission). It depends only on the standard library so it can run inside the
FastAPI service without dragging in training libraries.
"""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta

from .cargo_catalog import CATEGORY_ALIASES, FLEXIBLE_MARKER
from .geo import MAX_WAIT_DAYS

#: Light Indonesian stopwords relevant to logistics free text. Kept small and
#: domain-aware: cargo keywords are never removed.
STOPWORDS: frozenset[str] = frozenset(
    {
        "yang", "dan", "di", "ke", "dari", "untuk", "atau", "pada", "dengan",
        "ini", "itu", "adalah", "juga", "sudah", "telah", "akan", "siap",
        "kirim", "muatan", "ton", "kg", "berat", "barang", "unit",
    }
)

#: City alias map, compact normalized key (letters only, lower-case) -> canonical name.
CITY_ALIASES: dict[str, str] = {
    "jakarta": "Jakarta",
    "dkijakarta": "Jakarta",
    "dki": "Jakarta",
    "jkt": "Jakarta",
    "bekasi": "Bekasi",
    "kotabekasi": "Bekasi",
    "bogor": "Bogor",
    "kotabogor": "Bogor",
    "tangerang": "Tangerang",
    "kotatangerang": "Tangerang",
    "depok": "Depok",
    "kotadepok": "Depok",
    "bandung": "Bandung",
    "kotabandung": "Bandung",
    "cirebon": "Cirebon",
    "semarang": "Semarang",
    "kotasemarang": "Semarang",
    "solo": "Solo",
    "surakarta": "Solo",
    "yogyakarta": "Yogyakarta",
    "kotayogyakarta": "Yogyakarta",
    "jogja": "Yogyakarta",
    "surabaya": "Surabaya",
    "kotasurabaya": "Surabaya",
    "sby": "Surabaya",
    "malang": "Malang",
    "kotamalang": "Malang",
    "medan": "Medan",
    "kotamedan": "Medan",
    "pekanbaru": "Pekanbaru",
    "palembang": "Palembang",
    "bandarlampung": "Bandar Lampung",
    "lampung": "Bandar Lampung",
    "makassar": "Makassar",
    "kotamakassar": "Makassar",
    "jakartaselatan": "Jakarta",
    "jakartautara": "Jakarta",
    "jakartatimur": "Jakarta",
    "jakartabarat": "Jakarta",
    "jakartapusat": "Jakarta",
    "kabupatenbekasi": "Bekasi",
    "kabupatenkarawang": "Bekasi",
    "kotadenpasar": "Surabaya",
    "kotabalikpapan": "Makassar",
}

_TOKEN_RE = re.compile(r"[^a-z\s]+")


def normalize_city(name: str) -> str:
    """Normalize a city name: strip, lower-case, and apply the alias map."""
    compact = re.sub(r"[^a-z]", "", name.strip().lower())
    return CITY_ALIASES.get(compact, name.strip())


def tokenize(text: str) -> list[str]:
    """Tokenize a cargo description: lower-case, drop non-letters, remove stopwords."""
    cleaned = _TOKEN_RE.sub(" ", text.lower())
    return [tok for tok in cleaned.split() if tok and tok not in STOPWORDS]


def categorize_cargo(description: str) -> str:
    """Map a free-text cargo description to a category using the keyword catalog.

    Returns the category whose keyword appears first/longest; falls back to an
    empty string when nothing matches (handled by the semantic-fit layer).
    """
    tokens = tokenize(description)
    if not tokens:
        return ""
    best, best_len = "", 0
    for token in tokens:
        category = CATEGORY_ALIASES.get(token, "")
        if category and len(token) > best_len:
            best, best_len = category, len(token)
    return best


def parse_flexible_marker(accepted_types: list[str]) -> bool:
    """Return True when the accepted-types list means "all types (flexible)"."""
    if not accepted_types:
        return True
    return any(marker.strip() == FLEXIBLE_MARKER for marker in accepted_types)


def schedule_overlap_days(
    pickup_start: date, pickup_end: date, arrival_date: date
) -> float:
    """Number of days the pickup window overlaps the truck's arrival period.

    Returns 0 when there is no overlap. Used as a numeric schedule-fit feature.
    """
    overlap_start = max(pickup_start, arrival_date)
    overlap_end = min(pickup_end, arrival_date + timedelta(days=MAX_WAIT_DAYS))
    days = (overlap_end - overlap_start).days
    return max(0.0, float(days))


def capacity_ratio(weight_tons: float, free_capacity_tons: float) -> float:
    """Ratio of order weight to free capacity (>= 1 means the order does not fit)."""
    if free_capacity_tons <= 0.0:
        return 1.0
    return weight_tons / free_capacity_tons


def parse_iso_date(value: str) -> date:
    """Parse an ISO ``YYYY-MM-DD`` string into a ``date`` (naive)."""
    return datetime.fromisoformat(value).date()
