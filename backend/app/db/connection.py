import os
import json
import csv
from pathlib import Path
import psycopg

from app.models.schemas import ALL_TABLE_DDL, MATCHING_HISTORY_MIGRATIONS

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://backflow:backflow@localhost:5432/backflow")

# Clean DATABASE_URL for psycopg (psycopg doesn't recognize postgresql+psycopg schema)
if DATABASE_URL.startswith("postgresql+psycopg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg://", "postgresql://")

def get_db_connection():
    """Establish and return a connection to the PostgreSQL database."""
    return psycopg.connect(DATABASE_URL)

def init_db():
    """Initialize database tables and seed initial data if tables are empty."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Create tables (cities, orders / tabel_orders, matching_history / tabel_matches)
            for ddl in ALL_TABLE_DDL:
                cur.execute(ddl)

            # Apply additive migrations for columns introduced after the
            # initial release (safe to re-run against an existing volume).
            for migration in MATCHING_HISTORY_MIGRATIONS:
                cur.execute(migration)

            conn.commit()

    # Seed data if tables are empty
    seed_db()

def seed_db():
    """Seed data from local cities.json and orders.csv into the DB if empty."""
    seed_dir = Path(__file__).resolve().parent / "seed_data"
    cities_file = seed_dir / "cities.json"
    orders_file = seed_dir / "orders.csv"

    if not cities_file.exists() or not orders_file.exists():
        # Fallback to absolute paths outside backend if needed (e.g., during tests run locally)
        root_dir = Path(__file__).resolve().parents[3]
        cities_file = root_dir / "data" / "cities.json"
        orders_file = root_dir / "data" / "orders.csv"

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Check if cities are empty
            cur.execute("SELECT COUNT(*) FROM cities;")
            if cur.fetchone()[0] == 0 and cities_file.exists():
                print("Seeding cities...")
                cities_data = json.loads(cities_file.read_text(encoding="utf-8"))
                for name, coords in cities_data.items():
                    cur.execute(
                        "INSERT INTO cities (name, lat, lon) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING;",
                        (name, coords["lat"], coords["lon"])
                    )
                conn.commit()

            # Check if orders are empty
            cur.execute("SELECT COUNT(*) FROM orders;")
            if cur.fetchone()[0] == 0 and orders_file.exists():
                print("Seeding orders...")
                with orders_file.open(mode="r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        cur.execute(
                            """
                            INSERT INTO orders (
                                order_id, pickup_city, dropoff_city, pickup_start, 
                                pickup_end, weight_tons, cargo_description, cargo_category, status
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT DO NOTHING;
                            """,
                            (
                                row["order_id"],
                                row["pickup_city"],
                                row["dropoff_city"],
                                row["pickup_start"],
                                row["pickup_end"],
                                float(row["weight_tons"]),
                                row["cargo_description"],
                                row["cargo_category"],
                                row["status"]
                            )
                        )
                conn.commit()
