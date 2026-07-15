import os
import sys
import getpass
from sqlalchemy.orm import Session
from app.db import SessionLocal, engine
from app import models
from app.crud import get_user_by_email, hash_password

def create_super_admin():
    # Ensure tables exist
    models.Base.metadata.create_all(bind=engine)

    print("--- Create Super Admin ---")
    email = input("Email: ").strip()
    if not email:
        print("Email is required.")
        sys.exit(1)

    name = input("Name [Super Admin]: ").strip()
    if not name:
        name = "Super Admin"

    # In a real shell getpass hides input, but for script ease we'll fallback to input() if needed
    try:
        password = getpass.getpass("Password: ")
    except Exception:
        password = input("Password: ")
        
    if not password:
        print("Password is required.")
        sys.exit(1)

    db: Session = SessionLocal()
    try:
        existing = get_user_by_email(db, email)
        if existing:
            if existing.role != "super_admin":
                print(f"User {email} exists with role '{existing.role}'. Upgrading to super_admin...")
                existing.role = "super_admin"
                existing.is_verified = 1
                db.commit()
                print("Upgrade successful!")
            else:
                print("Super admin already exists with this email.")
        else:
            user = models.User(
                name=name,
                email=email,
                phone="",
                hashed_password=hash_password(password),
                role="super_admin",
                is_verified=1
            )
            db.add(user)
            db.commit()
            print("Super admin created successfully!")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_super_admin()
