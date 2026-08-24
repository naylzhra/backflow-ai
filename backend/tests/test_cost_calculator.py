import pytest

from app.services.cost_calculator import (
    calculate_additional_distance,
    calculate_estimated_savings,
)


def test_calculates_additional_distance():
    assert calculate_additional_distance(780, 827) == 47


def test_additional_distance_never_goes_negative():
    assert calculate_additional_distance(827, 780) == 0


def test_calculates_estimated_savings():
    assert calculate_estimated_savings(780, 47) == 7_330_000


def test_rejects_negative_distance():
    with pytest.raises(ValueError):
        calculate_additional_distance(-1, 10)

    with pytest.raises(ValueError):
        calculate_estimated_savings(100, -1)
