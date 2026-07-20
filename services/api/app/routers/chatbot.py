import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import os
import requests
from pydantic import BaseModel
from fastapi import HTTPException
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

    msg_lines = []
    if summary["total"] == 0:
        msg_lines.append("You have not uploaded any documents yet.")
    else:
        msg_lines.append(f"You have uploaded <b>{summary['total']}</b> documents in total.")
        if summary["pending"] > 0:
            msg_lines.append(f"<br>• <b>{summary['pending']}</b> pending review.")
        if summary["approved"] > 0:
            msg_lines.append(f"<br>• <span style='color:var(--success)'><b>{summary['approved']}</b> approved.</span>")
        if summary["rejected"] > 0:
            msg_lines.append(f"<br>• <span style='color:var(--error)'><b>{summary['rejected']}</b> rejected.</span> Please check the upload pages for notes.")

    return {
        "personal": personal_list,
        "business": business_list,
        "summary": summary,
        "message": "".join(msg_lines),
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

    message = (
        f"<b>System Overview:</b><br><br>"
        f"• Total Users: <b>{total_users}</b><br>"
        f"• Pending Personal Docs: <b>{pending_personal}</b><br>"
        f"• Pending Business Docs: <b>{pending_business}</b><br><br>"
    )
    if pending_personal + pending_business > 0:
        message += f"You have <b>{pending_personal + pending_business}</b> documents awaiting review in the Dashboard."
    else:
        message += "All documents have been reviewed!"

    return {
        "total_users": total_users,
        "pending_personal": pending_personal,
        "pending_business": pending_business,
        "total_pending": pending_personal + pending_business,
        "message": message,
    }


class ChatMessage(BaseModel):
    role: str
    content: str
    reasoning_details: list | None = None

class ChatRequest(BaseModel):
    messages: list[ChatMessage]

@router.post("/ask")
def ask_chatbot(
    req: ChatRequest,
    current_user=Depends(get_current_user)
):
    """Send a message to OpenRouter AI."""
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenRouter API key not configured")

    is_admin = current_user.role in ("admin", "super_admin")

    system_prompt = ""
    if is_admin:
        system_prompt = (
            "You are the BookKeepPro Admin Assistant. Your ONLY job is to help admins with this specific application's internal processes. "
            "IMPORTANT: Do NOT make up URLs, generic advice, or flows. Answer ONLY based on this application's actual flow:\n"
            "- How to view users: On the Admin Dashboard, click any user in the table to go to their Admin User Detail page.\n"
            "- How to review/approve docs: On the Admin User Detail page, you will see their uploaded documents. Click a document to download/view it, change its status to 'Approved' or 'Rejected', add an optional review note, and click 'Submit Review'.\n"
            "- If a doc is rejected: The user is notified and must re-upload it.\n"
            "Rule: You must ONLY answer questions related to system administration, BookKeepPro, accounting, or taxes. If the admin asks about anything else, politely decline."
        )
    else:
        system_prompt = (
            "You are the BookKeepPro Assistant. Your ONLY job is to help users navigate this specific application's features and answer basic accounting/tax questions. "
            "IMPORTANT: Do NOT make up URLs (like portal.bookkeeppro.com) or generic advice. Answer ONLY based on this application's actual flow:\n"
            "- How to upload documents: On your Dashboard, find the 'Required Documents' section. Click on a document slot (e.g., Personal or Business) to go to the Upload page. Drag and drop your file (PDF, JPG, PNG, DOCX) or click to browse, then click 'Upload Document'.\n"
            "- How to check doc status: Look at your Dashboard under 'Required Documents'. It will show 'Pending' (waiting for admin), 'Approved', or 'Rejected'.\n"
            "- If rejected: Click the rejected document slot again to see the admin's note and upload a new version.\n"
            "Rule: You must ONLY answer questions related to BookKeepPro, accounting, or taxes. If the user asks about anything else, politely decline."
        )

    messages = [{"role": "system", "content": system_prompt}]
    
    for m in req.messages:
        msg = {"role": m.role, "content": m.content}
        if m.reasoning_details:
            msg["reasoning_details"] = m.reasoning_details
        messages.append(msg)

    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "nvidia/nemotron-3-super-120b-a12b:free",
                "messages": messages,
                "reasoning": {"enabled": True}
            },
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        
        if "error" in data:
            logger.error(f"OpenRouter returned an error payload: {data['error']}")
            raise HTTPException(status_code=502, detail="AI Service is currently overloaded. Please try again.")
            
        if "choices" not in data:
            logger.error(f"OpenRouter returned unexpected payload: {data}")
            raise HTTPException(status_code=502, detail="Unexpected response from AI service. Please try again.")
            
        return data['choices'][0]['message']
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OpenRouter API error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to connect to AI service")
