FUEL_COST_PER_KM = 7_500
DRIVER_COST_PER_KM = 2_000
OTHER_COST_PER_KM = 500
COST_PER_KM = FUEL_COST_PER_KM + DRIVER_COST_PER_KM + OTHER_COST_PER_KM


def _validate_distance(value: float) -> None:
    if value < 0:
        raise ValueError("Distance cannot be negative")


def calculate_additional_distance(base_distance_km: float, route_distance_km: float) -> float:
    _validate_distance(base_distance_km)
    _validate_distance(route_distance_km)
    return round(max(route_distance_km - base_distance_km, 0.0), 2)


def calculate_empty_return_cost(distance_km: float) -> float:
    _validate_distance(distance_km)
    return round(distance_km * COST_PER_KM, 2)


def calculate_loaded_return_cost(distance_km: float) -> float:
    _validate_distance(distance_km)
    return round(distance_km * COST_PER_KM, 2)


def calculate_estimated_savings(base_distance_km: float, additional_distance_km: float) -> float:
    _validate_distance(base_distance_km)
    _validate_distance(additional_distance_km)
    empty_return_cost = calculate_empty_return_cost(base_distance_km)
    additional_cost = calculate_loaded_return_cost(additional_distance_km)
    return round(max(empty_return_cost - additional_cost, 0.0), 2)
