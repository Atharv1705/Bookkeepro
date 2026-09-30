-- v005_workflow_improvements.sql

ALTER TABLE admin_documents ADD COLUMN tax_year INT NULL DEFAULT NULL;
ALTER TABLE admin_documents ADD COLUMN review_status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE admin_documents ADD COLUMN review_note VARCHAR(500) NULL DEFAULT NULL;
ALTER TABLE admin_documents ADD COLUMN reviewed_at DATETIME NULL DEFAULT NULL;

UPDATE admin_documents SET review_status = 'pending' WHERE review_status IS NULL OR review_status = '';

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

CREATE TABLE IF NOT EXISTS admin_document_bookmarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    doc_kind VARCHAR(50) NOT NULL,
    doc_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_admin_bookmark (admin_id, doc_kind, doc_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO document_review_events (doc_kind, doc_id, owner_user_id, actor_id, actor_role, action, from_status, to_status, tax_year, created_at)
SELECT 'admin', id, user_id, uploaded_by, 'admin', 'uploaded', NULL, 'pending', tax_year, uploaded_at
FROM admin_documents
WHERE id NOT IN (SELECT doc_id FROM document_review_events WHERE doc_kind = 'admin' AND action = 'uploaded');
