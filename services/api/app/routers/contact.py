import os
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from app.limiter import limiter
from pydantic import BaseModel, EmailStr
from app.utils.emailer import send_email

router = APIRouter(prefix="/api", tags=["contact"])

# Get admin email from environment, with fallback
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@bookkeepro.net")

class ContactForm(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    message: str = ""

@router.post("/contact")
@limiter.limit("5/minute")
async def contact_message(request: Request, form: ContactForm, background: BackgroundTasks):
    if not ADMIN_EMAIL or "@" not in ADMIN_EMAIL:
        raise HTTPException(status_code=500, detail="Admin email not configured")
    background.add_task(
        send_email,
        to=ADMIN_EMAIL,
        subject="New Contact Enquiry Received — Follow-Up Required - BookKeepro",
        body=f"""
            Dear Team,
            <br><br>
            A new contact enquiry has been received. Please find the details below:
            <br><br>
            <b>Name:</b> {form.first_name} {form.last_name}<br>
            <b>Email:</b> {form.email}<br>
            <b>Phone:</b> {form.phone}<br>
            <b>Message:</b> {form.message or '(none)'}<br><br>
            Kindly follow up with the user at the earliest convenience.
            <br><br>
            Thank you,<br>
            BookKeepro Support Team
        """
    )

    # auto-reply to user
    background.add_task(
        send_email,
        to=form.email,
        subject="Thanks for contacting BookKeepro",
        body=f"""
            Hi {form.first_name},<br><br>
            Thank you for reaching out to BookKeepro.<br>
            We’ve received your enquiry, and our team will get back to you shortly.<br><br>
            Best Regards,<br>
            BookKeepro Team
        """
    )

    return {"status": "sent"}
