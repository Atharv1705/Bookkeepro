from app.database import SessionLocal
from app.models import User
from app.crud import get_password_hash

db = SessionLocal()
email = "atharvagunjarge5@gmail.com".lower()
user = db.query(User).filter(User.email == email).first()

if user:
    new_password = "Gunjarge@1705"
    user.hashed_password = get_password_hash(new_password)
    db.commit()
    print("Password updated successfully!")
else:
    print("User not found in database!")
    
db.close()
