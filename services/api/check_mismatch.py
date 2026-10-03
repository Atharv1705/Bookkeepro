import sys
sys.path.append('.')
from app.db import SessionLocal
from app.models import PersonalDocument, BusinessDocument

db = SessionLocal()

# Global count (like admin-status)
global_p = db.query(PersonalDocument).filter(
    PersonalDocument.review_status == "pending", 
    PersonalDocument.deleted_at.is_(None), 
    PersonalDocument.tax_year == 2026
).count()

# User-level count (like security.py)
from sqlalchemy import func as sqlfunc
users_p_q = db.query(PersonalDocument.user_id, sqlfunc.count(PersonalDocument.id)).filter(
    PersonalDocument.review_status == "pending", 
    PersonalDocument.deleted_at.is_(None), 
    PersonalDocument.tax_year == 2026
).group_by(PersonalDocument.user_id).all()

sum_user_p = sum(count for _, count in users_p_q)

print(f"Global: {global_p}, Sum of users: {sum_user_p}")
