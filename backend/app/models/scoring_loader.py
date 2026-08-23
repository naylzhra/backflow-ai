"""Runtime loader for the scoring model (RandomForest/XGBoost).

Loads ``model.pkl`` + ``manifest.json`` exported by
``data/scripts/train_scoring.py`` and predicts the match probability for a
feature vector. Parameters are frozen at export time (no auto-tuning, PRD 14.4).

Feature order must follow the manifest, in the same order produced by
``data/scripts/build_features.py``.
"""

from __future__ import annotations

import json
import pickle
from pathlib import Path
from typing import Any

import numpy as np

ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"


class ScoringModel:
    """Pickled sklearn model plus its feature manifest."""

    def __init__(
        self,
        model_path: Path = ARTIFACTS_DIR / "model.pkl",
        manifest_path: Path = ARTIFACTS_DIR / "manifest.json",
    ) -> None:
        if not model_path.exists():
            raise FileNotFoundError(
                f"scoring artifact not found: {model_path}. "
                "Run data/scripts/build_features.py then train_scoring.py first."
            )
        with model_path.open("rb") as fh:
            self.model = pickle.load(fh)
        self.manifest: dict[str, Any] = {}
        if manifest_path.exists():
            self.manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        self.features = self.manifest.get("features")

    def predict(self, features: np.ndarray | list[float]) -> float:
        """Return the match probability in ``[0, 1]`` for one feature vector."""
        x = np.asarray(features, dtype=float).reshape(1, -1)
        if self.features is not None and x.shape[1] != len(self.features):
            raise ValueError(
                f"expected {len(self.features)} features, got {x.shape[1]}"
            )
        return float(self.model.predict_proba(x)[0, 1])
