import sys
sys.path.append('.')
from app.db import SessionLocal
from app.models import PersonalDocument

db = SessionLocal()
docs = db.query(PersonalDocument).filter(PersonalDocument.tax_year == 2026, PersonalDocument.review_status == 'pending').all()
print("2026 pending docs:")
for d in docs:
    print(f"ID {d.id} deleted_at: {d.deleted_at}")
