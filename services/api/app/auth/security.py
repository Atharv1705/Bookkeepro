import os
import logging
from datetime import datetime, timedelta

from jose import jwt, JWTError
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db import get_db
import app.crud as crud
from app.schemas import (
    SignupRequest,
    LoginRequest,
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ResendVerificationRequest,
    RoleChangeRequest,
    AssignAdminRequest,
    BulkAssignAdminRequest,
)
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
        "type": "access",
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

    frontend_url = os.getenv("FRONTEND_URL", "https://aicpa.duckdns.org")
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"

    reset_body = (
        f"Hi {user.name},<br><br>"
        f"Click the button below to reset your password:<br><br>"
        f'<a href="{reset_link}" '
        f'style="padding:12px 18px;background:#FF7F11;color:#fff;'
        f'text-decoration:none;border-radius:6px;">'
        f"Reset Password</a><br><br>"
        f"This link expires in 15 minutes.<br><br>"
        f"Support Team"
    )
    background.add_task(
        send_email,
        to=user.email,
        subject="Reset your password",
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
        # Old access tokens omitted 'type', so we default to 'access'.
        # Reset and verification tokens explicitly set their type, so they will fail this check.
        token_type = payload.get("type", "access")
        
        # We must explicitly check type claim to prevent reset tokens from acting as access tokens
        if not email or token_type != "access":
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


def assert_admin_can_access(current_user, target_user):
    """
    Enforces that:
    1. The current user is actually an admin/super_admin.
    2. The target user exists (throws 404).
    3. The target user has a 'user' role (throws 403) unless current_user is super_admin.
    4. If current_user is a standard admin, the target user must not be assigned to another admin.
    """
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    if current_user.role not in [UserRole.admin, UserRole.super_admin]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
        
    # Super admins can view and manage any account
    if current_user.role == UserRole.super_admin:
        return

    # Admins can only view 'user' accounts
    if target_user.role != UserRole.user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins can only interact with regular user accounts"
        )

    # Standard admin: verify client assignment
    if target_user.assigned_admin_id is not None and target_user.assigned_admin_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This client is assigned to another administrator"
        )


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
        frontend_url = os.getenv("FRONTEND_URL", "https://aicpa.duckdns.org")
        verify_link = f"{frontend_url}/verify-email?token={verify_token}"
        verify_body = (
            f"Hi {user.name},<br><br>"
            f"Welcome! Please verify your email address to activate your account.<br><br>"
            f'<a href="{verify_link}" '
            f'style="padding:12px 24px;background:#FF7F11;color:#fff;'
            f'text-decoration:none;border-radius:6px;font-weight:600;">'
            f"Verify My Email</a><br><br>"
            f"This link expires in 24 hours. If you did not sign up, ignore this email.<br><br>"
            f"Support Team"
        )
        background.add_task(
            send_email,
            to=user.email,
            subject="Verify your email",
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
@limiter.limit("3/hour")
async def resend_verification(
    request: Request,
    payload: ResendVerificationRequest,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Resend the email verification link."""
    user = crud.get_user_by_email(db, payload.email)

    if not user or user.is_verified:
        return {"message": "If the email exists and is unverified, a new link has been sent"}

    verify_token = create_email_verification_token(user.email)
    frontend_url = os.getenv("FRONTEND_URL", "https://aicpa.duckdns.org")
    verify_link = f"{frontend_url}/verify-email?token={verify_token}"

    resend_body = (
        f"Hi {user.name},<br><br>"
        f"Here is your new verification link:<br><br>"
        f'<a href="{verify_link}" '
        f'style="padding:12px 24px;background:#FF7F11;color:#fff;'
        f'text-decoration:none;border-radius:6px;font-weight:600;">'
        f"Verify My Email</a><br><br>"
        f"This link expires in 24 hours.<br><br>"
        f"Support Team"
    )
    background.add_task(
        send_email,
        to=user.email,
        subject="Verify your email",
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
            current_user.engagement_acknowledged_at.isoformat() + "Z"
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
        "acknowledged_at": current_user.engagement_acknowledged_at.isoformat() + "Z",
    }


@router.patch("/me")
def update_me(
    payload: dict,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update own profile (name, phone, password). Any authenticated user."""
    name_raw     = payload.get("name")
    phone_raw    = payload.get("phone")
    name         = name_raw.strip() if isinstance(name_raw, str) else None
    phone        = phone_raw.strip() if isinstance(phone_raw, str) else None
    current_pw   = payload.get("current_password") or ""
    new_pw       = payload.get("new_password") or ""

    changed = []

    if name is not None and name and name != current_user.name:
        current_user.name = name
        changed.append("name")

    if phone is not None and phone != (current_user.phone or ""):
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
    tax_year: int = Query(None),
    assigned_admin_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_admin),
):
    """
    List users:
    - super_admin  → sees all users (user + admin + super_admin) and can filter by assigned_admin_id ("all", "unassigned", or specific admin id)
    - admin        → sees their assigned user accounts (assigned_admin_id == current_user.id) or can view unassigned accounts
    Supports skip/limit pagination. Returns pending_docs count per user and assigned admin info.
    """
    from sqlalchemy import func as sqlfunc, or_

    def _pending_count(uid: int) -> dict:
        p_q = db.query(sqlfunc.count(PersonalDocument.id)).filter(
            PersonalDocument.user_id       == uid,
            PersonalDocument.review_status == "pending",
            PersonalDocument.deleted_at    == None,
        )
        b_q = db.query(sqlfunc.count(BusinessDocument.id)).filter(
            BusinessDocument.user_id       == uid,
            BusinessDocument.review_status == "pending",
            BusinessDocument.deleted_at    == None,
        )
        if tax_year is not None:
            p_q = p_q.filter(PersonalDocument.tax_year == tax_year)
            b_q = b_q.filter(BusinessDocument.tax_year == tax_year)
            
        p = p_q.scalar() or 0
        b = b_q.scalar() or 0
        return {"pending_personal": p, "pending_business": b, "pending_docs": p + b}

    if current_user.role == UserRole.super_admin:
        q = db.query(UserModel)
        if assigned_admin_id == "unassigned":
            q = q.filter(UserModel.assigned_admin_id == None, UserModel.role == UserRole.user)
        elif assigned_admin_id and assigned_admin_id != "all":
            try:
                aid = int(assigned_admin_id)
                q = q.filter(UserModel.assigned_admin_id == aid)
            except ValueError:
                pass
    else:
        # Standard admin:
        # By default (or assigned_admin_id == "me"), show clients assigned to this admin.
        # If assigned_admin_id == "unassigned", show unassigned clients.
        # If assigned_admin_id == "all", show clients assigned to this admin + unassigned clients.
        if assigned_admin_id == "unassigned":
            q = db.query(UserModel).filter(UserModel.role == UserRole.user, UserModel.assigned_admin_id == None)
        elif assigned_admin_id == "all":
            q = db.query(UserModel).filter(
                UserModel.role == UserRole.user,
                or_(UserModel.assigned_admin_id == current_user.id, UserModel.assigned_admin_id == None)
            )
        else:
            q = db.query(UserModel).filter(UserModel.role == UserRole.user, UserModel.assigned_admin_id == current_user.id)

    total = q.count()
    users = q.offset(skip).limit(limit).all()

    return {
        "users": [
            {
                "id":                   u.id,
                "name":                 u.name,
                "email":                u.email,
                "phone":                u.phone,
                "role":                 u.role.value if hasattr(u.role, "value") else str(u.role),
                "assigned_admin_id":    u.assigned_admin_id,
                "assigned_admin_name":  u.assigned_admin.name if u.assigned_admin else None,
                "assigned_admin_email": u.assigned_admin.email if u.assigned_admin else None,
                **_pending_count(u.id),   # inlines pending_personal, pending_business, pending_docs (total)
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
            "created_at": l.created_at.isoformat() + "Z" if l.created_at else None,
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


# ─────────────────────────────────────────────
# Admin assignment management
# ─────────────────────────────────────────────

@router.get("/admin/staff")
def list_admin_staff(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_admin),
):
    """
    Returns list of staff administrators (admin and super_admin) with count of assigned clients.
    Accessible to admins and super_admins.
    """
    from sqlalchemy import func as sqlfunc
    staff = (
        db.query(UserModel)
        .filter(UserModel.role.in_([UserRole.admin, UserRole.super_admin]))
        .order_by(UserModel.name.asc(), UserModel.email.asc())
        .all()
    )

    counts = dict(
        db.query(UserModel.assigned_admin_id, sqlfunc.count(UserModel.id))
        .filter(UserModel.assigned_admin_id != None)
        .group_by(UserModel.assigned_admin_id)
        .all()
    )

    return [
        {
            "id": s.id,
            "name": s.name or s.email,
            "email": s.email,
            "role": s.role.value if hasattr(s.role, "value") else str(s.role),
            "assigned_clients_count": counts.get(s.id, 0),
        }
        for s in staff
    ]


@router.patch("/admin/users/{user_id}/assign-admin")
def assign_user_to_admin(
    user_id: int,
    payload: AssignAdminRequest,
    request: Request,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_super_admin),
):
    """
    Assign or unassign a client user to an administrator. Super admin only.
    Sends an email notification to the assigned admin.
    """
    client = crud.get_user_by_id(db, user_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client user not found")

    old_admin_id = client.assigned_admin_id
    old_admin = crud.get_user_by_id(db, old_admin_id) if old_admin_id else None
    old_admin_name = f"{old_admin.name or old_admin.email} (#{old_admin.id})" if old_admin else "Unassigned"

    if payload.admin_id is None or payload.admin_id == 0:
        # Unassign
        client.assigned_admin_id = None
        new_admin = None
        new_admin_name = "Unassigned"
    else:
        new_admin = crud.get_user_by_id(db, payload.admin_id)
        if not new_admin:
            raise HTTPException(status_code=404, detail="Target admin not found")
        if new_admin.role not in [UserRole.admin, UserRole.super_admin]:
            raise HTTPException(status_code=400, detail="Assigned user must have an admin role")
        client.assigned_admin_id = new_admin.id
        new_admin_name = f"{new_admin.name or new_admin.email} (#{new_admin.id})"

    db.commit()
    db.refresh(client)

    crud.log_action(
        db,
        action="assign_admin",
        user_id=current_user.id,
        target=f"user:{client.id}",
        detail=f"Assigned admin changed: {old_admin_name} → {new_admin_name}",
        ip_address=request.client.host if request.client else None,
    )

    logger.info(
        f"Super admin {current_user.email} assigned client {client.email} to {new_admin_name}"
    )

    # Send email notification to the assigned admin
    if new_admin:
        frontend_url = os.getenv("FRONTEND_URL", "https://aicpa.duckdns.org")
        client_link = f"{frontend_url}/admin-user-detail?user_id={client.id}"
        super_admin_name = current_user.name or current_user.email
        client_display = client.name or client.email
        phone_html = f"<p style='margin:4px 0;'><strong>Phone:</strong> {client.phone}</p>" if client.phone else ""

        email_body = f"""
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#1e293b;max-width:580px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
          <div style="background-color:#0f172a;padding:24px 28px;text-align:left;">
            <h2 style="color:#ffffff;margin:0;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Admin Portal</h2>
            <p style="color:#94a3b8;margin:6px 0 0 0;font-size:13px;">Client Portfolio Assignment Notification</p>
          </div>
          <div style="padding:28px;">
            <p style="font-size:15px;margin-top:0;">Hello <strong>{new_admin.name or 'Admin'}</strong>,</p>
            <p style="font-size:14px;color:#334155;">Super Admin <strong>{super_admin_name}</strong> has assigned a client to your portfolio:</p>
            <div style="background-color:#f8fafc;border-left:4px solid #0284c7;padding:16px;margin:20px 0;border-radius:6px;font-size:14px;">
              <p style="margin:4px 0;"><strong>Client Name:</strong> {client_display}</p>
              <p style="margin:4px 0;"><strong>Client Email:</strong> {client.email}</p>
              {phone_html}
            </div>
            <p style="font-size:14px;color:#475569;">You now have administrative responsibility to review their uploaded documents, upload finalized tax returns, and assist them through filing.</p>
            <div style="margin:28px 0 16px;">
              <a href="{client_link}" style="background-color:#0284c7;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;display:inline-block;">
                Open Client File →
              </a>
            </div>
          </div>
          <div style="background-color:#f1f5f9;padding:16px 28px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
            This is an automated notification from the Admin Portal.
          </div>
        </div>
        """
        background.add_task(
            send_email,
            to=new_admin.email,
            subject=f"New Client Assigned: {client_display}",
            body=email_body,
        )

    return {
        "success": True,
        "user_id": client.id,
        "assigned_admin_id": client.assigned_admin_id,
        "assigned_admin_name": new_admin.name if new_admin else None,
        "assigned_admin_email": new_admin.email if new_admin else None,
        "message": f"Client assigned to {new_admin_name}",
    }


@router.post("/admin/users/bulk-assign-admin")
def bulk_assign_users_to_admin(
    payload: BulkAssignAdminRequest,
    request: Request,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_super_admin),
):
    """
    Bulk assign multiple clients to an administrator. Super admin only.
    Sends an email notification to the assigned admin.
    """
    if not payload.user_ids:
        raise HTTPException(status_code=400, detail="No user IDs provided")

    new_admin = None
    new_admin_name = "Unassigned"
    if payload.admin_id is not None and payload.admin_id != 0:
        new_admin = crud.get_user_by_id(db, payload.admin_id)
        if not new_admin:
            raise HTTPException(status_code=404, detail="Target admin not found")
        if new_admin.role not in [UserRole.admin, UserRole.super_admin]:
            raise HTTPException(status_code=400, detail="Assigned user must have an admin role")
        new_admin_name = f"{new_admin.name or new_admin.email} (#{new_admin.id})"

    clients = db.query(UserModel).filter(UserModel.id.in_(payload.user_ids)).all()
    count = 0
    client_names = []
    for client in clients:
        client.assigned_admin_id = new_admin.id if new_admin else None
        client_names.append(f"{client.name or client.email} ({client.email})")
        count += 1

    db.commit()

    crud.log_action(
        db,
        action="bulk_assign_admin",
        user_id=current_user.id,
        target=f"users:{len(clients)}",
        detail=f"Bulk assigned {count} clients to {new_admin_name}",
        ip_address=request.client.host if request.client else None,
    )

    # Send email notification to new_admin
    if new_admin and count > 0:
        frontend_url = os.getenv("FRONTEND_URL", "https://aicpa.duckdns.org")
        dashboard_link = f"{frontend_url}/admin-dashboard"
        super_admin_name = current_user.name or current_user.email
        items_html = "".join(f"<li style='margin:4px 0;'>{name}</li>" for name in client_names[:10])
        if len(client_names) > 10:
            items_html += f"<li style='margin:4px 0;color:#64748b;'><em>...and {len(client_names) - 10} more clients</em></li>"

        email_body = f"""
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#1e293b;max-width:580px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
          <div style="background-color:#0f172a;padding:24px 28px;text-align:left;">
            <h2 style="color:#ffffff;margin:0;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Admin Portal</h2>
            <p style="color:#94a3b8;margin:6px 0 0 0;font-size:13px;">Batch Client Portfolio Assignment Notification</p>
          </div>
          <div style="padding:28px;">
            <p style="font-size:15px;margin-top:0;">Hello <strong>{new_admin.name or 'Admin'}</strong>,</p>
            <p style="font-size:14px;color:#334155;">Super Admin <strong>{super_admin_name}</strong> has assigned <strong>{count} client(s)</strong> to your portfolio:</p>
            <ul style="background-color:#f8fafc;border-left:4px solid #0284c7;padding:12px 16px 12px 32px;margin:20px 0;border-radius:6px;font-size:14px;">
              {items_html}
            </ul>
            <p style="font-size:14px;color:#475569;">You can view and manage these clients in your Admin Dashboard.</p>
            <div style="margin:28px 0 16px;">
              <a href="{dashboard_link}" style="background-color:#0284c7;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;display:inline-block;">
                Go to Admin Dashboard →
              </a>
            </div>
          </div>
          <div style="background-color:#f1f5f9;padding:16px 28px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
            This is an automated notification from the Admin Portal.
          </div>
        </div>
        """
        background.add_task(
            send_email,
            to=new_admin.email,
            subject=f"{count} New Clients Assigned to Your Portfolio",
            body=email_body,
        )

    return {
        "success": True,
        "count": count,
        "assigned_admin_id": new_admin.id if new_admin else None,
        "assigned_admin_name": new_admin.name if new_admin else None,
        "message": f"Assigned {count} clients to {new_admin_name}",
    }



