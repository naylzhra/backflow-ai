"""Re-export of the canonical cargo catalog in ``backend/app/ai_engine/``.

The canonical module lives in the runtime package so the docker image (which
only ships ``backend/``) has a single source of truth. This shim keeps the
training/data scripts runnable with the exact same data (decision D4).
"""

from __future__ import annotations

import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_REPO_ROOT / "backend"))

from app.ai_engine.cargo_catalog import (  # noqa: E402, F401
    CATEGORIES,
    CATEGORY_ALIASES,
    DESCRIPTION_ITEMS,
    FLEXIBLE_MARKER,
)
