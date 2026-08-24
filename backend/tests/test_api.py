from datetime import date, timedelta

from fastapi.testclient import TestClient

from app.api.router import ACCEPTED_MATCHES
from app.main import app


client = TestClient(app)


SEARCH_PAYLOAD = {
    "origin": {"city": "Jakarta", "district": "Tebet", "village": ""},
    "destination": {"city": "Surabaya", "district": "Rungkut", "village": ""},
    "arrival_date": "2026-09-13",
    "empty_capacity_ton": 6,
    "cargo_types": ["Tekstil"],
}


def setup_function():
    ACCEPTED_MATCHES.clear()


def test_search_returns_best_match():
    payload = {**SEARCH_PAYLOAD}
    response = client.post("/api/v1/matches/search", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "matched"
    assert body["total_candidates"] == 2
    assert body["recommendation"]["order"]["id"] == "ORD-001"
    assert body["recommendation"]["route"]["additional_distance_km"] == 47
    assert body["recommendation"]["estimated_savings"] == 7_330_000


def test_search_rejects_past_date():
    payload = {**SEARCH_PAYLOAD, "arrival_date": (date.today() - timedelta(days=1)).isoformat()}
    response = client.post("/api/v1/matches/search", json=payload)
    assert response.status_code == 422


def test_search_rejects_same_origin_and_destination():
    payload = {
        **SEARCH_PAYLOAD,
        "destination": {"city": "Jakarta", "district": "Tebet", "village": ""},
    }
    response = client.post("/api/v1/matches/search", json=payload)
    assert response.status_code == 422


def test_accept_match_and_prevent_duplicate_acceptance():
    first = client.post("/api/v1/matches/ORD-001/accept")
    second = client.post("/api/v1/matches/ORD-001/accept")

    assert first.status_code == 200
    assert first.json() == {"status": "accepted", "match_id": "ORD-001"}
    assert second.status_code == 200
    assert second.json() == {"status": "already_accepted", "match_id": "ORD-001"}


def test_accept_missing_match_returns_404():
    response = client.post("/api/v1/matches/DOES-NOT-EXIST/accept")
    assert response.status_code == 404


def test_metrics_and_reports_reflect_accepted_match():
    client.post("/api/v1/matches/ORD-001/accept")

    metrics = client.get("/api/v1/dashboard/metrics")
    reports = client.get("/api/v1/reports")

    assert metrics.status_code == 200
    assert metrics.json()["accepted_matches"] == 1
    assert metrics.json()["total_estimated_savings"] == 7_330_000

    assert reports.status_code == 200
    assert reports.json()["total"] == 1
    assert reports.json()["reports"][0]["match_id"] == "ORD-001"
