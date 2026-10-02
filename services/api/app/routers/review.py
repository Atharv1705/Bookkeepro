import os
from datetime import date, timedelta
import logging
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models import AdminDocument, User, UserRole, FilingDeadline
from app.db import get_db
from app.utils.emailer import send_email
from app import crud
from app.auth.security import get_current_user, require_admin
from app.schemas import SubmitReviewRequest, NotifyUserRequest, AdminDocResponseRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/review", tags=["review"])

DASHBOARD_LINK = f"{os.getenv('FRONTEND_URL', 'https://aiindiacpa.duckdns.org')}/dashboard"


# ─────────────────────────────────────────────
# Admin submits user documents for review
# ─────────────────────────────────────────────

@router.post("/submit")
async def submit_review(
    payload: SubmitReviewRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_admin),
):
    """Notify the user their documents have been submitted for review. Admin only."""
    user = crud.get_user_by_id(db, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    email_sent = await send_email(
        to=user.email,
        subject="Documents Ready for Review — BookKeepro",
        body=f"""
        <p>Dear {user.name or "Sir/Ma'am"},</p>
        <p>Your documents have been successfully submitted and are pending review.</p>
        <p>
          <a href="{DASHBOARD_LINK}"
             style="color:#0077c8;font-weight:600;text-decoration:none;">
            👉 Go to Dashboard
          </a>
        </p>
        <p style="margin-top:20px;">Kind regards,<br><strong>BookKeepro Team</strong></p>
        """
    )

    logger.info(f"Admin {current_user.id} submitted review for user {payload.user_id}")
    return {"status": "submitted", "email_sent": email_sent}


# ─────────────────────────────────────────────
# Admin sends approval / rejection notification
# ─────────────────────────────────────────────

@router.post("/notify-user")
async def notify_user_review(
    payload: NotifyUserRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_admin),
):
    """Send document review result (approved/rejected + timeline) to the user. Admin only."""
    user = crud.get_user_by_id(db, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    approved_html = "".join(f"<li>{item}</li>" for item in payload.approved) or "<li>None</li>"
    rejected_html = "".join(f"<li>{item}</li>" for item in payload.rejected) or "<li>None</li>"

    body = f"""
    <p>Dear {user.name or "Sir/Ma'am"},</p>
    <p>Your uploaded documents have been reviewed.</p>

    <p><strong>Approved Documents</strong></p>
    <ul>{approved_html}</ul>

    <p><strong>Rejected Documents</strong></p>
    <ul>{rejected_html}</ul>

    <p><strong>Estimated Filing Timeline:</strong></p>
    <ul>
      <li>Personal Documents: {payload.personal_timeline} days</li>
      <li>Business Documents: {payload.business_timeline} days</li>
    </ul>

    <p>Kind regards,<br><strong>BookKeepro Team</strong></p>
    """

    await send_email(to=user.email, subject="Document Review Update — BookKeepro", body=body)
    logger.info(f"Admin {current_user.id} sent review notification to user {payload.user_id}")

    # Save / reset filing deadlines if timelines were provided
    today = date.today()
    for doc_type, days in [("personal", payload.personal_timeline), ("business", payload.business_timeline)]:
        if days and days > 0:
            existing = db.query(FilingDeadline).filter(
                FilingDeadline.user_id == payload.user_id,
                FilingDeadline.doc_type == doc_type,
            ).first()
            if existing:
                # Reset the deadline and clear reminder flags
                existing.deadline_date = today + timedelta(days=days)
                existing.days_given = days
                existing.notified_7d = False
                existing.notified_1d = False
            else:
                db.add(FilingDeadline(
                    user_id=payload.user_id,
                    doc_type=doc_type,
                    deadline_date=today + timedelta(days=days),
                    days_given=days,
                ))
    db.commit()

    return {"status": "notified"}


# ─────────────────────────────────────────────
# User responds to an admin-uploaded return
# ─────────────────────────────────────────────

@router.post("/admin-doc-response")
async def admin_doc_response(
    payload: AdminDocResponseRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """User approves or rejects an admin-uploaded document. Users only."""
    if current_user.role != UserRole.user:
        raise HTTPException(status_code=403, detail="Users only")

    doc = db.query(AdminDocument).filter_by(id=payload.doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Verify this doc belongs to the current user
    if doc.user_id != current_user.id:
        logger.warning(
            f"User {current_user.id} tried to respond to doc {payload.doc_id} "
            f"belonging to user {doc.user_id}"
        )
        raise HTTPException(status_code=403, detail="Not authorized")
        
    doc.review_status = payload.status
    if payload.reason:
        doc.review_note = payload.reason
    db.commit()
    
    from app.models import DocumentReviewEvent
    event = DocumentReviewEvent(
        doc_kind="admin",
        doc_id=doc.id,
        owner_user_id=doc.user_id,
        actor_id=current_user.id,
        actor_role="user",
        action=payload.status,
        to_status=payload.status,
        comment=payload.reason,
        tax_year=doc.tax_year
    )
    db.add(event)
    db.commit()

    admin = db.query(User).filter_by(id=doc.uploaded_by).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    body = f"""
    <p>Dear Admin,</p>
    <p>User <b>{current_user.email}</b> has <b>{payload.status.upper()}</b> the document:</p>
    <p><b>{doc.doc_label}</b></p>
    """
    if payload.status == "rejected" and payload.reason:
        body += f"<p><strong>Reason:</strong></p><p>{payload.reason}</p>"

    body += "<p style='margin-top:20px;'>BookKeepro System</p>"

    await send_email(
        to=admin.email,
        subject=f"Admin Return Status {payload.status.capitalize()} — BookKeepro",
        body=body,
    )

    logger.info(f"User {current_user.id} {payload.status} admin doc {payload.doc_id}")
    return {"status": "notified"}
    
# ─────────────────────────────────────────────
# Update Status and History
# ─────────────────────────────────────────────

@router.get("/history/{doc_kind}/{doc_id}")
def get_document_review_history(
    doc_kind: str,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from app.models import DocumentReviewEvent
    events = db.query(DocumentReviewEvent).filter_by(
        doc_kind=doc_kind,
        doc_id=doc_id
    ).order_by(DocumentReviewEvent.created_at.asc()).all()
    
    # If standard user, verify ownership
    if current_user.role == UserRole.user:
        if not events or events[0].owner_user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized")
            
    return {
        "history": [
            {
                "id": e.id,
                "actor_role": e.actor_role,
                "action": e.action,
                "to_status": e.to_status,
                "note": e.comment,
                "created_at": e.created_at.isoformat() + "Z" if e.created_at else None
            } for e in events
        ]
    }

from pydantic import BaseModel
class StatusUpdateRequest(BaseModel):
    status: str
    note: str | None = None

@router.put("/status/{doc_kind}/{doc_id}")
def update_document_status(
    doc_kind: str,
    doc_id: int,
    payload: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    from app.models import PersonalDocument, BusinessDocument, DocumentReviewEvent
    model_map = {
        'admin': AdminDocument,
        'personal': PersonalDocument,
        'business': BusinessDocument
    }
    if doc_kind not in model_map:
        raise HTTPException(status_code=400, detail="Invalid doc_kind")
        
    doc = db.query(model_map[doc_kind]).filter_by(id=doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    doc.review_status = payload.status
    if payload.note is not None:
        doc.review_note = payload.note
    if payload.status == 'approved':
        from datetime import datetime
        doc.reviewed_at = datetime.utcnow()
        
    db.commit()
    
    event = DocumentReviewEvent(
        doc_kind=doc_kind,
        doc_id=doc.id,
        owner_user_id=doc.user_id,
        actor_id=current_user.id,
        actor_role="admin",
        action="status_updated",
        to_status=payload.status,
        comment=payload.note,
        tax_year=doc.tax_year
    )
    db.add(event)
    db.commit()
    
    return {"status": "ok", "review_status": doc.review_status}

# ─────────────────────────────────────────────
# Get filing deadlines for a user
# ─────────────────────────────────────────────

@router.get("/deadlines/{user_id}")
def get_filing_deadlines(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_admin),
):
    from app.models import FilingDeadline
    deadlines = db.query(FilingDeadline).filter(FilingDeadline.user_id == user_id).all()
    today = date.today()
    result = []
    for dl in deadlines:
        days_left = (dl.deadline_date - today).days
        result.append({
            "doc_type": dl.doc_type,
            "deadline_date": dl.deadline_date.isoformat(),
            "days_given": dl.days_given,
            "days_left": days_left,
            "is_overdue": days_left < 0,
        })
    return result


# ─────────────────────────────────────────────
# Gap #1: Admin sends a return to client for approval
# ─────────────────────────────────────────────

class SendReturnRequest(BaseModel if False else object):
    pass

from pydantic import BaseModel as _BM

class SendReturnPayload(_BM):
    doc_id: int
    note: str = ""


@router.post("/send-return-for-approval")
async def send_return_for_approval(
    payload: SendReturnPayload,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_admin),
):
    """Admin marks an admin doc as 'sent_for_approval' and emails the client. Admin only."""
    doc = db.query(AdminDocument).filter_by(id=payload.doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.review_status = "sent_for_approval"
    if payload.note:
        doc.review_note = payload.note
    db.commit()

    crud.log_action(
        db, "sent_return_for_approval",
        user_id=current_user.id,
        target=f"admin_doc:{doc.id}",
        detail=f"client:{doc.user_id}",
    )

    from app.models import DocumentReviewEvent
    event = DocumentReviewEvent(
        doc_kind="admin",
        doc_id=doc.id,
        owner_user_id=doc.user_id,
        actor_id=current_user.id,
        actor_role="admin",
        action="sent_for_approval",
        from_status="pending",
        to_status="sent_for_approval",
        comment=payload.note or None,
        tax_year=doc.tax_year,
    )
    db.add(event)
    db.commit()

    client = db.query(User).filter_by(id=doc.user_id).first()
    if client:
        note_html = f"<p><em>{payload.note}</em></p>" if payload.note else ""
        background.add_task(
            send_email,
            to=client.email,
            subject="Action Required: Please Review Your Tax Return — BookKeepro",
            body=f"""
            <p>Dear {client.name or 'Client'},</p>
            <p>Your tax professional has prepared a document for your review:</p>
            <p><strong>{doc.doc_label}</strong> (Tax Year {doc.tax_year or 'N/A'})</p>
            {note_html}
            <p>Please log in to your dashboard to review, approve, or request changes.</p>
            <p><a href='{DASHBOARD_LINK}' style='color:#2c7a5b;font-weight:600;font-size:15px;'>Review Now →</a></p>
            <p style='margin-top:20px;'>Kind regards,<br><strong>BookKeepro Team</strong></p>
            """,
        )

    return {"status": "sent", "doc_id": doc.id, "review_status": doc.review_status}


# ─────────────────────────────────────────────
# Gap #5: Mark a user's filing as fully filed/locked
# ─────────────────────────────────────────────

class MarkFiledPayload(_BM):
    user_id: int
    tax_year: int
    note: str = ""


@router.post("/mark-filed")
async def mark_filing_complete(
    payload: MarkFiledPayload,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_admin),
):
    """Admin marks all approved docs for a user/year as 'filed'. Sends confirmation email."""
    from app.models import PersonalDocument, BusinessDocument

    personal_docs = db.query(PersonalDocument).filter(
        PersonalDocument.user_id == payload.user_id,
        PersonalDocument.tax_year == payload.tax_year,
        PersonalDocument.deleted_at == None,
        PersonalDocument.review_status == "approved",
    ).all()
    business_docs = db.query(BusinessDocument).filter(
        BusinessDocument.user_id == payload.user_id,
        BusinessDocument.tax_year == payload.tax_year,
        BusinessDocument.deleted_at == None,
        BusinessDocument.review_status == "approved",
    ).all()

    for doc in personal_docs:
        doc.review_status = "filed"
    for doc in business_docs:
        doc.review_status = "filed"
    db.commit()

    crud.log_action(
        db, "filing_complete",
        user_id=current_user.id,
        target=f"user:{payload.user_id}",
        detail=f"tax_year:{payload.tax_year} personal:{len(personal_docs)} business:{len(business_docs)}",
    )

    client = crud.get_user_by_id(db, payload.user_id)
    if client:
        note_html = f"<p><em>{payload.note}</em></p>" if payload.note else ""
        background.add_task(
            send_email,
            to=client.email,
            subject=f"Your {payload.tax_year} Tax Return Has Been Filed — BookKeepro",
            body=f"""
            <p>Dear {client.name or 'Client'},</p>
            <p>Great news! Your <strong>{payload.tax_year}</strong> tax return has been successfully filed.</p>
            <p>Total documents filed: {len(personal_docs) + len(business_docs)}</p>
            {note_html}
            <p>You can view the status in your dashboard at any time.</p>
            <p><a href='{DASHBOARD_LINK}' style='color:#2c7a5b;font-weight:600;'>Go to Dashboard →</a></p>
            <p style='margin-top:20px;'>Thank you for choosing BookKeepro.<br><strong>BookKeepro Team</strong></p>
            """,
        )

    return {
        "status": "filed",
        "user_id": payload.user_id,
        "tax_year": payload.tax_year,
        "personal_filed": len(personal_docs),
        "business_filed": len(business_docs),
    }
