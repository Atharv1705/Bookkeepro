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

            # ── v5: Required Document Templates ───────────────────────────────
            _add_column(conn, "required_document_templates", "storage_key",
                        "VARCHAR(500) NULL DEFAULT NULL")

            # ── v6: AI summary for admin documents ────────────────────────────────
            _add_column(conn, "admin_documents", "ai_summary", "TEXT NULL DEFAULT NULL")
            # ── v005: Workflow Improvements ─────────────────────────────────────
            _add_column(conn, "admin_documents", "tax_year", "INT NULL DEFAULT NULL")
            _add_column(conn, "admin_documents", "review_status", "VARCHAR(20) NOT NULL DEFAULT 'pending'")
            _add_column(conn, "admin_documents", "review_note", "VARCHAR(500) NULL DEFAULT NULL")
            _add_column(conn, "admin_documents", "reviewed_at", "DATETIME NULL DEFAULT NULL")
            
            # Set existing docs to pending
            conn.execute(text("UPDATE admin_documents SET review_status = 'pending' WHERE review_status IS NULL OR review_status = '';"))
            
            # Create document_review_events table
            try:
                conn.execute(text("""
                CREATE TABLE IF NOT EXISTS document_review_events (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    doc_kind VARCHAR(50) NOT NULL,
                    doc_id INT NOT NULL,
                    owner_user_id INT NOT NULL,
                    actor_id INT NULL,
                    actor_role VARCHAR(20) NOT NULL,
                    action VARCHAR(50) NOT NULL,
                    from_status VARCHAR(20) NULL,
                    to_status VARCHAR(20) NULL,
                    tax_year INT NULL,
                    comment TEXT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
                    INDEX ix_document_review_events_composite (doc_kind, doc_id, created_at),
                    INDEX ix_document_review_events_owner (owner_user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
                print("  [OK] Table document_review_events created or exists")
            except Exception as e:
                print(f"  [WARN] Table document_review_events: {e}")

            # Create admin_document_bookmarks table
            try:
                conn.execute(text("""
                CREATE TABLE IF NOT EXISTS admin_document_bookmarks (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    admin_id INT NOT NULL,
                    doc_kind VARCHAR(50) NOT NULL,
                    doc_id INT NOT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE KEY uq_admin_bookmark (admin_id, doc_kind, doc_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """))
                print("  [OK] Table admin_document_bookmarks created or exists")
            except Exception as e:
                print(f"  [WARN] Table admin_document_bookmarks: {e}")
                
            # Backfill one uploaded event per admin_document
            try:
                conn.execute(text("""
                INSERT INTO document_review_events (doc_kind, doc_id, owner_user_id, actor_id, actor_role, action, from_status, to_status, tax_year, created_at)
                SELECT 'admin', id, user_id, uploaded_by, 'admin', 'uploaded', NULL, 'pending', tax_year, uploaded_at
                FROM admin_documents
                WHERE id NOT IN (SELECT doc_id FROM document_review_events WHERE doc_kind = 'admin' AND action = 'uploaded');
                """))
                print("  [OK] Backfilled uploaded events for admin_documents")
            except Exception as e:
                print(f"  [WARN] Backfill uploaded events: {e}")
            # -- v7: Chat history cascade -- existing DBs need the FK fixed ----
            # SQLAlchemy ORM cascade handles Python-side deletes, but the DB-level
            # constraint is required when MySQL cascades from a parent delete directly.
            for stmt in [
                "ALTER TABLE chat_messages DROP FOREIGN KEY chat_messages_ibfk_1",
                "ALTER TABLE chat_messages ADD CONSTRAINT fk_chat_messages_session FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE",
            ]:
                try:
                    conn.execute(text(stmt))
                    print(f"  [OK] {stmt[:70]}...")
                except (OperationalError, ProgrammingError) as e:
                    msg = str(e).lower()
                    if "duplicate" in msg or "already exists" in msg or "can't drop" in msg or "check that column" in msg:
                        print(f"  [SKIP] Already applied or key not found: {stmt[:50]}...")
                    else:
                        print(f"  [WARN] {e}")

            # -- v8: Seed required_document_templates for fresh databases ---------
            # On a fresh DB the table exists but is empty. Seed 10 default templates
            # for both personal and business categories so users see a checklist.
            try:
                count = conn.execute(text("SELECT COUNT(*) FROM required_document_templates")).scalar()
                if count == 0:
                    import datetime
                    current_year = datetime.date.today().year
                    personal_docs = [
                        "W-2 Form", "1099-NEC / 1099-MISC", "SSA-1099 (Social Security Benefits)",
                        "Mortgage Interest Statement (1098)", "Charitable Donation Receipts",
                        "Medical & Dental Expense Receipts", "Student Loan Interest (1098-E)",
                        "State & Local Tax Payment Records", "Investment Income (1099-B / 1099-DIV)",
                        "Prior Year Tax Return",
                    ]
                    business_docs = [
                        "Profit & Loss Statement", "Balance Sheet",
                        "Bank Statements (All Accounts)", "Business Expense Receipts",
                        "Payroll Records / W-3", "1099s Issued to Contractors",
                        "Vehicle Mileage Log", "Home Office Documentation",
                        "Business Asset Purchase Invoices", "Prior Year Business Tax Return",
                    ]
                    for name in personal_docs:
                        conn.execute(text(
                            "INSERT IGNORE INTO required_document_templates (category, tax_year, name) VALUES ('personal', :yr, :name)"
                        ), {"yr": current_year, "name": name})
                    for name in business_docs:
                        conn.execute(text(
                            "INSERT IGNORE INTO required_document_templates (category, tax_year, name) VALUES ('business', :yr, :name)"
                        ), {"yr": current_year, "name": name})
                    print(f"  [OK] Seeded {len(personal_docs)} personal + {len(business_docs)} business templates for {current_year}")
                else:
                    print(f"  [SKIP] required_document_templates already has {count} rows")
            except Exception as e:
                print(f"  [WARN] Template seed: {e}")


        print("\nAll migrations complete.")
    except Exception as e:
        print(f"Migration error: {e}")


if __name__ == "__main__":
    upgrade()

