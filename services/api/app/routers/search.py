from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.db import get_db
from app.models import PersonalDocument, BusinessDocument, User
from app.auth.security import get_current_user
from app.utils.vector_store import search_documents

router = APIRouter(
    prefix="/api/search",
    tags=["Search"]
)

@router.get("/semantic")
def semantic_search(
    q: str = Query(..., description="The semantic search query"),
    limit: int = Query(5, description="Maximum number of results to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Searches for documents matching the query semantics.
    Returns matched documents across both personal and business tables.
    """
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query string cannot be empty")
        
    # Search the vector database
    results = search_documents(q, current_user.id, limit=limit)
    
    if not results:
        return []
        
    # Fetch full document metadata from DB
    enriched_results = []
    
    for res in results:
        doc_id = res['doc_id']
        doc_type = res['doc_type']
        
        doc = None
        if doc_type == "personal":
            doc = db.query(PersonalDocument).filter(
                PersonalDocument.id == doc_id,
                PersonalDocument.user_id == current_user.id,
                PersonalDocument.deleted_at == None
            ).first()
        elif doc_type == "business":
            doc = db.query(BusinessDocument).filter(
                BusinessDocument.id == doc_id,
                BusinessDocument.user_id == current_user.id,
                BusinessDocument.deleted_at == None
            ).first()
            
        if doc:
            doc_data = {
                "id": doc.id,
                "table": doc_type,
                "original_filename": doc.original_filename,
                "document_type": doc.document_type,
                "uploaded_at": doc.uploaded_at,
                "relevance_score": res['distance']
            }
            enriched_results.append(doc_data)
            
    return enriched_results
