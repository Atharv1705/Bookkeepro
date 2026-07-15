from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime


# ─────────────────────────────────────────────
# Auth
# ─────────────────────────────────────────────

class SignupRequest(BaseModel):
    name:     str
    email:    EmailStr          # validates format, not just a plain str
    phone:    Optional[str] = None
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be blank")
        return v.strip()


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token:               str
    token_type:                 str
    role:                       Optional[str]  = None
    user_id:                    Optional[int]  = None
    email_verification_required: Optional[bool] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResendVerificationRequest(BaseModel):
    """Dedicated schema so resend-verification isn't sharing ForgotPasswordRequest."""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token:        str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class RoleChangeRequest(BaseModel):
    """Body for PATCH /api/auth/admin/users/{id}/role — super_admin only."""
    role: str

    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v: str) -> str:
        allowed = {"user", "admin"}   # super_admin is DB-only, never assignable via API
        if v.lower() not in allowed:
            raise ValueError(f"Role must be one of: {', '.join(sorted(allowed))}")
        return v.lower()


# ─────────────────────────────────────────────
# Review schemas
# ─────────────────────────────────────────────

class SubmitReviewRequest(BaseModel):
    user_id: int


class NotifyUserRequest(BaseModel):
    user_id: int
    type: str = "personal"
    approved: List[str] = []
    rejected: List[str] = []
    personal_timeline: int = 0
    business_timeline: int = 0

    @field_validator("approved", "rejected")
    @classmethod
    def cap_list_length(cls, v: List[str]) -> List[str]:
        if len(v) > 100:
            raise ValueError("List may not contain more than 100 items")
        return v

    @field_validator("type")
    @classmethod
    def valid_type(cls, v: str) -> str:
        if v not in ("personal", "business"):
            raise ValueError("type must be 'personal' or 'business'")
        return v


class AdminDocResponseRequest(BaseModel):
    doc_id: int
    status: str
    reason: str = ""

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: str) -> str:
        if v not in ("approved", "rejected"):
            raise ValueError("status must be 'approved' or 'rejected'")
        return v

    @field_validator("reason")
    @classmethod
    def cap_reason(cls, v: str) -> str:
        if len(v) > 1000:
            raise ValueError("Reason must be 1000 characters or fewer")
        return v


class ReviewStatusUpdate(BaseModel):
    """Body for PATCH /api/upload/{personal,business}-documents/{id}/review-status"""
    status: str
    note:   str = ""

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: str) -> str:
        if v not in ("approved", "rejected", "pending"):
            raise ValueError("status must be 'approved', 'rejected', or 'pending'")
        return v

    @field_validator("note")
    @classmethod
    def cap_note(cls, v: str) -> str:
        if len(v) > 500:
            raise ValueError("Note must be 500 characters or fewer")
        return v




class PersonalDocumentOut(BaseModel):
    id:          int
    doc_type:    str
    filename:    str
    storage_key: str
    uploaded_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class BusinessDocumentOut(BaseModel):
    id:            int
    business_type: str
    filename:      str
    storage_key:   str
    uploaded_at:   Optional[datetime] = None

    model_config = {"from_attributes": True}


class AdminDocumentOut(BaseModel):
    id:          int
    doc_key:     str
    doc_label:   str
    filename:    str
    storage_key: str
    uploaded_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# Upload notification schema
# ─────────────────────────────────────────────

class UploadCompleteNotify(BaseModel):
    doc_category: str   # "Personal" | "Business"
    file_count:   int

    @field_validator("doc_category")
    @classmethod
    def valid_category(cls, v: str) -> str:
        if v not in ("Personal", "Business"):
            raise ValueError("doc_category must be 'Personal' or 'Business'")
        return v

    @field_validator("file_count")
    @classmethod
    def positive_count(cls, v: int) -> int:
        if v < 1:
            raise ValueError("file_count must be at least 1")
        return v
