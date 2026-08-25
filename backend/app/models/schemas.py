"""Database table schemas (DDL) for Backflow AI.

This project talks to PostgreSQL directly through ``psycopg`` (see
``app/db/connection.py``) rather than through a SQLAlchemy ORM layer, so
"models" here are expressed as plain DDL strings plus lightweight dataclasses
that document the shape of each row for the rest of the codebase (API layer,
tests, seeders).

Tables
------
``cities``
    Lookup table of Indonesian city coordinates, used for distance/route
    calculations.

``orders`` (a.k.a. *tabel_orders*)
    Internal shipment orders that can fill a truck's empty backhaul:
    Kota Asal (pickup_city), Kota Tujuan (dropoff_city), Tanggal
    (pickup_start/pickup_end), Berat (weight_tons), Jenis Muatan
    (cargo_category/cargo_description), Status (status).

``matching_history`` (a.k.a. *tabel_matches*)
    Every AI matching recommendation ever produced, whether or not it was
    accepted: ID Truk (truck_id), ID Order (order_id), Skor Cocok
    (match_score), Jarak Tambahan (additional_distance_km), Penghematan
    Biaya (estimated_savings).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime

# ---------------------------------------------------------------------------
# DDL
# ---------------------------------------------------------------------------

CREATE_CITIES_TABLE = """
    CREATE TABLE IF NOT EXISTS cities (
        name VARCHAR(100) PRIMARY KEY,
        lat DOUBLE PRECISION NOT NULL,
        lon DOUBLE PRECISION NOT NULL
    );
"""

# tabel_orders
CREATE_ORDERS_TABLE = """
    CREATE TABLE IF NOT EXISTS orders (
        order_id VARCHAR(50) PRIMARY KEY,
        pickup_city VARCHAR(100) REFERENCES cities(name),   -- Kota Asal
        dropoff_city VARCHAR(100) REFERENCES cities(name),  -- Kota Tujuan
        pickup_start DATE NOT NULL,                         -- Tanggal (mulai)
        pickup_end DATE NOT NULL,                            -- Tanggal (akhir)
        weight_tons DOUBLE PRECISION NOT NULL,               -- Berat
        cargo_description TEXT NOT NULL,                     -- Jenis Muatan (deskripsi)
        cargo_category VARCHAR(100) NOT NULL,                 -- Jenis Muatan (kategori)
        status VARCHAR(50) NOT NULL                           -- Status
    );
"""

# tabel_matches
CREATE_MATCHING_HISTORY_TABLE = """
    CREATE TABLE IF NOT EXISTS matching_history (
        id SERIAL PRIMARY KEY,
        search_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        truck_id VARCHAR(50) NULL,                            -- ID Truk
        origin_city VARCHAR(100) NOT NULL,
        destination_city VARCHAR(100) NOT NULL,
        arrival_date DATE NOT NULL,
        empty_capacity_ton DOUBLE PRECISION NOT NULL,
        cargo_types TEXT NOT NULL,
        order_id VARCHAR(50) REFERENCES orders(order_id) NULL, -- ID Order
        match_score DOUBLE PRECISION NULL,                     -- Skor Cocok
        additional_distance_km DOUBLE PRECISION NULL,          -- Jarak Tambahan
        estimated_savings DOUBLE PRECISION NULL,               -- Penghematan Biaya
        status VARCHAR(50) NOT NULL,
        explanation TEXT NULL
    );
"""

# Columns added after the initial release. Applied with ADD COLUMN IF NOT
# EXISTS so upgrading an already-running database (e.g. an existing Docker
# volume) is non-destructive.
MATCHING_HISTORY_MIGRATIONS = [
    "ALTER TABLE matching_history ADD COLUMN IF NOT EXISTS truck_id VARCHAR(50) NULL;",
    "ALTER TABLE matching_history ADD COLUMN IF NOT EXISTS additional_distance_km DOUBLE PRECISION NULL;",
]

ALL_TABLE_DDL = [
    CREATE_CITIES_TABLE,
    CREATE_ORDERS_TABLE,
    CREATE_MATCHING_HISTORY_TABLE,
]


# ---------------------------------------------------------------------------
# Row dataclasses (documentation / typing helpers, not an ORM)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class City:
    name: str
    lat: float
    lon: float


@dataclass(frozen=True)
class OrderRow:
    """One row of ``orders`` (tabel_orders)."""

    order_id: str
    pickup_city: str        # Kota Asal
    dropoff_city: str       # Kota Tujuan
    pickup_start: date      # Tanggal
    pickup_end: date        # Tanggal
    weight_tons: float      # Berat
    cargo_description: str  # Jenis Muatan
    cargo_category: str     # Jenis Muatan
    status: str              # Status


@dataclass(frozen=True)
class MatchingHistoryRow:
    """One row of ``matching_history`` (tabel_matches)."""

    id: int
    search_date: datetime
    truck_id: str | None                 # ID Truk
    origin_city: str
    destination_city: str
    arrival_date: date
    empty_capacity_ton: float
    cargo_types: str
    order_id: str | None                 # ID Order
    match_score: float | None            # Skor Cocok
    additional_distance_km: float | None  # Jarak Tambahan
    estimated_savings: float | None      # Penghematan Biaya
    status: str
    explanation: str | None