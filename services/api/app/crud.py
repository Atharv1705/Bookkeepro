from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.models import User, AuditLog

# Single shared password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ─────────────────────────────────────────────
# User queries
# ─────────────────────────────────────────────

def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def create_user(
    db: Session,
    name: str,
    email: str,
    phone: str,
    password: str,
    role: str = "user",
    is_verified: int = 0,
) -> User:
    user = User(
        name=name,
        email=email,
        phone=phone,
        hashed_password=pwd_context.hash(password),
        role=role,
        is_verified=is_verified,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user_password(db: Session, user: User, hashed_password: str) -> None:
    user.hashed_password = hashed_password
    db.add(user)
    db.commit()
    db.refresh(user)


# ─────────────────────────────────────────────
# Password helpers
# ─────────────────────────────────────────────

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


# ─────────────────────────────────────────────
# Audit logging
# ─────────────────────────────────────────────

def log_action(
    db: Session,
    action: str,
    user_id: int | None = None,
    target: str | None = None,
    detail: str | None = None,
    ip_address: str | None = None,
) -> None:
    entry = AuditLog(
        user_id=user_id,
        action=action,
        target=target,
        detail=detail,
        ip_address=ip_address,
    )
    db.add(entry)
    db.commit()
