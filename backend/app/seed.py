"""Standalone data seeder for Backflow AI.

Creates the ``cities`` / ``orders`` (tabel_orders) / ``matching_history``
(tabel_matches) tables if they don't exist yet, and loads the ~200 synthetic
internal orders (Indonesian pickup/dropoff cities) from
``app/db/seed_data/`` into PostgreSQL if the ``orders`` table is empty.

This runs automatically on every backend container start (see
``app/main.py`` -> ``on_startup`` -> ``init_db()``), so ``docker compose up``
already leaves you with a seeded database. This script exists for the cases
where you want to (re-)seed manually, e.g. outside Docker or in CI:

    cd backend
    python seed.py

Or from inside the running backend container:

    docker compose exec backend python seed.py
"""

from app.db.connection import get_db_connection, init_db


def main() -> None:
    print(f"Connecting to database...")
    init_db()  # creates tables (if missing) and seeds cities + orders

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM cities;")
            n_cities = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM orders;")
            n_orders = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM matching_history;")
            n_matches = cur.fetchone()[0]

    print(f"Done. cities={n_cities} orders={n_orders} matching_history={n_matches}")


if __name__ == "__main__":
    main()