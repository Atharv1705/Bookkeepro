import os
import io
import uuid
import logging
from datetime import datetime
import filetype
from fastapi import APIRouter, BackgroundTasks, UploadFile, File, HTTPException, Depends, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from jose import jwt, JWTError
from datetime import timedelta

from app.models import AdminDocument, PersonalDocument, BusinessDocument, User, UserRole
from app.db import get_db
import app.crud as crud
from app.auth.security import get_current_user, require_admin, SECRET_KEY, ALGORITHM
from app.utils.emailer import send_email
from app.schemas import UploadCompleteNotify, ReviewStatusUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/upload", tags=["upload"])

from pathlib import Path

# ─────────────────────────────────────────────
# Local File Storage (Contabo VPS Disk)
# ─────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parents[4]
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

async def upload_to_storage(file: UploadFile) -> str:
    """Upload to local disk. Returns the filename (storage_key)."""
    await file.seek(0)
    contents = await file.read()

    # File size validation
    MAX_SIZE = 10 * 1024 * 1024  # 10 MB
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB.")

    # Content type validation
    ALLOWED_TYPES = {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    
    kind = filetype.guess(contents)
    sniffed_mime = kind.mime if kind else None
    
    ext = os.path.splitext(file.filename or "file")[1].lower()
    
    # Fallback for legacy .doc and inconsistent .docx sniffing
    if sniffed_mime is None or sniffed_mime == "application/zip":
        if ext in [".doc", ".docx"] and file.content_type in ALLOWED_TYPES:
            sniffed_mime = file.content_type

    if sniffed_mime not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed or could not be verified. Allowed: PDF, JPG, PNG, WEBP, DOC, DOCX."
        )

    ext = os.path.splitext(file.filename or "file")[1].lower()
    object_key = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / object_key

    try:
        with open(file_path, "wb") as f:
            f.write(contents)
        logger.info(f"Uploaded {object_key} locally")
        return object_key
    except Exception as e:
        logger.error(f"Local upload failed: {e}")
        raise HTTPException(status_code=500, detail="File upload failed")

def delete_from_storage(storage_key: str):
    """Delete from local disk."""
    try:
        if storage_key.startswith("uploads/"):
            storage_key = storage_key.split("uploads/")[1]
        file_path = UPLOAD_DIR / storage_key
        if file_path.exists():
            file_path.unlink()
            logger.info(f"Deleted {storage_key} locally")
    except Exception as e:
        logger.warning(f"Storage delete failed for {storage_key}: {e}")

