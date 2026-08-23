"""Train and export the scoring model (RandomForest / XGBoost) on synthetic data.

Trains both candidate models with 5-fold stratified cross-validation on
``features.csv``, picks the better one by macro-F1, reports accuracy/F1/
precision/recall, verifies determinism (same input -> same score), then refits
on the full dataset and exports:

- ``model.pkl`` — the chosen estimator
- ``manifest.json`` — features order, model type, hyperparameters, metrics, seed

Artifacts are written to ``backend/app/models/artifacts/`` and loaded at runtime
by ``backend/app/models/scoring_loader.py`` **without re-training** (PRD 14.3;
parameters stay frozen during the demo).

Run after ``build_features.py``.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import StratifiedKFold
from sklearn.utils.class_weight import compute_class_weight
from xgboost import XGBClassifier

DATA_DIR = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from build_features import FEATURES  # noqa: E402

ARTIFACTS_DIR = DATA_DIR.parent / "backend" / "app" / "models" / "artifacts"
DEFAULT_SEED = 42


def _evaluate(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    """Return accuracy, macro-F1, precision, and recall."""
    return {
        "accuracy": accuracy_score(y_true, y_pred),
        "f1": f1_score(y_true, y_pred, zero_division=0),
        "precision": precision_score(y_true, y_pred, zero_division=0),
        "recall": recall_score(y_true, y_pred, zero_division=0),
    }


def _build_models(seed: int) -> dict[str, object]:
    """Instantiate the two candidate models with frozen hyperparameters."""
    return {
        "random_forest": RandomForestClassifier(
            n_estimators=300,
            max_depth=8,
            min_samples_leaf=4,
            class_weight="balanced",
            random_state=seed,
            n_jobs=-1,
        ),
        "xgboost": XGBClassifier(
            n_estimators=300,
            max_depth=4,
            learning_rate=0.05,
            scale_pos_weight=10.0,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=seed,
            n_jobs=-1,
            eval_metric="logloss",
        ),
    }


def _cross_validate(
    X: np.ndarray, y: np.ndarray, models: dict[str, object], seed: int
) -> dict[str, dict[str, float]]:
    """Run 5-fold stratified CV and return mean metrics per model."""
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=seed)
    results: dict[str, list[dict[str, float]]] = {name: [] for name in models}
    for train_idx, val_idx in cv.split(X, y):
        X_tr, X_va = X[train_idx], X[val_idx]
        y_tr, y_va = y[train_idx], y[val_idx]
        for name, model in models.items():
            fold_model = model.__class__(**model.get_params())
            fold_model.fit(X_tr, y_tr)
            results[name].append(_evaluate(y_va, fold_model.predict(X_va)))
    return {
        name: {metric: float(np.mean([fold[metric] for fold in folds]))
               for metric in folds[0]}
        for name, folds in results.items()
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--features", type=Path, default=DATA_DIR / "features.csv")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    args = parser.parse_args()

    df = pd.read_csv(args.features)
    X = df[FEATURES].to_numpy(dtype=float)
    y = df["match_berhasil"].to_numpy(dtype=int)
    print(f"rows: {len(df)}, positives: {int(y.sum())} ({y.mean():.1%})")

    models = _build_models(args.seed)
    cv_results = _cross_validate(X, y, models, args.seed)
    for name, metrics in cv_results.items():
        print(f"\n[{name}] CV (5-fold)")
        for metric, value in metrics.items():
            print(f"  {metric:10s}: {value:.4f}")

    best_name = max(cv_results, key=lambda name: cv_results[name]["f1"])
    best_model = models[best_name]
    print(f"\nbest model by F1: {best_name}")

    best_model.fit(X, y)
    preds = best_model.predict(X)
    train_metrics = _evaluate(y, preds)

    # Determinism: same input twice -> identical scores.
    again = best_model.predict(X)
    consistent = bool(np.array_equal(preds, again))

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    model_path = ARTIFACTS_DIR / "model.pkl"
    import pickle

    with model_path.open("wb") as fh:
        pickle.dump(best_model, fh)

    manifest = {
        "model": best_name,
        "features": FEATURES,
        "target": "match_berhasil",
        "cv_metrics": cv_results[best_name],
        "train_metrics": train_metrics,
        "consistent": consistent,
        "seed": args.seed,
        "n_rows": int(len(df)),
        "positive_rate": float(y.mean()),
        "hyperparameters": best_model.get_params(),
    }
    (ARTIFACTS_DIR / "manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )

    print(f"\ntrain metrics: {json.dumps(train_metrics)}")
    print(f"deterministic (same input -> same score): {consistent}")
    print(f"exported: {model_path}, manifest.json")


if __name__ == "__main__":
    main()
