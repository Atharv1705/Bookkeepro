import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.models import PersonalDocument, BusinessDocument, User
from app.db import get_db
from app.auth.security import get_current_user, require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])


@router.get("/doc-status")
def get_doc_status(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return a consolidated summary of the user's document statuses."""

    personal = (
        db.query(PersonalDocument)
        .filter(
            PersonalDocument.user_id == current_user.id,
            PersonalDocument.deleted_at == None,
        )
        .order_by(PersonalDocument.tax_year.desc(), PersonalDocument.uploaded_at.desc())
        .all()
    )

    business = (
        db.query(BusinessDocument)
        .filter(
            BusinessDocument.user_id == current_user.id,
            BusinessDocument.deleted_at == None,
        )
        .order_by(BusinessDocument.tax_year.desc(), BusinessDocument.uploaded_at.desc())
        .all()
    )

    personal_list = [
        {
            "doc_type": d.doc_type,
            "status": d.review_status,
            "note": d.review_note,
            "tax_year": d.tax_year,
            "filename": d.filename,
        }
        for d in personal
    ]

    business_list = [
        {
            "business_type": d.business_type,
            "status": d.review_status,
            "note": d.review_note,
            "tax_year": d.tax_year,
            "filename": d.filename,
        }
        for d in business
    ]

    all_docs = personal_list + business_list
    summary = {
        "total": len(all_docs),
        "pending": sum(1 for d in all_docs if d["status"] == "pending"),
        "approved": sum(1 for d in all_docs if d["status"] == "approved"),
        "rejected": sum(1 for d in all_docs if d["status"] == "rejected"),
    }

    return {
        "personal": personal_list,
        "business": business_list,
        "summary": summary,
    }

@router.get("/admin-status")
def get_admin_status(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_admin),
):
    """Return system-wide stats for the super admin chatbot."""
    total_users = db.query(User).count()

    pending_personal = (
        db.query(PersonalDocument)
        .filter(
            PersonalDocument.review_status == "pending",
            PersonalDocument.deleted_at == None,
        )
        .count()
    )

    pending_business = (
        db.query(BusinessDocument)
        .filter(
            BusinessDocument.review_status == "pending",
            BusinessDocument.deleted_at == None,
        )
        .count()
    )

    return {
        "total_users": total_users,
        "pending_personal": pending_personal,
        "pending_business": pending_business,
        "total_pending": pending_personal + pending_business,
    }
