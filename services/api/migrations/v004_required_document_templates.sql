CREATE TABLE required_document_templates (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    category VARCHAR(50) NOT NULL,
    tax_year INTEGER NOT NULL,
    name VARCHAR(200) NOT NULL,
    file_url VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_template_cat_year_name ON required_document_templates (category, tax_year, name);

-- Seed with initial hardcoded data
INSERT INTO required_document_templates (category, tax_year, name, file_url) VALUES 
('personal', 2026, 'Individual taxpayer organizer sole proprietorship rental 2026', '/images/individual_taxpayer_organizer_sole_proprietorship_rental_2025-doc-1.pdf'),
('personal', 2025, 'Individual taxpayer organizer sole proprietorship rental 2025', '/images/individual_taxpayer_organizer_sole_proprietorship_rental_2025-doc-1.pdf'),
('personal', 2024, 'Individual taxpayer organizer 2024', '/images/individual_taxpayer_organizer_2024.pdf'),
('personal', 2023, 'Individual taxpayer organizer 2023', NULL),
('business', 2026, 's_corporation organizer 2026', '/images/s_corporation_organizer_2025-business-doc-1.pdf'),
('business', 2026, 'llc tax organizer 2026', '/images/llc_tax_organizer_2025-personal-doc-2.pdf'),
('business', 2026, 'Partnership tax organizer 2026', '/images/partnership_tax_organizer_2025-persoal-doc-3.pdf'),
('business', 2026, 'Certificate of Formation', NULL),
('business', 2026, 'Employer Identification Number (EIN)', NULL),
('business', 2026, 'Annual Financial Statements', NULL),
('business', 2025, 's_corporation organizer 2025', '/images/s_corporation_organizer_2025-business-doc-1.pdf'),
('business', 2025, 'llc tax organizer 2025', '/images/llc_tax_organizer_2025-personal-doc-2.pdf'),
('business', 2025, 'Partnership tax organizer 2025', '/images/partnership_tax_organizer_2025-persoal-doc-3.pdf'),
('business', 2025, 'Certificate of Formation', NULL),
('business', 2025, 'Employer Identification Number (EIN)', NULL),
('business', 2025, 'Annual Financial Statements', NULL),
('business', 2024, 'S Corporation organizer 2024', NULL),
('business', 2024, 'LLC tax organizer 2024', NULL),
('business', 2024, 'Partnership tax organizer 2024', NULL),
('business', 2024, 'Certificate of Formation', NULL),
('business', 2024, 'Employer Identification Number (EIN)', NULL),
('business', 2024, 'Annual Financial Statements', NULL),
('business', 2023, 'S Corporation organizer 2023', NULL),
('business', 2023, 'LLC tax organizer 2023', NULL),
('business', 2023, 'Partnership tax organizer 2023', NULL),
('business', 2023, 'Certificate of Formation', NULL),
('business', 2023, 'Employer Identification Number (EIN)', NULL),
('business', 2023, 'Annual Financial Statements', NULL);
