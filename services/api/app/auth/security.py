import os
import logging
from datetime import datetime, timedelta

from jose import jwt, JWTError
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db import get_db
import app.crud as crud
from app.schemas import SignupRequest, LoginRequest, TokenResponse, ForgotPasswordRequest, ResetPasswordRequest, ResendVerificationRequest, RoleChangeRequest
from app.models import UserRole, User as UserModel, PersonalDocument, BusinessDocument

logger = logging.getLogger(__name__)

# =========================
# Router
# =========================
router = APIRouter(prefix="/api/auth", tags=["auth"])


# =========================
# Config
# =========================
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY environment variable is not set. "
        "Generate one with: openssl rand -hex 32"
    )
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
# =========================
# JWT helpers
# =========================
def create_access_token(
    subject: str,
    role: str = "user",
    expires_minutes: int | None = None,
) -> str:
    expire = datetime.utcnow() + timedelta(
        minutes=expires_minutes or ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": subject,
        "role": role.lower(),
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


RESET_TOKEN_EXPIRE_MINUTES = 15

def create_password_reset_token(email: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": email,
        "type": "password_reset",
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


VERIFY_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

def create_email_verification_token(email: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=VERIFY_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": email,
        "type": "email_verification",
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


from app.utils.emailer import send_email
from app.limiter import limiter

@router.post("/forgot-password")
@limiter.limit("3/hour")
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = crud.get_user_by_email(db, payload.email)

    # Anti-enumeration
    if not user:
        return {"message": "If the email exists, a reset link has been sent"}

    reset_token = create_password_reset_token(user.email)

    frontend_url = os.getenv("FRONTEND_URL", "https://bookkeepro.net")
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"

    reset_body = (
        f"Hi {user.name},<br><br>"
        f"Click the button below to reset your password:<br><br>"
        f'<a href="{reset_link}" '
        f'style="padding:12px 18px;background:#FF7F11;color:#fff;'
        f'text-decoration:none;border-radius:6px;">'
        f"Reset Password</a><br><br>"
        f"This link expires in 15 minutes.<br><br>"
        f"BookKeepro Team"
    )
    background.add_task(
        send_email,
        to=user.email,
        subject="Reset your BookKeepro password",
        body=reset_body,
    )

    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    try:
        decoded = jwt.decode(payload.token, SECRET_KEY, algorithms=[ALGORITHM])
        email = decoded.get("sub")
        token_type = decoded.get("type")

        if token_type != "password_reset":
            logger.warning(f"Invalid password reset token type for email: {email}")
            raise HTTPException(status_code=400, detail="Invalid token")

    except JWTError:
        logger.warning(f"Invalid or expired password reset token")
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user = crud.get_user_by_email(db, email)
    if not user:
        logger.warning(f"Password reset attempt for non-existent user: {email}")
        raise HTTPException(status_code=404, detail="User not found")

    hashed_password = crud.hash_password(payload.new_password)
    crud.update_user_password(db, user, hashed_password)

    logger.info(f"Password reset successful for user: {email}")

    return {"message": "Password reset successful"}




def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """Get current user from JWT token and verify role from database (not JWT).
    
    CRITICAL: Role is always read from database, not from JWT token.
    This prevents JWT role spoofing attacks.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str | None = payload.get("sub")

        if not email:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = crud.get_user_by_email(db, email)
    if not user:
        raise credentials_exception

    # CRITICAL: Always use role from database, never trust JWT role
    # This prevents attackers from forging JWT with elevated privileges
    return user


def require_admin(current_user=Depends(get_current_user)):
    if current_user.role not in [UserRole.admin, UserRole.super_admin]:
        logger.warning(f"Unauthorized admin access attempt by user {current_user.id} ({current_user.email})")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    logger.info(f"Admin action by user {current_user.id} ({current_user.email})")
    return current_user


def require_super_admin(current_user=Depends(get_current_user)):
    """Dependency to enforce super_admin-only access (role management, etc.)."""
    if current_user.role != UserRole.super_admin:
        logger.warning(f"Unauthorized super_admin access attempt by user {current_user.id} ({current_user.email})")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    return current_user


# =========================
# Auth Routes
# =========================

@router.post("/signup", response_model=TokenResponse)
@limiter.limit("10/hour")
async def signup(request: Request, payload: SignupRequest, background: BackgroundTasks, db: Session = Depends(get_db)):
    if crud.get_user_by_email(db, payload.email):
        logger.warning(f"Signup attempt with already registered email: {payload.email}")
        raise HTTPException(status_code=400, detail="Email already registered")

    role_value = "user"   # all public signups are always regular users

    # Admins created via DB are pre-verified; new signups are always "user" and unverified
    is_admin = False

    user = crud.create_user(
        db=db,
        name=payload.name,
        email=payload.email,
        phone=payload.phone or "",
        password=payload.password,
        role=role_value,
        is_verified=1 if is_admin else 0,
    )

    logger.info(f"New user registered: {user.email} with role {user.role}")

    crud.log_action(db, "signup", user_id=user.id, ip_address=request.client.host if hasattr(request, 'client') and request.client else None)

    # Send verification email in background (non-blocking)
    if not is_admin:
        verify_token = create_email_verification_token(user.email)
        frontend_url = os.getenv("FRONTEND_URL", "https://bookkeepro.net")
        verify_link = f"{frontend_url}/verify-email?token={verify_token}"
        verify_body = (
            f"Hi {user.name},<br><br>"
            f"Welcome to BookKeepro! Please verify your email address to activate your account.<br><br>"
            f'<a href="{verify_link}" '
            f'style="padding:12px 24px;background:#FF7F11;color:#fff;'
            f'text-decoration:none;border-radius:6px;font-weight:600;">'
            f"Verify My Email</a><br><br>"
            f"This link expires in 24 hours. If you did not sign up, ignore this email.<br><br>"
            f"BookKeepro Team"
        )
        background.add_task(
            send_email,
            to=user.email,
            subject="Verify your BookKeepro email",
            body=verify_body,
        )

    return {
        "access_token": "",        # no token until verified
        "token_type": "bearer",
        "role": role_value,
        "user_id": user.id,
        "email_verification_required": not is_admin,
    }



@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, payload.email)

    if not user or not crud.verify_password(payload.password, user.hashed_password):
        logger.warning(f"Failed login attempt for email: {payload.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # Block unverified users
    if not user.is_verified:
        logger.warning(f"Login attempt by unverified user: {user.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="EMAIL_NOT_VERIFIED",
        )

    user_role = (
        user.role.value if hasattr(user.role, "value") else str(user.role)
    ).lower()

    logger.info(f"User logged in: {user.email} with role {user_role}")

    crud.log_action(db, "login", user_id=user.id, ip_address=request.client.host if request.client else None)

    token = create_access_token(subject=user.email, role=user_role)

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user_role,
        "user_id": user.id,
    }


@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    """Verify a user's email using the token sent during signup."""
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = decoded.get("sub")
        token_type = decoded.get("type")

        if token_type != "email_verification":
            raise HTTPException(status_code=400, detail="Invalid token")

    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")

    user = crud.get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_verified:
        return {"message": "already_verified"}

    user.is_verified = 1
    db.commit()
    logger.info(f"Email verified for user: {email}")
    return {"message": "verified"}


@router.post("/resend-verification")
async def resend_verification(
    payload: ResendVerificationRequest,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Resend the email verification link."""
    user = crud.get_user_by_email(db, payload.email)

    if not user or user.is_verified:
        return {"message": "If the email exists and is unverified, a new link has been sent"}

    verify_token = create_email_verification_token(user.email)
    frontend_url = os.getenv("FRONTEND_URL", "https://bookkeepro.net")
    verify_link = f"{frontend_url}/verify-email?token={verify_token}"

    resend_body = (
        f"Hi {user.name},<br><br>"
        f"Here is your new verification link:<br><br>"
        f'<a href="{verify_link}" '
        f'style="padding:12px 24px;background:#FF7F11;color:#fff;'
        f'text-decoration:none;border-radius:6px;font-weight:600;">'
        f"Verify My Email</a><br><br>"
        f"This link expires in 24 hours.<br><br>"
        f"BookKeepro Team"
    )
    background.add_task(
        send_email,
        to=user.email,
        subject="Verify your BookKeepro email",
        body=resend_body,
    )
    return {"message": "If the email exists and is unverified, a new link has been sent"}


@router.get("/me")
def me(current_user=Depends(get_current_user)):
    role = (
        current_user.role.value
        if hasattr(current_user.role, "value")
        else str(current_user.role)
    )
    return {
        "id":    current_user.id,
        "name":  current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "role":  role,
        "engagement_acknowledged_at": (
            current_user.engagement_acknowledged_at.isoformat()
            if current_user.engagement_acknowledged_at else None
        ),
    }


# ─────────────────────────────────────────────
# Engagement letter acknowledgement
# ─────────────────────────────────────────────

@router.post("/acknowledge-engagement")
def acknowledge_engagement(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """User confirms they have read the engagement letter. Idempotent."""
    if not current_user.engagement_acknowledged_at:
        current_user.engagement_acknowledged_at = datetime.utcnow()
        db.commit()
        crud.log_action(db, "engagement_acknowledged", user_id=current_user.id)
    return {
        "acknowledged": True,
        "acknowledged_at": current_user.engagement_acknowledged_at.isoformat(),
    }


@router.patch("/me")
def update_me(
    payload: dict,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update own profile (name, phone, password). Any authenticated user."""
    name         = payload.get("name", "").strip()
    phone        = payload.get("phone", "").strip()
    current_pw   = payload.get("current_password", "")
    new_pw       = payload.get("new_password", "")

    changed = []

    if name and name != current_user.name:
        current_user.name = name
        changed.append("name")

    if phone != current_user.phone:
        current_user.phone = phone
        changed.append("phone")

    if new_pw:
        if len(new_pw) < 8:
            raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
        if not current_pw:
            raise HTTPException(status_code=400, detail="Current password is required to set a new password")
        if not crud.verify_password(current_pw, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        current_user.hashed_password = crud.hash_password(new_pw)
        changed.append("password")

    if changed:
        db.commit()
        crud.log_action(
            db, "profile_update",
            user_id=current_user.id,
            detail=", ".join(changed),
            ip_address=request.client.host if request.client else None,
        )

    return {
        "id":      current_user.id,
        "name":    current_user.name,
        "email":   current_user.email,
        "phone":   current_user.phone,
        "updated": changed,
    }


# =========================
# Admin Routes
# =========================
@router.get("/admin/users")
def list_users_for_admin(
    skip:  int = Query(0,   ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_admin),
):
    """
    List users:
    - super_admin  → sees all users (user + admin + super_admin)
    - admin        → sees only role=user accounts
    Supports skip/limit pagination. Returns pending_docs count per user.
    """
    from sqlalchemy import func as sqlfunc

    def _pending_count(uid: int) -> int:
        p = db.query(sqlfunc.count(PersonalDocument.id)).filter(
            PersonalDocument.user_id       == uid,
            PersonalDocument.review_status == "pending",
            PersonalDocument.deleted_at    == None,
        ).scalar() or 0
        b = db.query(sqlfunc.count(BusinessDocument.id)).filter(
            BusinessDocument.user_id       == uid,
            BusinessDocument.review_status == "pending",
            BusinessDocument.deleted_at    == None,
        ).scalar() or 0
        return p + b

    if current_user.role == UserRole.super_admin:
        q = db.query(UserModel)
    else:
        q = db.query(UserModel).filter(UserModel.role == UserRole.user)

    total = q.count()
    users = q.offset(skip).limit(limit).all()

    return {
        "users": [
            {
                "id":           u.id,
                "name":         u.name,
                "email":        u.email,
                "phone":        u.phone,
                "role":         u.role.value if hasattr(u.role, "value") else str(u.role),
                "pending_docs": _pending_count(u.id),
            }
            for u in users
        ],
        "total": total,
        "skip":  skip,
        "limit": limit,
    }


@router.get("/admin/audit-logs")
def get_audit_logs(
    user_id: int | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_admin),
):
    from app.models import AuditLog
    query = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    logs = query.limit(min(limit, 200)).all()
    return [
        {
            "id": l.id,
            "user_id": l.user_id,
            "action": l.action,
            "target": l.target,
            "detail": l.detail,
            "ip_address": l.ip_address,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
    ]


@router.get("/admin/users/{user_id}/documents")
def get_user_documents(
    user_id: int,
    current_user=Depends(get_current_user),
    _=Depends(require_admin),
):
    """
    Removed: this endpoint queried the legacy uploaded_files table which is empty.
    All document data is now at GET /api/upload/admin/users/{user_id}/documents.
    Returns 410 Gone so callers know to update their URLs.
    """
    raise HTTPException(
        status_code=410,
        detail=f"This endpoint is removed. Use /api/upload/admin/users/{user_id}/documents instead.",
    )


# ─────────────────────────────────────────────
# Role management — super_admin only
# ─────────────────────────────────────────────

@router.patch("/admin/users/{user_id}/role")
def change_user_role(
    user_id: int,
    payload: RoleChangeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_super_admin),
):
    """
    Change a user's role. Super admin only.

    Rules:
    - Cannot change your own role (prevents self-demotion)
    - Cannot assign super_admin via API (super_admin is DB-only)
    - Cannot demote the last remaining super_admin
    """
    # Rule 1 — no self-modification
    if user_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot change your own role"
        )

    target = crud.get_user_by_id(db, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    old_role = target.role.value if hasattr(target.role, "value") else str(target.role)
    new_role = payload.role  # already validated as "user" or "admin" by schema

    # Rule 2 — no change if already same role
    if old_role == new_role:
        return {
            "id": target.id,
            "email": target.email,
            "role": old_role,
            "message": "Role unchanged (already set to this value)"
        }

    # Rule 3 — cannot demote the last remaining super_admin
    if old_role == "super_admin":
        from app.models import User as UserModel
        super_admin_count = (
            db.query(UserModel)
            .filter(UserModel.role == UserRole.super_admin)
            .count()
        )
        if super_admin_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot demote the last super admin. Promote another user first."
            )

    # Apply the role change
    target.role = UserRole(new_role)
    db.commit()

    # Audit log with full context
    crud.log_action(
        db,
        action="role_change",
        user_id=current_user.id,
        target=f"user:{user_id}",
        detail=f"{target.email}: {old_role} → {new_role}",
        ip_address=request.client.host if request.client else None,
    )

    logger.info(
        f"Super admin {current_user.email} changed user {target.email} role: {old_role} → {new_role}"
    )

    return {
        "id":       target.id,
        "email":    target.email,
        "old_role": old_role,
        "new_role": new_role,
        "message":  f"Role updated from {old_role} to {new_role}"
    }


