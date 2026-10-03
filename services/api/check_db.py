import sys
import json
sys.path.append('.')
from app.db import SessionLocal
from app.models import RequiredDocumentTemplate, PersonalDocument, BusinessDocument

db = SessionLocal()
templates = db.query(RequiredDocumentTemplate).all()
pdocs = db.query(PersonalDocument).all()
bdocs = db.query(BusinessDocument).all()

print("--- TEMPLATES ---")
for t in templates:
    print(f"[{t.category.upper()}] TY {t.tax_year} | {t.name}")

print("\n--- PERSONAL DOCS ---")
for d in pdocs:
    print(f"ID {d.id} | User {d.user_id} | TY {d.tax_year} | {d.doc_type} | {d.review_status}")

print("\n--- BUSINESS DOCS ---")
for d in bdocs:
    print(f"ID {d.id} | User {d.user_id} | TY {d.tax_year} | {d.business_type} | {d.review_status}")

