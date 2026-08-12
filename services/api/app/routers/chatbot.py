import logging
import json
from datetime import datetime, date
from fastapi import APIRouter, Depends, Request, Query
from fastapi.responses import StreamingResponse
from app.limiter import limiter
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
import os
import requests
from pydantic import BaseModel, field_validator
from fastapi import HTTPException
from app.models import PersonalDocument, BusinessDocument, User, AuditLog
from app.db import get_db
from app.auth.security import get_current_user, require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])

CHAT_MODEL = os.getenv("CHAT_MODEL", "meta-llama/llama-3.3-70b-instruct")


# ─────────────────────────────────────────────────────────────────────────────
# User: doc status (also includes extracted data so user can ask about fields)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/doc-status")
def get_doc_status(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
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
         "tax_year": d.tax_year, "filename": d.filename,
         # Include extracted data summary so chatbot can answer field-level questions
         "extracted_summary": _summarize_extracted(d.extracted_data)}
        for d in personal
    ]
    business_list = [
        {"business_type": d.business_type, "status": d.review_status, "note": d.review_note,
         "tax_year": d.tax_year, "filename": d.filename,
         "extracted_summary": _summarize_extracted(d.extracted_data)}
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


def _summarize_extracted(extracted_data: dict | None) -> str:
    """Convert extracted_data dict to a compact string for chatbot context."""
    if not extracted_data:
        return ""
    skip = {"_meta", "status"}
    parts = []
    for k, v in extracted_data.items():
        if k in skip or v is None:
            continue
        if isinstance(v, list):
            parts.append(f"{k}: {', '.join(str(i) for i in v[:3])}")
        else:
            parts.append(f"{k}: {v}")
    return " | ".join(parts[:8])  # cap at 8 fields to keep context small


# ─────────────────────────────────────────────────────────────────────────────
# Admin: system overview stats
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/admin-status")
def get_admin_status(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_admin),
):
    today_start = datetime.combine(date.today(), datetime.min.time())
    total_users     = db.query(User).count()
    new_users_today = db.query(User).filter(User.created_at >= today_start).count()
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

    recent_personal = (
        db.query(PersonalDocument).filter(PersonalDocument.deleted_at == None)
        .order_by(PersonalDocument.uploaded_at.desc()).limit(10).all()
    )
    recent_business = (
        db.query(BusinessDocument).filter(BusinessDocument.deleted_at == None)
        .order_by(BusinessDocument.uploaded_at.desc()).limit(10).all()
    )
    recent_uploads = sorted(
        [{"user_id": d.user_id, "doc": d.doc_type,       "type": "personal",
          "uploaded_at": d.uploaded_at, "status": d.review_status} for d in recent_personal] +
        [{"user_id": d.user_id, "doc": d.business_type,  "type": "business",
          "uploaded_at": d.uploaded_at, "status": d.review_status} for d in recent_business],
        key=lambda x: x["uploaded_at"], reverse=True
    )[:10]

    user_map = {u.id: u for u in db.query(User).filter(User.id.in_([r["user_id"] for r in recent_uploads])).all()}
    for r in recent_uploads:
        u = user_map.get(r["user_id"])
        r["user_name"]   = u.name  if u else "Unknown"
        r["user_email"]  = u.email if u else "Unknown"
        r["uploaded_at"] = r["uploaded_at"].strftime("%Y-%m-%d %H:%M") if r["uploaded_at"] else "N/A"

    total_pending = pending_personal + pending_business
    message = (
        f"<b>System Overview:</b><br><br>"
        f"• Total Users: <b>{total_users}</b> (<b>{new_users_today}</b> joined today)<br>"
        f"• Pending Personal Docs: <b>{pending_personal}</b><br>"
        f"• Pending Business Docs: <b>{pending_business}</b><br><br>"
        + (f"You have <b>{total_pending}</b> documents awaiting review." if total_pending > 0
           else "All documents have been reviewed!")
    )

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
# Admin: daily digest (new)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/daily-digest")
def get_daily_digest(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_admin),
):
    """Generate an AI plain-English summary of today's activity."""
    from app.utils.doc_intelligence import build_daily_digest
    stats = get_admin_status(db=db, current_user=current_user, _=None)
    digest_html = build_daily_digest(stats)
    return {"digest": digest_html, "generated_at": datetime.now().isoformat()}


