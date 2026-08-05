"""
Re-run AI extraction for all documents (or only NULL ones).
Run from: services/api/

  python backfill_extraction.py          # only missing extractions
  python backfill_extraction.py --all    # re-extract everything with Qwen
"""
import sys, os, argparse
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

from app.db import SessionLocal
from app.models import PersonalDocument, BusinessDocument
from app.utils.ai import extract_document_data
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--all", action="store_true", help="Re-extract all docs, not just missing ones")
args = parser.parse_args()

BASE_DIR = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BASE_DIR / "uploads"

db = SessionLocal()

def backfill(model_class, table_name, doc_type_field):
    query = db.query(model_class).filter(model_class.deleted_at == None)
    if not args.all:
        query = query.filter(model_class.extracted_data == None)
    docs = query.all()

    label = "all" if args.all else "missing"
    print(f"\n[{table_name}] Found {len(docs)} {label} docs to process")

    for doc in docs:
        file_path = str(UPLOAD_DIR / doc.storage_key)
        doc_type = getattr(doc, doc_type_field)
        print(f"  → id={doc.id} type={doc_type[:40]} file={doc.storage_key[:20]}...")
        if not os.path.exists(file_path):
            print(f"     ⚠  File not found on disk, skipping")
            continue
        result = extract_document_data(file_path, doc_type)
        if result is not None:
            doc.extracted_data = result  # store {} as-is — empty means blank template, not failure
            db.commit()
            print(f"     ✓  Extracted {len(result)} fields: {list(result.keys())}")
        else:
            print(f"     ✗  Extraction failed (unsupported type, blank doc, or API error)")

backfill(PersonalDocument, "personal_documents", "doc_type")
backfill(BusinessDocument, "business_documents", "business_type")

db.close()
print("\nDone.")
