import os
import html
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from app.limiter import limiter
from pydantic import BaseModel, EmailStr, field_validator
from app.utils.emailer import send_email

router = APIRouter(prefix="/api", tags=["contact"])

# Get admin email from environment, with fallback
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "atharvg.aiindia@gmail.com")

class ContactForm(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    message: str = ""

    @field_validator("message")
    @classmethod
    def cap_message(cls, v: str) -> str:
        if len(v) > 2000:
            raise ValueError("Message must be 2000 characters or fewer")
        return v

@router.post("/contact")
@limiter.limit("5/minute")
async def contact_message(request: Request, form: ContactForm, background: BackgroundTasks):
    if not ADMIN_EMAIL or "@" not in ADMIN_EMAIL:
        raise HTTPException(status_code=500, detail="Admin email not configured")
    safe_first = html.escape(form.first_name)
    safe_last = html.escape(form.last_name)
    safe_email = html.escape(str(form.email))
    safe_phone = html.escape(form.phone)
    safe_message = html.escape(form.message) if form.message else '(none)'

    background.add_task(
        send_email,
        to=ADMIN_EMAIL,
        subject="New Contact Enquiry Received — Follow-Up Required",
        body=f"""
            Dear Team,
            <br><br>
            A new contact enquiry has been received. Please find the details below:
            <br><br>
            <b>Name:</b> {safe_first} {safe_last}<br>
            <b>Email:</b> {safe_email}<br>
            <b>Phone:</b> {safe_phone}<br>
            <b>Message:</b> {safe_message}<br><br>
            Kindly follow up with the user at the earliest convenience.
            <br><br>
            Thank you,<br>
            Support Team
        """
    )

    # auto-reply to user
    background.add_task(
        send_email,
        to=form.email,
        subject="Thanks for contacting us",
        body=f"""
            Hi {safe_first},<br><br>
            Thank you for reaching out.<br>
            We’ve received your enquiry, and our team will get back to you shortly.<br><br>
            Best Regards,<br>
            Support Team
        """
    )

    return {"status": "sent"}
