import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'services', 'api'))

from app.db.database import SessionLocal
from app.models import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

db = SessionLocal()
email = "atharvagunjarge5@gmail.com".lower()
user = db.query(User).filter(User.email == email).first()

if user:
    new_password = "Gunjarge@1705"
    user.hashed_password = pwd_context.hash(new_password)
    db.commit()
    print("Password updated successfully!")
else:
    print("User not found in database!")

db.close()
