from app.db import SessionLocal
from app.models import User

db = SessionLocal()
users = db.query(User).filter(User.email.ilike("%%atharva%%")).all()
for u in users:
    print(f"ID: {u.id}, Email: '{u.email}'")
db.close()