def get_presigned_url(storage_key: str) -> str:
    """Return an authenticated URL containing a short-lived JWT for viewing the file."""
    if storage_key.startswith("uploads/"):
        storage_key = storage_key.split("uploads/")[1]
        
    expire = datetime.utcnow() + timedelta(minutes=5)
    payload = {
        "sub": storage_key,
        "type": "file_access",
        "exp": expire,
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return f"/api/upload/file/{storage_key}?token={token}"

@router.get("/file/{storage_key}")
def stream_file(storage_key: str, token: str = Query(...)):
    """Stream file securely using short-lived JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_key = payload.get("sub")
        if token_key != storage_key or payload.get("type") != "file_access":
            raise HTTPException(status_code=403, detail="Token mismatch or invalid type")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    file_path = (UPLOAD_DIR / storage_key).resolve()
    
    # Path traversal protection
    if not str(file_path).startswith(str(UPLOAD_DIR.resolve()) + os.sep):
        raise HTTPException(status_code=400, detail="Invalid file key")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path)


# ─────────────────────────────────────────────
# Presigned URL — frontend "View" button
# ─────────────────────────────────────────────

@router.get("/view-url")
def get_view_url(
    key: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return a presigned URL. Verifies the requesting user owns the document."""
    if not key:
        raise HTTPException(status_code=400, detail="key is required")

    # Existence check — ensure the document actually exists in the DB first
    doc = (
        db.query(PersonalDocument).filter(PersonalDocument.storage_key == key).first() or
        db.query(BusinessDocument).filter(BusinessDocument.storage_key == key).first() or
        db.query(AdminDocument).filter(AdminDocument.storage_key == key).first()
    )

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Ownership check — ensure this key belongs to the requesting user or user is admin
    if current_user.role not in [UserRole.admin, UserRole.super_admin] and doc.user_id != current_user.id:
        logger.warning(
            f"User {current_user.id} attempted to access storage key {key} — not owned"
        )
        raise HTTPException(status_code=403, detail="Access denied")

    url = get_presigned_url(key)
    if not url:
        raise HTTPException(status_code=500, detail="Could not generate view URL")
    return {"url": url}


# ─────────────────────────────────────────────
# Admin Documents
# ─────────────────────────────────────────────

@router.post("/admin-documents")
async def upload_admin_document(
    file: UploadFile = File(...),
    doc_key: str = Form(...),
    doc_label: str = Form(...),
    user_id: int = Form(...),
    background: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_admin),
):
    target_user = crud.get_user_by_id(db, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")

    # Regular admins can only upload documents for user-role accounts
    if current_user.role == UserRole.admin and target_user.role != UserRole.user:
        raise HTTPException(
            status_code=403,
            detail="Admins can only upload documents for regular user accounts"
        )

    logger.info(f"Admin {current_user.id} uploading document for user {user_id}")
    storage_key = await upload_to_storage(file)

    record = AdminDocument(
        doc_key=doc_key,
        doc_label=doc_label,
        filename=file.filename,
        storage_key=storage_key,
        content_type=file.content_type,
        uploaded_by=current_user.id,
        user_id=user_id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    crud.log_action(db, "upload_admin_doc", user_id=current_user.id, target=f"admin_doc:{record.id}", detail=f"for user {user_id}")

    background.add_task(
        send_email,
        to=target_user.email,
        subject="New Document Uploaded — BookKeepro",
        body=f"""
        <p>Dear {target_user.name or "Sir/Ma'am"},</p>
        <p>An admin has securely uploaded a new document (<strong>{doc_label}</strong>) to your account.</p>
        <p>You can view this document by logging into your BookKeepro portal.</p>
        <br><strong>BookKeepro Team</strong>
        """,
    )

    return {
        "id":          record.id,
        "doc_label":   record.doc_label,
        "filename":    record.filename,
        "storage_key": record.storage_key,
    }


@router.get("/admin-documents")
def list_admin_documents(
    user_id: int | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role in [UserRole.admin, UserRole.super_admin]:
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required for admin")
        docs = (
            db.query(AdminDocument)
            .filter(AdminDocument.user_id == user_id, AdminDocument.deleted_at == None)
            .order_by(AdminDocument.uploaded_at.desc())
            .all()
        )
    elif current_user.role == UserRole.user:
        docs = (
            db.query(AdminDocument)
            .filter(AdminDocument.user_id == current_user.id, AdminDocument.deleted_at == None)
            .order_by(AdminDocument.uploaded_at.desc())
            .all()
        )
    else:
        raise HTTPException(status_code=403, detail="Unauthorized")

    return [
        {
            "id":          d.id,
            "doc_key":     d.doc_key,
            "doc_label":   d.doc_label,
            "filename":    d.filename,
            "storage_key": d.storage_key,
            "created_at":  d.uploaded_at.isoformat() if d.uploaded_at else None,
        }
        for d in docs
    ]


@router.delete("/admin-documents/{doc_id}")
def delete_admin_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_admin),
):
    doc = db.query(AdminDocument).filter_by(id=doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    target_user = db.query(User).filter(User.id == doc.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")

    # Scope restriction: standard admins can only delete documents for base users
    if current_user.role == UserRole.admin and target_user.role != UserRole.user:
        raise HTTPException(
            status_code=403, 
            detail="Standard admins can only manage documents for standard users"
        )

    logger.info(f"Admin {current_user.id} deleting admin document {doc_id}")
    delete_from_storage(doc.storage_key)
    doc.deleted_at = datetime.utcnow()
    db.commit()
    crud.log_action(db, "delete_admin_doc", user_id=current_user.id, target=f"admin_doc:{doc_id}")
    return {"deleted": True}


# ─────────────────────────────────────────────
# Personal Documents
# ─────────────────────────────────────────────

@router.get("/personal-documents")
def list_personal_documents(
    tax_year: int | None = None,
    skip:     int        = Query(0,   ge=0),
    limit:    int        = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = db.query(PersonalDocument).filter(
        PersonalDocument.user_id == current_user.id,
        PersonalDocument.deleted_at == None,
    )
    if tax_year:
        q = q.filter(PersonalDocument.tax_year == tax_year)
    docs = q.order_by(PersonalDocument.uploaded_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id":            d.id,
            "doc_type":      d.doc_type,
            "filename":      d.filename,
            "storage_key":   d.storage_key,
            "uploaded_at":   d.uploaded_at,
            "tax_year":      d.tax_year,
            "review_status": d.review_status,
            "review_note":   d.review_note,
        }
        for d in docs
    ]


@router.post("/personal-documents")
async def upload_personal_document(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    tax_year: int = Form(2025),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    logger.info(f"User {current_user.id} uploading personal document: {file.filename}")
    storage_key = await upload_to_storage(file)

    record = PersonalDocument(
        user_id=current_user.id,
        doc_type=doc_type,
        filename=file.filename,
        storage_key=storage_key,
        content_type=file.content_type,
        tax_year=tax_year,
    )
    db.add(record)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # Clean up the already-uploaded S3 object
        delete_from_storage(storage_key)
        raise HTTPException(
            status_code=409,
            detail="You have already uploaded this document for this tax year. "
                   "Delete the existing one to replace it."
        )
    db.refresh(record)
    crud.log_action(db, "upload_personal", user_id=current_user.id, target=f"personal_doc:{record.id}", detail=file.filename)

    admins = db.query(User).filter(User.role.in_([UserRole.admin, UserRole.super_admin])).all()
    for admin in admins:
        background.add_task(
            send_email,
            to=admin.email,
            subject="New Personal Document Uploaded — BookKeepro",
            body=f"<p><strong>{current_user.email}</strong> uploaded a personal document: <strong>{file.filename}</strong> ({doc_type}).</p>",
        )

    return {
        "id":          record.id,
        "filename":    record.filename,
        "doc_type":    record.doc_type,
        "storage_key": record.storage_key,
        "uploaded_at": record.uploaded_at,
        "tax_year":    record.tax_year,
    }


@router.delete("/personal-documents/{doc_id}")
def delete_personal_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    doc = (
        db.query(PersonalDocument)
        .filter(
            PersonalDocument.id == doc_id,
            PersonalDocument.user_id == current_user.id,
        )
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    logger.info(f"User {current_user.id} deleting personal document {doc_id}")
    delete_from_storage(doc.storage_key)
    doc.deleted_at = datetime.utcnow()
    db.commit()
    crud.log_action(db, "delete_personal", user_id=current_user.id, target=f"personal_doc:{doc_id}")
    return {"deleted": True}


# ─────────────────────────────────────────────
# Business Documents
# ─────────────────────────────────────────────

@router.get("/business-documents")
def list_business_documents(
    tax_year: int | None = None,
    skip:     int        = Query(0,   ge=0),
    limit:    int        = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = db.query(BusinessDocument).filter(
        BusinessDocument.user_id == current_user.id,
        BusinessDocument.deleted_at == None,
    )
    if tax_year:
        q = q.filter(BusinessDocument.tax_year == tax_year)
    docs = q.order_by(BusinessDocument.uploaded_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id":            d.id,
            "business_type": d.business_type,
            "filename":      d.filename,
            "storage_key":   d.storage_key,
            "uploaded_at":   d.uploaded_at,
            "tax_year":      d.tax_year,
            "review_status": d.review_status,
            "review_note":   d.review_note,
        }
        for d in docs
    ]


@router.post("/business-documents")
async def upload_business_document(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    tax_year: int = Form(2025),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    logger.info(f"User {current_user.id} uploading business document: {file.filename}")
    storage_key = await upload_to_storage(file)

    record = BusinessDocument(
        user_id=current_user.id,
        business_type=doc_type,
        filename=file.filename,
        storage_key=storage_key,
        content_type=file.content_type,
        tax_year=tax_year,
    )
    db.add(record)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        delete_from_storage(storage_key)
        raise HTTPException(
            status_code=409,
            detail="You have already uploaded this document for this tax year. "
                   "Delete the existing one to replace it."
        )
    db.refresh(record)
    crud.log_action(db, "upload_business", user_id=current_user.id, target=f"business_doc:{record.id}", detail=file.filename)

    admins = db.query(User).filter(User.role.in_([UserRole.admin, UserRole.super_admin])).all()
    for admin in admins:
        background.add_task(
            send_email,
            to=admin.email,
            subject="New Business Document Uploaded — BookKeepro",
            body=f"<p><strong>{current_user.email}</strong> uploaded a business document: <strong>{file.filename}</strong> ({doc_type}).</p>",
        )

    return {
        "id":            record.id,
        "filename":      record.filename,
        "business_type": record.business_type,
        "storage_key":   record.storage_key,
        "tax_year":      record.tax_year,
    }


@router.delete("/business-documents/{doc_id}")
def delete_business_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    doc = db.query(BusinessDocument).filter_by(id=doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    logger.info(f"User {current_user.id} deleting business document {doc_id}")
    delete_from_storage(doc.storage_key)
    doc.deleted_at = datetime.utcnow()
    db.commit()
    crud.log_action(db, "delete_business", user_id=current_user.id, target=f"business_doc:{doc_id}")
    return {"deleted": True}


# ─────────────────────────────────────────────
# Review status — admin persists approve/reject decisions
# ─────────────────────────────────────────────

@router.patch("/personal-documents/{doc_id}/review-status")
def set_personal_review_status(
    doc_id: int,
    payload: ReviewStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_admin),
):
    """Admin sets approve/reject/pending on a personal document."""
    doc = db.query(PersonalDocument).filter_by(id=doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.review_status = payload.status
    doc.review_note   = payload.note
    db.commit()

    crud.log_action(
        db, f"review_{payload.status}",
        user_id=current_user.id,
        target=f"personal_doc:{doc_id}",
        detail=f"owner:{doc.user_id}" + (f" note:{payload.note}" if payload.note else ""),
    )
    return {"id": doc_id, "review_status": payload.status}


@router.patch("/business-documents/{doc_id}/review-status")
def set_business_review_status(
    doc_id: int,
    payload: ReviewStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_admin),
):
    """Admin sets approve/reject/pending on a business document."""
    doc = db.query(BusinessDocument).filter_by(id=doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.review_status = payload.status
    doc.review_note   = payload.note
    db.commit()

    crud.log_action(
        db, f"review_{payload.status}",
        user_id=current_user.id,
        target=f"business_doc:{doc_id}",
        detail=f"owner:{doc.user_id}" + (f" note:{payload.note}" if payload.note else ""),
    )
    return {"id": doc_id, "review_status": payload.status}


# ─────────────────────────────────────────────
# Admin — all documents for one user
# ─────────────────────────────────────────────

@router.get("/admin/users/{user_id}/documents")
def get_user_all_documents(
    user_id: int,
    tax_year: int | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Regular admins can only view documents for user-role accounts
    if current_user.role == UserRole.admin and user.role != UserRole.user:
        raise HTTPException(
            status_code=403,
            detail="Admins can only view documents for regular user accounts"
        )

    logger.info(f"Admin {current_user.id} retrieving all documents for user {user_id}")

    pq = db.query(PersonalDocument).filter(
        PersonalDocument.user_id == user_id, PersonalDocument.deleted_at == None
    )
    bq = db.query(BusinessDocument).filter(
        BusinessDocument.user_id == user_id, BusinessDocument.deleted_at == None
    )
    if tax_year:
        pq = pq.filter(PersonalDocument.tax_year == tax_year)
        bq = bq.filter(BusinessDocument.tax_year == tax_year)

    personal_docs = pq.order_by(PersonalDocument.uploaded_at.desc()).all()
    business_docs = bq.order_by(BusinessDocument.uploaded_at.desc()).all()

    documents = [
        {
            "id":            d.id,
            "table":         "personal",
            "doc_type":      d.doc_type,
            "filename":      d.filename,
            "storage_key":   d.storage_key,
            "uploaded_at":   d.uploaded_at.isoformat() if d.uploaded_at else None,
            "tax_year":      d.tax_year,
            "review_status": d.review_status,
            "review_note":   d.review_note,
        }
        for d in personal_docs
    ] + [
        {
            "id":            d.id,
            "table":         "business",
            "doc_type":      d.business_type,
            "filename":      d.filename,
            "storage_key":   d.storage_key,
            "uploaded_at":   d.uploaded_at.isoformat() if d.uploaded_at else None,
            "tax_year":      d.tax_year,
            "review_status": d.review_status,
            "review_note":   d.review_note,
        }
        for d in business_docs
    ]

    return {
        "user": {
            "id":    user.id,
            "name":  user.name,
            "email": user.email,
            "role":  user.role.value if hasattr(user.role, "value") else str(user.role),
            "engagement_acknowledged_at": (
                user.engagement_acknowledged_at.isoformat()
                if user.engagement_acknowledged_at else None
            ),
        },
        "documents": documents,
    }


# ─────────────────────────────────────────────
# Admin — delete a user and all documents
# ─────────────────────────────────────────────

@router.delete("/admin/users/{user_id}")
def delete_user_completely(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_admin),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Regular admins can only delete user-role accounts
    # Super_admin can delete admin or user accounts (but not other super_admins)
    if current_user.role == UserRole.admin and user.role != UserRole.user:
        raise HTTPException(
            status_code=403,
            detail="Admins can only delete regular user accounts"
        )
    if current_user.role == UserRole.super_admin and user.role == UserRole.super_admin:
        raise HTTPException(
            status_code=403,
            detail="Super admin accounts cannot be deleted through the dashboard"
        )

    logger.info(f"Admin {current_user.id} deleting user {user_id}")

    try:
        for doc in db.query(AdminDocument).filter(AdminDocument.user_id == user_id).all():
            delete_from_storage(doc.storage_key)
            db.delete(doc)

        for doc in db.query(AdminDocument).filter(AdminDocument.uploaded_by == user_id).all():
            delete_from_storage(doc.storage_key)
            db.delete(doc)

        for doc in db.query(PersonalDocument).filter(PersonalDocument.user_id == user_id).all():
            delete_from_storage(doc.storage_key)
            db.delete(doc)

        for doc in db.query(BusinessDocument).filter(BusinessDocument.user_id == user_id).all():
            delete_from_storage(doc.storage_key)
            db.delete(doc)

        # Clean up legacy uploaded_files rows and audit logs to avoid FK constraint errors on db.delete(user)
        from app.models import UploadedFile, AuditLog
        db.query(UploadedFile).filter(UploadedFile.owner_id == user_id).delete()
        db.query(AuditLog).filter(AuditLog.user_id == user_id).delete()

        db.commit()
        crud.log_action(db, "delete_user", user_id=current_user.id, target=f"user:{user_id}")
        db.delete(user)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"User deletion failed for {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Deletion failed. No changes were made.")

    return {"deleted": True, "user_id": user_id}


# ─────────────────────────────────────────────
# Batch upload notification — call once after all files uploaded (#11)
# ─────────────────────────────────────────────

@router.post("/notify-upload-complete")
async def notify_upload_complete(
    payload: UploadCompleteNotify,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Send one summary email after a user finishes uploading all documents.
    Call this once from the frontend after the upload session is complete.
    Replaces the old per-file email approach.
    """
    admin_email = os.getenv("ADMIN_EMAIL")
    count       = payload.file_count
    category    = payload.doc_category

    background.add_task(
        send_email,
        to=current_user.email,
        subject=f"{category} Documents Uploaded — BookKeepro",
        body=f"""
        <p>Dear {current_user.name or "Sir/Ma'am"},</p>
        <p>We received <strong>{count}</strong> {category.lower()}
           document{"s" if count != 1 else ""} from you.</p>
        <p>Our team will review {"them" if count != 1 else "it"} and update you shortly.</p>
        <br><strong>BookKeepro Team</strong>
        """,
    )
    admins = db.query(User).filter(User.role.in_([UserRole.admin, UserRole.super_admin])).all()
    for admin in admins:
        background.add_task(
            send_email,
            to=admin.email,
            subject=f"New {category} Upload — BookKeepro",
            body=f"<p><strong>{current_user.email}</strong> uploaded "
                 f"{count} {category.lower()} document{'s' if count != 1 else ''}.</p>",
        )
    return {"status": "notified"}


from pydantic import BaseModel

class NotifyApprovalRequest(BaseModel):
    user_id: int

@router.post("/notify/personal")
async def notify_personal_approval(
    payload: NotifyApprovalRequest,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    background.add_task(
        send_email,
        to=user.email,
        subject="Personal Documents Approved — BookKeepro",
        body=f"""
        <p>Dear {user.name or "Sir/Ma'am"},</p>
        <p>Your personal documents have been successfully reviewed and approved.</p>
        <br><strong>BookKeepro Team</strong>
        """,
    )
    return {"status": "email_sent"}

@router.post("/notify/business")
async def notify_business_approval(
    payload: NotifyApprovalRequest,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    background.add_task(
        send_email,
        to=user.email,
        subject="Business Documents Approved — BookKeepro",
        body=f"""
        <p>Dear {user.name or "Sir/Ma'am"},</p>
        <p>Your business documents have been successfully reviewed and approved.</p>
        <br><strong>BookKeepro Team</strong>
        """,
    )
    return {"status": "email_sent"}

# ─────────────────────────────────────────────
# Required Document Templates
# ─────────────────────────────────────────────

from app.models import RequiredDocumentTemplate

@router.get("/templates")
def list_templates(
    category: str,
    tax_year: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    templates = (
        db.query(RequiredDocumentTemplate)
        .filter_by(category=category, tax_year=tax_year)
        .order_by(RequiredDocumentTemplate.id.asc())
        .all()
    )
    return [
        {
            "id": t.id,
            "name": t.name,
            "download": t.file_url,
        }
        for t in templates
    ]

@router.post("/admin/templates")
async def upload_template(
    file: UploadFile = File(None),
    category: str = Form(...),
    tax_year: int = Form(...),
    name: str = Form(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_admin),
):
    # Only super admin can manage templates
    if current_user.role != UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Only super admins can manage templates")

    file_url = None
    if file and file.filename:
        storage_key = await upload_to_storage(file)
        file_url = get_presigned_url(storage_key)

    record = RequiredDocumentTemplate(
        category=category,
        tax_year=tax_year,
        name=name,
        file_url=file_url,
    )
    
    try:
        db.add(record)
        db.commit()
        db.refresh(record)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="A template with this name already exists for the given year.")

    return {
        "id": record.id,
        "name": record.name,
        "download": record.file_url,
    }

@router.delete("/admin/templates/{template_id}")
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_admin),
):
    if current_user.role != UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Only super admins can manage templates")

    record = db.query(RequiredDocumentTemplate).filter_by(id=template_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Template not found")

    if record.file_url and record.file_url.startswith("/uploads/"):
        storage_key = record.file_url.split("/uploads/")[1]
        delete_from_storage(storage_key)

    db.delete(record)
    db.commit()
    return {"deleted": True}
