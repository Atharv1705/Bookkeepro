import logging
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, Request, Query
from app.limiter import limiter
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
import os
import requests
from pydantic import BaseModel
from fastapi import HTTPException
from app.models import PersonalDocument, BusinessDocument, User, AuditLog
from app.db import get_db
from app.auth.security import get_current_user, require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])


# ─────────────────────────────────────────────────────────────────────────────
# User: doc status
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/doc-status")
def get_doc_status(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return a consolidated summary of the user's document statuses."""
    personal = (
        db.query(PersonalDocument)
        .filter(PersonalDocument.user_id == current_user.id, PersonalDocument.deleted_at == None)
        .order_by(PersonalDocument.tax_year.desc(), PersonalDocument.uploaded_at.desc())
        .all()
    )
    business = (
        db.query(BusinessDocument)
        .filter(BusinessDocument.user_id == current_user.id, BusinessDocument.deleted_at == None)
        .order_by(BusinessDocument.tax_year.desc(), BusinessDocument.uploaded_at.desc())
        .all()
    )

    personal_list = [
        {"doc_type": d.doc_type, "status": d.review_status, "note": d.review_note,
         "tax_year": d.tax_year, "filename": d.filename}
        for d in personal
    ]
    business_list = [
        {"business_type": d.business_type, "status": d.review_status, "note": d.review_note,
         "tax_year": d.tax_year, "filename": d.filename}
        for d in business
    ]

    all_docs = personal_list + business_list
    summary = {
        "total":    len(all_docs),
        "pending":  sum(1 for d in all_docs if d["status"] == "pending"),
        "approved": sum(1 for d in all_docs if d["status"] == "approved"),
        "rejected": sum(1 for d in all_docs if d["status"] == "rejected"),
    }

    msg_lines = []
    if summary["total"] == 0:
        msg_lines.append("You have not uploaded any documents yet.")
    else:
        msg_lines.append(f"You have uploaded <b>{summary['total']}</b> documents in total.")
        if summary["pending"]:
            msg_lines.append(f"<br>• <b>{summary['pending']}</b> pending review.")
        if summary["approved"]:
            msg_lines.append(f"<br>• <span style='color:var(--success)'><b>{summary['approved']}</b> approved.</span>")
        if summary["rejected"]:
            msg_lines.append(f"<br>• <span style='color:var(--error)'><b>{summary['rejected']}</b> rejected.</span> Please check the upload pages for notes.")

    return {"personal": personal_list, "business": business_list, "summary": summary,
            "message": "".join(msg_lines)}


# ─────────────────────────────────────────────────────────────────────────────
# Admin: system overview stats
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/admin-status")
def get_admin_status(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_admin),
):
    """Return system-wide stats for the admin chatbot."""
    today_start = datetime.combine(date.today(), datetime.min.time())

    total_users      = db.query(User).count()
    new_users_today  = db.query(User).filter(User.created_at >= today_start).count()

    pending_personal = (
        db.query(PersonalDocument)
        .filter(PersonalDocument.review_status == "pending", PersonalDocument.deleted_at == None)
        .count()
    )
    pending_business = (
        db.query(BusinessDocument)
        .filter(BusinessDocument.review_status == "pending", BusinessDocument.deleted_at == None)
        .count()
    )

    # Most recent 10 uploads across both tables
    recent_personal = (
        db.query(PersonalDocument)
        .filter(PersonalDocument.deleted_at == None)
        .order_by(PersonalDocument.uploaded_at.desc())
        .limit(10).all()
    )
    recent_business = (
        db.query(BusinessDocument)
        .filter(BusinessDocument.deleted_at == None)
        .order_by(BusinessDocument.uploaded_at.desc())
        .limit(10).all()
    )

    # Merge and sort to get true top-10 latest
    recent_uploads = sorted(
        [{"user_id": d.user_id, "doc": d.doc_type,   "type": "personal",
          "uploaded_at": d.uploaded_at, "status": d.review_status} for d in recent_personal] +
        [{"user_id": d.user_id, "doc": d.business_type, "type": "business",
          "uploaded_at": d.uploaded_at, "status": d.review_status} for d in recent_business],
        key=lambda x: x["uploaded_at"], reverse=True
    )[:10]

    # Enrich with user names
    user_map = {u.id: u for u in db.query(User).filter(User.id.in_([r["user_id"] for r in recent_uploads])).all()}
    for r in recent_uploads:
        u = user_map.get(r["user_id"])
        r["user_name"]  = u.name  if u else "Unknown"
        r["user_email"] = u.email if u else "Unknown"
        r["uploaded_at"] = r["uploaded_at"].strftime("%Y-%m-%d %H:%M") if r["uploaded_at"] else "N/A"

    message = (
        f"<b>System Overview:</b><br><br>"
        f"• Total Users: <b>{total_users}</b> (<b>{new_users_today}</b> joined today)<br>"
        f"• Pending Personal Docs: <b>{pending_personal}</b><br>"
        f"• Pending Business Docs: <b>{pending_business}</b><br><br>"
    )
    total_pending = pending_personal + pending_business
    if total_pending > 0:
        message += f"You have <b>{total_pending}</b> documents awaiting review."
    else:
        message += "All documents have been reviewed!"

    return {
        "total_users":      total_users,
        "new_users_today":  new_users_today,
        "pending_personal": pending_personal,
        "pending_business": pending_business,
        "total_pending":    total_pending,
        "recent_uploads":   recent_uploads,
        "message":          message,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Admin: rich context for a specific user (activity + docs)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/admin-user-context")
def get_admin_user_context(
    query: str = Query(..., description="User name or email to search for"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_admin),
):
    """Search for a user by name/email and return their full activity context."""
    q = f"%{query}%"
    user = (
        db.query(User)
        .filter(or_(User.name.ilike(q), User.email.ilike(q)))
        .first()
    )
    if not user:
        return {"found": False, "message": f"No user found matching '{query}'."}

    # Docs
    personal = db.query(PersonalDocument).filter(
        PersonalDocument.user_id == user.id, PersonalDocument.deleted_at == None
    ).order_by(PersonalDocument.uploaded_at.desc()).all()

    business = db.query(BusinessDocument).filter(
        BusinessDocument.user_id == user.id, BusinessDocument.deleted_at == None
    ).order_by(BusinessDocument.uploaded_at.desc()).all()

    # Audit log (last 20 actions)
    audit = (
        db.query(AuditLog)
        .filter(AuditLog.user_id == user.id)
        .order_by(AuditLog.created_at.desc())
        .limit(20).all()
    )

    return {
        "found": True,
        "user": {
            "id":    user.id,
            "name":  user.name,
            "email": user.email,
            "role":  user.role.value if hasattr(user.role, "value") else str(user.role),
            "joined": user.created_at.strftime("%Y-%m-%d") if user.created_at else "N/A",
            "engagement_acknowledged": bool(user.engagement_acknowledged_at),
        },
        "documents": {
            "personal": [{"doc_type": d.doc_type, "status": d.review_status,
                          "tax_year": d.tax_year,
                          "uploaded_at": d.uploaded_at.strftime("%Y-%m-%d %H:%M") if d.uploaded_at else "N/A"} for d in personal],
            "business": [{"business_type": d.business_type, "status": d.review_status,
                          "tax_year": d.tax_year,
                          "uploaded_at": d.uploaded_at.strftime("%Y-%m-%d %H:%M") if d.uploaded_at else "N/A"} for d in business],
        },
        "audit_log": [
            {"action": l.action, "detail": l.detail, "ip": l.ip_address,
             "at": l.created_at.strftime("%Y-%m-%d %H:%M") if l.created_at else "N/A"}
            for l in audit
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# Shared chat endpoint
# ─────────────────────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str
    content: str
    reasoning_details: list | None = None

class ChatRequest(BaseModel):
    messages: list[ChatMessage]


def _build_admin_context(db: Session, current_user) -> str:
    """Build a rich real-time context string for the admin system prompt."""
    status = get_admin_status(db=db, current_user=current_user, _=None)

    ctx  = f"=== LIVE SYSTEM DATA (as of {datetime.now().strftime('%Y-%m-%d %H:%M')}) ===\n"
    ctx += f"Total registered users: {status['total_users']}\n"
    ctx += f"New users registered TODAY: {status['new_users_today']}\n"
    ctx += f"Pending personal docs (system-wide): {status['pending_personal']}\n"
    ctx += f"Pending business docs (system-wide): {status['pending_business']}\n"
    ctx += f"Total pending docs: {status['total_pending']}\n\n"

    if status["recent_uploads"]:
        ctx += "=== MOST RECENT DOCUMENT UPLOADS ===\n"
        for r in status["recent_uploads"]:
            ctx += (f"- {r['user_name']} ({r['user_email']}) uploaded a "
                    f"{r['type']} doc '{r['doc']}' on {r['uploaded_at']} "
                    f"[status: {r['status']}]\n")
    return ctx


@router.post("/ask")
@limiter.limit("5/minute")
def ask_chatbot(
    request: Request,
    req: ChatRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenRouter API key not configured")

    is_admin = current_user.role in ("admin", "super_admin")

    if is_admin:
        context = _build_admin_context(db, current_user)

        # Check if the latest user message references a specific user — if so, fetch their data
        last_user_msg = next((m.content for m in reversed(req.messages) if m.role == "user"), "")
        user_context_addon = ""
        if any(kw in last_user_msg.lower() for kw in ["user", "who", "activity", "uploaded", "registered", "recent"]):
            # Try to find a name/email in the message
            words = last_user_msg.replace(",", " ").replace("?", " ").split()
            for word in words:
                if "@" in word or len(word) > 4:
                    result = get_admin_user_context(query=word, db=db, current_user=current_user, _=None)
                    if result.get("found"):
                        u = result["user"]
                        docs = result["documents"]
                        audit = result["audit_log"]
                        user_context_addon = f"\n\n=== USER DETAIL: {u['name']} ({u['email']}) ===\n"
                        user_context_addon += f"Role: {u['role']} | Joined: {u['joined']} | Engagement acknowledged: {u['engagement_acknowledged']}\n"
                        if docs["personal"]:
                            user_context_addon += "Personal docs: " + "; ".join(
                                f"{d['doc_type']} ({d['tax_year']}) [{d['status']}] uploaded {d['uploaded_at']}"
                                for d in docs["personal"]) + "\n"
                        if docs["business"]:
                            user_context_addon += "Business docs: " + "; ".join(
                                f"{d['business_type']} ({d['tax_year']}) [{d['status']}] uploaded {d['uploaded_at']}"
                                for d in docs["business"]) + "\n"
                        if audit:
                            user_context_addon += "Recent activity:\n" + "\n".join(
                                f"  [{a['at']}] {a['action']} — {a['detail'] or ''} (IP: {a['ip'] or 'N/A'})"
                                for a in audit[:10]) + "\n"
                        break

        system_prompt = (
            "You are the BookKeepPro Admin Assistant — a knowledgeable, concise AI that has live access to the system's data.\n\n"
            "CAPABILITIES:\n"
            "- You can answer questions about which users uploaded documents and when.\n"
            "- You can report how many new users registered today or on any date.\n"
            "- You can show recent activity and document history for any specific user.\n"
            "- You can answer questions about document review status system-wide.\n\n"
            "RULES:\n"
            "- Only answer questions related to BookKeepPro administration, accounting, or taxes.\n"
            "- Use the live data below to answer. Do NOT make up user names, counts, or dates.\n"
            "- Be concise and direct. Format answers clearly.\n\n"
            f"{context}{user_context_addon}"
        )
    else:
        doc_status = get_doc_status(db=db, current_user=current_user)
        summary = doc_status["summary"]
        context  = f"Total Documents: {summary['total']}\nPending: {summary['pending']}\nApproved: {summary['approved']}\nRejected: {summary['rejected']}\n"

        if doc_status["personal"]:
            context += "\nPersonal Documents:\n"
            for d in doc_status["personal"]:
                note = f" — Admin note: {d['note']}" if d['note'] else ""
                context += f"  • {d['doc_type']} ({d['tax_year']}): {d['status']}{note}\n"
        if doc_status["business"]:
            context += "\nBusiness Documents:\n"
            for d in doc_status["business"]:
                note = f" — Admin note: {d['note']}" if d['note'] else ""
                context += f"  • {d['business_type']} ({d['tax_year']}): {d['status']}{note}\n"

        system_prompt = (
            "You are the BookKeepPro Assistant. Help users with this application and basic accounting/tax questions.\n\n"
            "APPLICATION FLOW:\n"
            "- Upload documents: Dashboard → Personal Upload or Business Upload page → drag & drop or click to browse.\n"
            "- Check status: Documents show Pending (waiting for admin), Approved, or Rejected.\n"
            "- If rejected: see the admin's note on the upload page and re-upload a corrected version.\n"
            "- Profile: update your name, phone, or password on the Profile page.\n\n"
            "RULES:\n"
            "- Only answer questions about BookKeepPro, accounting, or taxes.\n"
            "- Use the live data below to answer questions about the user's documents.\n\n"
            f"=== LIVE DATA for {current_user.name or current_user.email} ===\n{context}"
        )

    messages = [{"role": "system", "content": system_prompt}]
    for m in req.messages:
        messages.append({"role": m.role, "content": m.content})

    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": "meta-llama/llama-3.3-70b-instruct", "messages": messages},
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()

        if "error" in data:
            logger.error(f"OpenRouter error: {data['error']}")
            raise HTTPException(status_code=502, detail="AI service overloaded. Please try again.")
        if "choices" not in data:
            raise HTTPException(status_code=502, detail="Unexpected AI response. Please try again.")

        return data["choices"][0]["message"]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OpenRouter API error: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to AI service")
