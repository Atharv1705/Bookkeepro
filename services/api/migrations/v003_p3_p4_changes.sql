-- ============================================================
-- Migration v003 — P3/P4 changes
-- Compatible with MySQL 5.7+ / 8.0 (no IF NOT EXISTS syntax)
-- Run each block separately if re-running after a partial apply.
-- ============================================================

-- #16 — Engagement letter acknowledgement timestamp
-- Safe to re-run: ADD COLUMN fails silently if column already exists
-- (just ignore "Duplicate column name" error on re-run)
ALTER TABLE users
  ADD COLUMN engagement_acknowledged_at DATETIME NULL DEFAULT NULL;

-- #10 — Prevent duplicate document uploads (same user / type / year)
-- Drop first in case of partial previous run, then re-add.
-- Ignore "Can't DROP ... check that it exists" errors on first run.
ALTER TABLE personal_documents
  DROP INDEX uq_personal_doc_user_type_year;

ALTER TABLE personal_documents
  ADD UNIQUE INDEX uq_personal_doc_user_type_year (user_id, doc_type, tax_year);

ALTER TABLE business_documents
  DROP INDEX uq_business_doc_user_type_year;

ALTER TABLE business_documents
  ADD UNIQUE INDEX uq_business_doc_user_type_year (user_id, business_type, tax_year);
