import os
from datetime import date, timedelta
import logging
from fastapi import APIRouter, Depends, HTTPException
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