# ─────────────────────────────────────────────────────────────────────────────
# Admin: user context lookup
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/admin-user-context")
def get_admin_user_context(
    query: str = Query(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_admin),
):
    q = f"%{query}%"
    user = db.query(User).filter(or_(User.name.ilike(q), User.email.ilike(q))).first()
    if not user:
        return {"found": False, "message": f"No user found matching '{query}'."}

    personal = db.query(PersonalDocument).filter(
        PersonalDocument.user_id == user.id, PersonalDocument.deleted_at == None
    ).order_by(PersonalDocument.uploaded_at.desc()).all()
    business = db.query(BusinessDocument).filter(
        BusinessDocument.user_id == user.id, BusinessDocument.deleted_at == None
    ).order_by(BusinessDocument.uploaded_at.desc()).all()
    audit = db.query(AuditLog).filter(AuditLog.user_id == user.id).order_by(AuditLog.created_at.desc()).limit(20).all()

    return {
        "found": True,
        "user": {
            "id": user.id, "name": user.name, "email": user.email,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "joined": user.created_at.strftime("%Y-%m-%d") if user.created_at else "N/A",
            "engagement_acknowledged": bool(user.engagement_acknowledged_at),
        },
        "documents": {
            "personal": [{"doc_type": d.doc_type, "status": d.review_status, "tax_year": d.tax_year,
                           "uploaded_at": d.uploaded_at.strftime("%Y-%m-%d %H:%M") if d.uploaded_at else "N/A"} for d in personal],
            "business": [{"business_type": d.business_type, "status": d.review_status, "tax_year": d.tax_year,
                           "uploaded_at": d.uploaded_at.strftime("%Y-%m-%d %H:%M") if d.uploaded_at else "N/A"} for d in business],
        },
        "audit_log": [
            {"action": l.action, "detail": l.detail, "ip": l.ip_address,
             "at": l.created_at.strftime("%Y-%m-%d %H:%M") if l.created_at else "N/A"}
            for l in audit
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# Admin: bulk action executor (approve/reject all docs for a user)
# Requires explicit confirm=true to execute — safety gate
# ─────────────────────────────────────────────────────────────────────────────
class BulkActionRequest(BaseModel):
    user_id: int
    action:  str   # "approve_personal" | "approve_business" | "reject_personal" | "reject_business"
    confirm: bool  # must be True to execute — prevents accidental execution

@router.post("/admin-bulk-action")
def admin_bulk_action(
    payload: BulkActionRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_admin),
):
    """
    Execute a bulk approve/reject action on all pending docs for a user.
    Requires confirm=true — the frontend must show a confirmation dialog first.
    """
    if not payload.confirm:
        return {"status": "pending_confirm",
                "message": "Action not executed. Set confirm=true to proceed."}

    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    action_parts = payload.action.split("_")  # e.g. ["approve", "personal"]
    if len(action_parts) != 2 or action_parts[0] not in ("approve", "reject") \
            or action_parts[1] not in ("personal", "business"):
        raise HTTPException(status_code=400, detail="Invalid action. Use approve_personal, reject_personal, approve_business, or reject_business.")

    verb, doc_type = action_parts
    new_status = "approved" if verb == "approve" else "rejected"
    model_class = PersonalDocument if doc_type == "personal" else BusinessDocument

    docs = db.query(model_class).filter(
        model_class.user_id      == payload.user_id,
        model_class.review_status == "pending",
        model_class.deleted_at   == None,
    ).all()

    count = 0
    for doc in docs:
        doc.review_status = new_status
        count += 1

    db.commit()
    logger.info(f"Admin {current_user.id} bulk {new_status} {count} {doc_type} docs for user {payload.user_id}")

    return {
        "status":  "executed",
        "action":  payload.action,
        "count":   count,
        "message": f"{count} {doc_type} document(s) marked as {new_status}.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Shared chat — streaming (new) + conversation memory via messages[]
# ─────────────────────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str
    content: str
    reasoning_details: list | None = None

    @field_validator("content")
    @classmethod
    def cap_content(cls, v: str) -> str:
        if len(v) > 4000:
            raise ValueError("Message must be 4000 characters or fewer")
        return v

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    stream: bool = False  # client opts into streaming


def _build_admin_context(db: Session, current_user) -> str:
    status = get_admin_status(db=db, current_user=current_user, _=None)
    ctx  = f"=== LIVE SYSTEM DATA (as of {datetime.now().strftime('%Y-%m-%d %H:%M')}) ===\n"
    ctx += f"Total registered users: {status['total_users']}\n"
    ctx += f"New users registered TODAY: {status['new_users_today']}\n"
    ctx += f"Pending personal docs: {status['pending_personal']}\n"
    ctx += f"Pending business docs: {status['pending_business']}\n"
    ctx += f"Total pending docs: {status['total_pending']}\n\n"
    if status["recent_uploads"]:
        ctx += "=== MOST RECENT UPLOADS ===\n"
        for r in status["recent_uploads"]:
            ctx += (f"- {r['user_name']} ({r['user_email']}) uploaded {r['type']} "
                    f"'{r['doc']}' on {r['uploaded_at']} [{r['status']}]\n")
    return ctx


@router.post("/ask")
@limiter.limit("10/minute")
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

        last_user_msg = next((m.content for m in reversed(req.messages) if m.role == "user"), "")
        user_context_addon = ""
        if any(kw in last_user_msg.lower() for kw in ["user", "who", "activity", "uploaded", "registered", "recent"]):
            words = last_user_msg.replace(",", " ").replace("?", " ").split()
            for word in words:
                if "@" in word or len(word) > 4:
                    result = get_admin_user_context(query=word, db=db, current_user=current_user, _=None)
                    if result.get("found"):
                        u = result["user"]
                        docs = result["documents"]
                        audit = result["audit_log"]
                        user_context_addon = f"\n\n=== USER DETAIL: {u['name']} ({u['email']}) ===\n"
                        user_context_addon += f"Role: {u['role']} | Joined: {u['joined']} | Engagement: {u['engagement_acknowledged']}\n"
                        if docs["personal"]:
                            user_context_addon += "Personal: " + "; ".join(
                                f"{d['doc_type']} ({d['tax_year']}) [{d['status']}]" for d in docs["personal"]) + "\n"
                        if docs["business"]:
                            user_context_addon += "Business: " + "; ".join(
                                f"{d['business_type']} ({d['tax_year']}) [{d['status']}]" for d in docs["business"]) + "\n"
                        if audit:
                            user_context_addon += "Activity:\n" + "\n".join(
                                f"  [{a['at']}] {a['action']} — {a['detail'] or ''}"
                                for a in audit[:8]) + "\n"
                        break

        system_prompt = (
            "You are the BookKeepPro Admin Assistant with live access to system data.\n\n"
            "CAPABILITIES: Answer questions about uploads, user activity, pending docs, registration counts.\n"
            "BULK ACTIONS: When asked to approve/reject all docs for a user, respond with a structured "
            "JSON action block like: {\"bulk_action\": {\"user_id\": N, \"action\": \"approve_personal\", \"confirm\": false}} "
            "— the frontend will show a confirmation dialog before executing.\n"
            "RULES: Only answer BookKeepPro, accounting, or tax questions. Use live data. Be concise.\n\n"
            f"{context}{user_context_addon}"
        )
    else:
        doc_status = get_doc_status(db=db, current_user=current_user)
        summary = doc_status["summary"]
        context = f"Total: {summary['total']} | Pending: {summary['pending']} | Approved: {summary['approved']} | Rejected: {summary['rejected']}\n"

        if doc_status["personal"]:
            context += "\nPersonal Documents:\n"
            for d in doc_status["personal"]:
                note = f" — Note: {d['note']}" if d['note'] else ""
                extracted = f" | Data: {d['extracted_summary']}" if d['extracted_summary'] else ""
                context += f"  • {d['doc_type']} ({d['tax_year']}): {d['status']}{note}{extracted}\n"
        if doc_status["business"]:
            context += "\nBusiness Documents:\n"
            for d in doc_status["business"]:
                note = f" — Note: {d['note']}" if d['note'] else ""
                extracted = f" | Data: {d['extracted_summary']}" if d['extracted_summary'] else ""
                context += f"  • {d['business_type']} ({d['tax_year']}): {d['status']}{note}{extracted}\n"

        system_prompt = (
            "You are the BookKeepPro Assistant. Help users with the app and basic accounting/tax questions.\n\n"
            "UPLOAD GUIDANCE: If user wants to upload a document, tell them:\n"
            "- Personal docs → go to /upload-personal\n"
            "- Business docs → go to /upload-business\n"
            "- You can also say: 'Click here: [Upload Personal](/upload-personal)'\n\n"
            "EXTRACTED DATA: You have access to key fields extracted from the user's documents. "
            "Use this to answer specific questions like 'what is my PAN number' or 'what does my W-2 show'.\n\n"
            "RULES: Only answer BookKeepPro, accounting, or tax questions.\n\n"
            f"=== LIVE DATA for {current_user.name or current_user.email} ===\n{context}"
        )

    # Conversation memory: messages[] from request already contains full history
    # The frontend persists this in localStorage and replays it on each call
    messages = [{"role": "system", "content": system_prompt}]
    for m in req.messages:
        messages.append({"role": m.role, "content": m.content})

    # ── Streaming path ────────────────────────────────────────────────────────
    if req.stream:
        def _stream():
            try:
                resp = requests.post(
                    url="https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={"model": CHAT_MODEL, "messages": messages, "stream": True},
                    stream=True,
                    timeout=60,
                )
                resp.raise_for_status()
                for line in resp.iter_lines():
                    if line and line != b"data: [DONE]":
                        raw = line.decode("utf-8")
                        if raw.startswith("data: "):
                            raw = raw[6:]
                        try:
                            chunk = json.loads(raw)
                            delta = chunk["choices"][0].get("delta", {})
                            token = delta.get("content", "")
                            if token:
                                # Send SSE event
                                yield f"data: {json.dumps({'token': token})}\n\n"
                        except Exception:
                            pass
                yield "data: [DONE]\n\n"
            except Exception as e:
                logger.error(f"Streaming error: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

        return StreamingResponse(_stream(), media_type="text/event-stream")

    # ── Non-streaming path (default) ─────────────────────────────────────────
    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": CHAT_MODEL, "messages": messages},
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()

        if "error" in data:
            raise HTTPException(status_code=502, detail="AI service overloaded. Please try again.")
        if "choices" not in data:
            raise HTTPException(status_code=502, detail="Unexpected AI response.")

        return data["choices"][0]["message"]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OpenRouter API error: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to AI service")
