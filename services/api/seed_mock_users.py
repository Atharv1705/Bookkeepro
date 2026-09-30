import os
import uuid
import datetime
import sys



from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import User, PersonalDocument, BusinessDocument, UserRole
from app.auth.security import get_password_hash

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MOCK_USERS = [
    {"name": "James Smith", "email": "james.smith@example.com"},
    {"name": "Robert Johnson", "email": "robert.j@example.com"},
    {"name": "John Williams", "email": "john.williams@example.com"},
    {"name": "Michael Brown", "email": "michael.brown@example.com"},
    {"name": "David Jones", "email": "david.jones@example.com"},
    {"name": "William Garcia", "email": "william.g@example.com"},
    {"name": "Richard Martinez", "email": "richard.m@example.com"},
    {"name": "Joseph Davis", "email": "joseph.davis@example.com"},
    {"name": "Thomas Rodriguez", "email": "thomas.r@example.com"},
    {"name": "Charles Martinez", "email": "charles.m@example.com"},
]

def generate_pdf(filepath, title, content):
    minimal_pdf = b"%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%EOF\n"
    with open(filepath, 'wb') as f:
        f.write(minimal_pdf)

def seed_data():
    db: Session = SessionLocal()
    
    # Create Users
    for user_data in MOCK_USERS:
        existing_user = db.query(User).filter(User.email == user_data["email"]).first()
        if not existing_user:
            new_user = User(
                name=user_data["name"],
                email=user_data["email"],
                hashed_password=get_password_hash("Password123!"),
                role=UserRole.user
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            print(f"Created user: {new_user.email}")
            user_id = new_user.id
        else:
            user_id = existing_user.id
            print(f"User already exists: {existing_user.email}")

        # Add Personal Document
        p_filename = f"W2_{user_data['name'].replace(' ', '_')}_2024.pdf"
        p_storage_key = f"{uuid.uuid4()}_{p_filename}"
        p_filepath = os.path.join(UPLOAD_DIR, p_storage_key)
        
        generate_pdf(p_filepath, "Form W-2 Wage and Tax Statement", f"Generated for {user_data['name']} (Personal)")
        
        p_doc = PersonalDocument(
            user_id=user_id,
            doc_type="W-2",
            filename=p_filename,
            storage_key=p_storage_key,
            content_type="application/pdf",
            file_hash=p_storage_key,  # dummy hash
            review_status="pending",
            tax_year=2024
        )
        db.add(p_doc)

        # Add Business Document
        b_filename = f"1099_{user_data['name'].replace(' ', '_')}_2024.pdf"
        b_storage_key = f"{uuid.uuid4()}_{b_filename}"
        b_filepath = os.path.join(UPLOAD_DIR, b_storage_key)
        
        generate_pdf(b_filepath, "Form 1099 Miscellaneous Income", f"Generated for {user_data['name']} (Business)")
        
        b_doc = BusinessDocument(
            user_id=user_id,
            doc_type="1099",
            filename=b_filename,
            storage_key=b_storage_key,
            content_type="application/pdf",
            file_hash=b_storage_key,  # dummy hash
            review_status="pending",
            tax_year=2024
        )
        db.add(b_doc)
        
        db.commit()
        print(f"Added personal & business documents for {user_data['name']}")

    db.close()
    print("Seeding complete.")

if __name__ == "__main__":
    seed_data()
