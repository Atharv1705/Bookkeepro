import sys
sys.path.append('.')
from app.db import SessionLocal
from app.models import PersonalDocument, BusinessDocument

db = SessionLocal()
pq = db.query(PersonalDocument).filter(PersonalDocument.review_status == "pending", PersonalDocument.deleted_at == None).filter(PersonalDocument.tax_year == 2025)
print("Pending personal docs for 2025:", pq.count())

bq = db.query(BusinessDocument).filter(BusinessDocument.review_status == "pending", BusinessDocument.deleted_at == None).filter(BusinessDocument.tax_year == 2025)
print("Pending business docs for 2025:", bq.count())

p26 = db.query(PersonalDocument).filter(PersonalDocument.review_status == "pending", PersonalDocument.deleted_at == None).filter(PersonalDocument.tax_year == 2026)
print("Pending personal docs for 2026:", p26.count())
