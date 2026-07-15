import os
import logging
import smtplib
from email.message import EmailMessage
from pathlib import Path
from dotenv import load_dotenv

import aiosmtplib

logger = logging.getLogger(__name__)

# Load .env from project root (4 parents up: utils -> app -> api -> services -> Bookkeep)
BASE_DIR = Path(__file__).resolve().parents[4]
load_dotenv(BASE_DIR / ".env", override=True)


async def send_email(to: str, subject: str, body: str) -> bool:
    """
    Send an HTML email via SMTP using the configured mail settings.
    Falls back gracefully — errors are logged but never crash the caller.
    Returns True on success, False on any failure.
    """
    try:
        if not to or "@" not in to:
            logger.warning(f"Invalid recipient email: {to}")
            return False

        smtp_host = os.getenv("SMTP_HOST")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER")
        smtp_password = os.getenv("SMTP_PASSWORD")
        mail_from_email = os.getenv("MAIL_FROM") or smtp_user
        mail_from_name = os.getenv("MAIL_FROM_NAME", "BookKeepro")
        smtp_tls = os.getenv("SMTP_TLS", "True").strip().lower() == "true"
        smtp_ssl_tls = os.getenv("MAIL_SSL_TLS", "False").strip().lower() == "true"

        if not smtp_host:
            logger.warning("SMTP_HOST not set — email skipped")
            return False

        if not mail_from_email:
            logger.warning("MAIL_FROM not set — email skipped")
            return False

        message = EmailMessage()
        message["From"] = f"{mail_from_name} <{mail_from_email}>"
        message["To"] = to
        message["Subject"] = subject
        message.set_content("This email requires an HTML-capable email client.")
        message.add_alternative(body, subtype="html")

        await aiosmtplib.send(
            message,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user,
            password=smtp_password,
            start_tls=smtp_tls and not smtp_ssl_tls,
            use_tls=smtp_ssl_tls,
            timeout=15,
        )

        logger.info(f"Email sent to {to} via SMTP: {subject}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")
        return False
