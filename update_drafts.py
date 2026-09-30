import sys
sys.path.append(r'c:\Users\abhil\Desktop\Bookkeepro-redesigned\Bookkeep\services\api')
from app.db import SessionLocal
from sqlalchemy import text

db = SessionLocal()
db.execute(text("UPDATE personal_documents SET review_status = 'pending' WHERE review_status = 'draft'"))
db.execute(text("UPDATE business_documents SET review_status = 'pending' WHERE review_status = 'draft'"))
db.commit()

from app.models import DocumentReviewEvent, PersonalDocument, BusinessDocument

# Also append uploaded events
for doc in db.query(PersonalDocument).all():
    if not db.query(DocumentReviewEvent).filter_by(doc_kind='personal', doc_id=doc.id, action='uploaded').first():
        db.add(DocumentReviewEvent(doc_kind='personal', doc_id=doc.id, owner_user_id=doc.user_id, actor_id=doc.user_id, actor_role='user', action='uploaded', to_status='pending', tax_year=doc.tax_year, created_at=doc.uploaded_at))

for doc in db.query(BusinessDocument).all():
    if not db.query(DocumentReviewEvent).filter_by(doc_kind='business', doc_id=doc.id, action='uploaded').first():
        db.add(DocumentReviewEvent(doc_kind='business', doc_id=doc.id, owner_user_id=doc.user_id, actor_id=doc.user_id, actor_role='user', action='uploaded', to_status='pending', tax_year=doc.tax_year, created_at=doc.uploaded_at))

db.commit()
print('Done updating db')
