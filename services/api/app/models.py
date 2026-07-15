from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship
from app.db import Base
import enum


# ─────────────────────────────────────────────
# Enums
# ─────────────────────────────────────────────

class UserRole(str, enum.Enum):
    user        = "user"
    admin       = "admin"
    super_admin = "super_admin"


# ─────────────────────────────────────────────
# Users
# ─────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String(150), nullable=True)
    email           = Column(String(200), unique=True, index=True, nullable=False)
    phone           = Column(String(50), default="")
    hashed_password = Column(String(300), nullable=False)
    role            = Column(Enum(UserRole), default=UserRole.user, nullable=False)
    is_verified     = Column(Integer, default=0, nullable=False)   # 0 = unverified, 1 = verified
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    engagement_acknowledged_at = Column(DateTime(timezone=True), nullable=True, default=None)


# ─────────────────────────────────────────────
# Documents — user-uploaded
# ─────────────────────────────────────────────

class PersonalDocument(Base):
    __tablename__ = "personal_documents"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    doc_type     = Column(String(200), nullable=False)
    filename     = Column(String(512), nullable=False)
    storage_key  = Column(String(500), nullable=False)
    content_type = Column(String(100))
    uploaded_at  = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at   = Column(DateTime(timezone=True), nullable=True, default=None)
    review_status = Column(String(20), default="pending", nullable=False)
    review_note   = Column(String(500), nullable=True)
    tax_year      = Column(Integer, default=2025, nullable=False)

    user = relationship("User")

    __table_args__ = (
        Index("ix_personal_documents_user_id", "user_id"),
        UniqueConstraint(
            "user_id", "doc_type", "tax_year",
            name="uq_personal_doc_user_type_year"
        ),
    )


class BusinessDocument(Base):
    __tablename__ = "business_documents"

    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    business_type = Column(String(200), nullable=False)
    filename      = Column(String(512), nullable=False)
    storage_key   = Column(String(500), nullable=False)
    content_type  = Column(String(100))
    uploaded_at   = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at    = Column(DateTime(timezone=True), nullable=True, default=None)
    review_status = Column(String(20), default="pending", nullable=False)
    review_note   = Column(String(500), nullable=True)
    tax_year      = Column(Integer, default=2025, nullable=False)

    user = relationship("User")

    __table_args__ = (
        Index("ix_business_documents_user_id", "user_id"),
        UniqueConstraint(
            "user_id", "business_type", "tax_year",
            name="uq_business_doc_user_type_year"
        ),
    )


# ─────────────────────────────────────────────
# Documents — admin-uploaded (tax returns for client review)
# ─────────────────────────────────────────────

class AdminDocument(Base):
    __tablename__ = "admin_documents"

    id          = Column(Integer, primary_key=True, index=True)
    doc_key     = Column(String(100), nullable=False, index=True)   # machine-readable slug
    doc_label   = Column(String(150), nullable=False)               # display name
    filename    = Column(String(512), nullable=False)
    storage_key = Column(String(500), nullable=False)               # S3 object key
    content_type = Column(String(100))
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)   # admin user
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)   # target client
    deleted_at  = Column(DateTime(timezone=True), nullable=True, default=None)

    admin = relationship("User", foreign_keys=[uploaded_by])
    user  = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        Index("ix_admin_documents_user_id",     "user_id"),
        Index("ix_admin_documents_uploaded_by", "uploaded_by"),
    )


# ─────────────────────────────────────────────
# Legacy table — kept to avoid breaking existing DB
# Nothing writes here anymore; safe to drop after verifying
# uploaded_files has zero rows in production.
# ─────────────────────────────────────────────

class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id           = Column(Integer, primary_key=True, index=True)
    filename     = Column(String(512), nullable=False)
    drive_file_id = Column(String(200), nullable=False)   # legacy column name
    content_type = Column(String(100))
    doc_type     = Column(String(150))
    uploaded_at  = Column(DateTime(timezone=True), server_default=func.now())
    owner_id     = Column(Integer, ForeignKey("users.id"), nullable=False)

    owner = relationship("User")


# ─────────────────────────────────────────────
# Audit Log
# ─────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action     = Column(String(100), nullable=False)   # e.g. "upload", "delete", "login", "approve"
    target     = Column(String(200), nullable=True)    # e.g. "personal_doc:42", "user:7"
    detail     = Column(String(500), nullable=True)    # extra context
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_audit_logs_user_id", "user_id"),
        Index("ix_audit_logs_created_at", "created_at"),
    )
class RequiredDocumentTemplate(Base):
    __tablename__ = "required_document_templates"

    id          = Column(Integer, primary_key=True, index=True)
    category    = Column(String(50), nullable=False) # 'personal' or 'business'
    tax_year    = Column(Integer, nullable=False)
    name        = Column(String(200), nullable=False)
    file_url    = Column(String(500), nullable=True) # Null if there is no template file to download
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("category", "tax_year", "name", name="uq_template_cat_year_name"),
    )
