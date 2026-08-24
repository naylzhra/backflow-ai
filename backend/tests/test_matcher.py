from app.ai_engine.matcher import match_backhaul


TRUCK = {
    "origin": {"city": "Jakarta"},
    "destination": {"city": "Surabaya"},
    "arrival_date": "2026-09-13",
    "empty_capacity_ton": 6,
    "cargo_types": ["Tekstil"],
}


def make_order(**overrides):
    order = {
        "id": "ORD-001",
        "pickup": {"city": "Surabaya"},
        "destination": {"city": "Jakarta"},
        "date": "2026-09-13",
        "weight_ton": 4.2,
        "cargo_type": "Tekstil",
    }
    order.update(overrides)
    return order


def test_returns_best_matching_order():
    result = match_backhaul(TRUCK, [
        make_order(id="ORD-WEAK", pickup={"city": "Bandung"}, cargo_type="Furnitur"),
        make_order(id="ORD-BEST"),
    ])

    assert result["status"] == "matched"
    assert result["recommendation"]["id"] == "ORD-BEST"
    assert result["match_score"] == 91.0


def test_rejects_orders_over_capacity():
    result = match_backhaul(TRUCK, [make_order(weight_ton=7.0)])
    assert result["status"] == "no_match"
    assert result["recommendation"] is None


def test_returns_no_match_for_empty_candidates():
    result = match_backhaul(TRUCK, [])
    assert result["status"] == "no_match"
    assert result["recommendation"] is None


def test_returns_low_score_when_best_candidate_is_below_threshold():
    result = match_backhaul(
        TRUCK,
        [
            make_order(
                pickup={"city": "Bandung"},
                destination={"city": "Semarang"},
                date="2026-09-20",
                cargo_type="Furnitur",
            )
        ],
    )

    assert result["status"] == "low_score"
    assert result["recommendation"] is None
    assert result["match_score"] < 50
