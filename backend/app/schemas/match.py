from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator

# nanti ganti aja klo ga sesuai sm yg lain
class Location(BaseModel):
    city: str = Field(min_length=1)
    district: str = ""
    village: str = ""


class MatchSearchRequest(BaseModel):
    origin: Location
    destination: Location
    arrival_date: date
    empty_capacity_ton: float = Field(gt=0)
    cargo_types: list[str] = Field(default_factory=list)
    truck_id: str | None = None

    @model_validator(mode="after")
    def validate_route_and_date(self):
        same_location = (
            self.origin.city.strip().lower() == self.destination.city.strip().lower()
            and self.origin.district.strip().lower() == self.destination.district.strip().lower()
            and self.origin.village.strip().lower() == self.destination.village.strip().lower()
        )
        if same_location:
            raise ValueError("Origin and destination must be different")

        if self.arrival_date < date.today():
            raise ValueError("Arrival date cannot be in the past")

        return self


class OrderSummary(BaseModel):
    id: str
    cargo_type: str
    weight_ton: float
    pickup_time: datetime


class RouteSummary(BaseModel):
    pickup: str
    destination: str
    additional_distance_km: float = Field(ge=0)


class ScoreBreakdown(BaseModel):
    route: float = Field(ge=0, le=100)
    capacity: float = Field(ge=0, le=100)
    schedule: float = Field(ge=0, le=100)
    cargo: float = Field(ge=0, le=100)


class MatchRecommendation(BaseModel):
    match_score: float = Field(ge=0, le=100)
    order: OrderSummary
    route: RouteSummary
    estimated_savings: float = Field(ge=0)
    score_breakdown: ScoreBreakdown
    explanation: str = ""



class MatchSearchResponse(BaseModel):
    status: str
    total_candidates: int = Field(ge=0)
    recommendation: MatchRecommendation | None = None
