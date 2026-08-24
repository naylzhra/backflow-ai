from fastapi import APIRouter, HTTPException

from app.ai_engine.matcher import match_backhaul
from app.schemas.match import (
    MatchRecommendation,
    MatchSearchRequest,
    MatchSearchResponse,
    OrderSummary,
    RouteSummary,
    ScoreBreakdown,
)
from app.services.cost_calculator import (
    calculate_additional_distance,
    calculate_estimated_savings,
)

api_router = APIRouter()
ACCEPTED_MATCHES: set[str] = set()

MOCK_ORDERS = [
    {
        "id": "ORD-001",
        "pickup": {"city": "Surabaya", "district": "Rungkut"},
        "destination": {"city": "Jakarta", "district": "Tebet"},
        "date": "2026-09-13",
        "pickup_time": "2026-09-13T08:00:00",
        "weight_ton": 4.2,
        "cargo_type": "Tekstil",
        "base_distance_km": 780,
        "route_distance_km": 827,
    },
    {
        "id": "ORD-002",
        "pickup": {"city": "Bandung", "district": "Coblong"},
        "destination": {"city": "Jakarta", "district": "Tebet"},
        "date": "2026-09-13",
        "pickup_time": "2026-09-13T09:00:00",
        "weight_ton": 3.5,
        "cargo_type": "Furnitur",
        "base_distance_km": 780,
        "route_distance_km": 920,
    },
]


@api_router.post("/matches/search", response_model=MatchSearchResponse)
def search_matches(request: MatchSearchRequest) -> MatchSearchResponse:
    truck_data = {
        "origin": request.origin.model_dump(),
        "destination": request.destination.model_dump(),
        "arrival_date": request.arrival_date,
        "empty_capacity_ton": request.empty_capacity_ton,
        "cargo_types": request.cargo_types,
    }
    match_result = match_backhaul(truck_data, MOCK_ORDERS)

    if match_result["recommendation"] is None:
        return MatchSearchResponse(
            status=match_result["status"],
            total_candidates=len(MOCK_ORDERS),
            recommendation=None,
        )

    order = match_result["recommendation"]
    additional_distance = calculate_additional_distance(
        order["base_distance_km"], order["route_distance_km"]
    )
    savings = calculate_estimated_savings(order["base_distance_km"], additional_distance)

    recommendation = MatchRecommendation(
        match_score=match_result["match_score"],
        order=OrderSummary(
            id=order["id"],
            cargo_type=order["cargo_type"],
            weight_ton=order["weight_ton"],
            pickup_time=order["pickup_time"],
        ),
        route=RouteSummary(
            pickup=order["pickup"]["city"],
            destination=order["destination"]["city"],
            additional_distance_km=additional_distance,
        ),
        estimated_savings=savings,
        score_breakdown=ScoreBreakdown(**match_result["score_breakdown"]),
    )
    return MatchSearchResponse(
        status=match_result["status"],
        total_candidates=len(MOCK_ORDERS),
        recommendation=recommendation,
    )


@api_router.post("/matches/{match_id}/accept")
def accept_match(match_id: str) -> dict:
    if not any(order["id"] == match_id for order in MOCK_ORDERS):
        raise HTTPException(status_code=404, detail="Match not found")
    if match_id in ACCEPTED_MATCHES:
        return {"status": "already_accepted", "match_id": match_id}
    ACCEPTED_MATCHES.add(match_id)
    return {"status": "accepted", "match_id": match_id}


@api_router.get("/dashboard/metrics")
def get_dashboard_metrics() -> dict:
    total_orders = len(MOCK_ORDERS)
    accepted_matches = len(ACCEPTED_MATCHES)
    total_savings = 0.0

    for match_id in ACCEPTED_MATCHES:
        order = next(order for order in MOCK_ORDERS if order["id"] == match_id)
        additional_distance = calculate_additional_distance(
            order["base_distance_km"], order["route_distance_km"]
        )
        total_savings += calculate_estimated_savings(
            order["base_distance_km"], additional_distance
        )

    return {
        "total_orders": total_orders,
        "accepted_matches": accepted_matches,
        "acceptance_rate": round(accepted_matches / total_orders * 100, 2) if total_orders else 0.0,
        "total_estimated_savings": round(total_savings, 2),
    }


@api_router.get("/reports")
def get_reports() -> dict:
    reports = []
    for match_id in ACCEPTED_MATCHES:
        order = next((order for order in MOCK_ORDERS if order["id"] == match_id), None)
        if order is None:
            continue
        additional_distance = calculate_additional_distance(
            order["base_distance_km"], order["route_distance_km"]
        )
        savings = calculate_estimated_savings(order["base_distance_km"], additional_distance)
        reports.append(
            {
                "match_id": match_id,
                "cargo_type": order["cargo_type"],
                "weight_ton": order["weight_ton"],
                "additional_distance_km": additional_distance,
                "estimated_savings": savings,
            }
        )
    return {"total": len(reports), "reports": reports}
