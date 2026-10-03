import sys
sys.path.append('.')
from app.db import SessionLocal
from app.models import PersonalDocument

db = SessionLocal()
pq_none = db.query(PersonalDocument).filter(PersonalDocument.review_status == "pending", PersonalDocument.deleted_at == None).filter(PersonalDocument.tax_year == 2025)
pq_is_none = db.query(PersonalDocument).filter(PersonalDocument.review_status == "pending", PersonalDocument.deleted_at.is_(None)).filter(PersonalDocument.tax_year == 2025)

print("With == None:", pq_none.count())
print("With is_(None):", pq_is_none.count())

docs = db.query(PersonalDocument).filter(PersonalDocument.tax_year == 2025).all()
print("All 2025 docs count:", len(docs))
for d in docs:
    print(f"ID {d.id} deleted_at: {d.deleted_at}")
