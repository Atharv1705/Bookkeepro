import sys
import os

# Add the root directory to sys.path so we can import app
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.db import engine
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, ProgrammingError

def upgrade():
    try:
        with engine.begin() as conn:
            try:
                conn.execute(text("ALTER TABLE personal_documents ADD COLUMN extracted_data JSON"))
                print("Added extracted_data to personal_documents")
            except (OperationalError, ProgrammingError) as e:
                print(f"personal_documents: {e}")
                
            try:
                conn.execute(text("ALTER TABLE business_documents ADD COLUMN extracted_data JSON"))
                print("Added extracted_data to business_documents")
            except (OperationalError, ProgrammingError) as e:
                print(f"business_documents: {e}")
                
        print("Migration complete.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    upgrade()
