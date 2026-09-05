import os
import sys
import asyncio

# Append current dir to path to allow importing app modules
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models import PersonalDocument, BusinessDocument, AdminDocument
from app.utils.vector_store import add_document_embedding
import json

async def backfill():
    print("Starting vector store backfill for existing documents...")
    db: Session = SessionLocal()
    
    try:
        # 1. Backfill Personal Documents
        personal_docs = db.query(PersonalDocument).filter(PersonalDocument.extracted_data != None).all()
        print(f"Found {len(personal_docs)} personal documents with extracted data.")
        for doc in personal_docs:
            if isinstance(doc.extracted_data, str):
                try:
                    data = json.loads(doc.extracted_data)
                except:
                    data = {"raw": doc.extracted_data}
            else:
                data = doc.extracted_data
                
            text = f"personal_document ({doc.tax_year}): {json.dumps(data)}"
            add_document_embedding(
                doc_id=doc.id,
                doc_type="personal",
                user_id=doc.user_id,
                text=text
            )
            print(f"  [OK] Indexed PersonalDoc {doc.id}")

        # 2. Backfill Business Documents
        business_docs = db.query(BusinessDocument).filter(BusinessDocument.extracted_data != None).all()
        print(f"\nFound {len(business_docs)} business documents with extracted data.")
        for doc in business_docs:
            if isinstance(doc.extracted_data, str):
                try:
                    data = json.loads(doc.extracted_data)
                except:
                    data = {"raw": doc.extracted_data}
            else:
                data = doc.extracted_data
                
            text = f"business_document ({doc.tax_year}): {json.dumps(data)}"
            add_document_embedding(
                doc_id=doc.id,
                doc_type="business",
                user_id=doc.user_id,
                text=text
            )
            print(f"  [OK] Indexed BusinessDoc {doc.id}")

        # 3. Backfill Admin Documents (AI Summaries)
        admin_docs = db.query(AdminDocument).filter(AdminDocument.ai_summary != None).all()
        print(f"\nFound {len(admin_docs)} admin documents with AI summaries.")
        for doc in admin_docs:
            add_document_embedding(
                doc_id=doc.id,
                doc_type="admin",
                user_id=doc.user_id,
                text=f"{doc.doc_label}: {doc.ai_summary}"
            )
            print(f"  [OK] Indexed AdminDoc {doc.id}")
            
        print("\nBackfill complete! All existing data is now searchable by the AI.")
        
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(backfill())
