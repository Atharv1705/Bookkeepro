"""
Incremental migration script — safe to re-run on any existing DB.
Each ALTER TABLE is wrapped individually so a failure on one column
never blocks the rest. "Duplicate column" errors are silently skipped.
"""
import sys
import os

sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.db import engine
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, ProgrammingError


def _add_column(conn, table: str, column: str, definition: str):
    """Add a column if it doesn't already exist. Silently skips duplicates."""
    try:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {definition}"))
        print(f"  [OK] Added {table}.{column}")
    except (OperationalError, ProgrammingError) as e:
        msg = str(e).lower()
        if "duplicate column" in msg or "already exists" in msg:
            print(f"  [SKIP] {table}.{column} already exists")
        else:
            print(f"  [WARN] {table}.{column}: {e}")


def upgrade():
    print("Running migrations...")
    try:
        with engine.begin() as conn:

            # ── v1: AI extraction data ────────────────────────────────────────
            _add_column(conn, "personal_documents", "extracted_data", "JSON")
            _add_column(conn, "business_documents", "extracted_data", "JSON")

            # ── v2: Engagement acknowledgement on users ───────────────────────
            _add_column(conn, "users", "engagement_acknowledged_at",
                        "DATETIME NULL DEFAULT NULL")

            # ── v3: Unique indexes for document dedup ─────────────────────────
            for stmt in [
                "ALTER TABLE personal_documents DROP INDEX uq_personal_doc_user_type_year",
                "ALTER TABLE personal_documents ADD UNIQUE INDEX uq_personal_doc_user_type_year (user_id, doc_type, tax_year)",
                "ALTER TABLE business_documents DROP INDEX uq_business_doc_user_type_year",
                "ALTER TABLE business_documents ADD UNIQUE INDEX uq_business_doc_user_type_year (user_id, business_type, tax_year)",
            ]:
                try:
                    conn.execute(text(stmt))
                    print(f"  [OK] {stmt[:60]}...")
                except (OperationalError, ProgrammingError) as e:
                    msg = str(e).lower()
                    if "duplicate" in msg or "already exists" in msg or "can't drop" in msg:
                        print(f"  [SKIP] Already applied: {stmt[:50]}...")
                    else:
                        print(f"  [WARN] {e}")

            # ── v4: File hash column for extraction deduplication (Item 3) ────
            _add_column(conn, "personal_documents", "file_hash",
                        "VARCHAR(64) NULL DEFAULT NULL")
            _add_column(conn, "business_documents", "file_hash",
                        "VARCHAR(64) NULL DEFAULT NULL")

            # Add index on file_hash for fast cache lookups
            for table in ("personal_documents", "business_documents"):
                try:
                    conn.execute(text(
                        f"CREATE INDEX ix_{table}_file_hash ON {table} (file_hash)"
                    ))
                    print(f"  [OK] Index ix_{table}_file_hash created")
                except (OperationalError, ProgrammingError) as e:
                    if "duplicate" in str(e).lower() or "already exists" in str(e).lower():
                        print(f"  [SKIP] Index ix_{table}_file_hash already exists")
                    else:
                        print(f"  [WARN] Index {table}: {e}")

        print("\nAll migrations complete.")
    except Exception as e:
        print(f"Migration error: {e}")


if __name__ == "__main__":
    upgrade()
