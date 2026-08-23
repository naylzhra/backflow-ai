"""Re-export of the canonical preprocessing module in ``backend/app/ai_engine/``.

Preprocessing is shared byte-for-byte between training and inference (decision
D4). The canonical implementation lives in the runtime package; this shim keeps
the training/data scripts pointing at it so transform never drift.
"""

from __future__ import annotations

import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_REPO_ROOT / "backend"))

from app.ai_engine.preprocess import (  # noqa: E402, F401
    CATEGORY_ALIASES,
    CITY_ALIASES,
    STOPWORDS,
    capacity_ratio,
    categorize_cargo,
    normalize_city,
    parse_flexible_marker,
    parse_iso_date,
    schedule_overlap_days,
    tokenize,
)
