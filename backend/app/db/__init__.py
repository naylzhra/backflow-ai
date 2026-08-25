"""Database configuration and session management.

Connection setup lives in ``app.db.connection`` (URL read from the
``DATABASE_URL`` environment variable, via ``psycopg``). Re-exported here so
``app.db`` itself can be used as the database configuration entry point.
"""

from app.db.connection import DATABASE_URL, get_db_connection, init_db, seed_db

__all__ = ["DATABASE_URL", "get_db_connection", "init_db", "seed_db"]