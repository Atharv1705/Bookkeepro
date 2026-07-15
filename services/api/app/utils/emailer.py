import os
import logging
from pathlib import Path
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load .env from project root
BASE_DIR = Path(__file__).resolve().parents[3]
load_dotenv(BASE_DIR / ".env")


def _build_mail_client():
    """Build FastMail client lazily so a bad SMTP config never crashes the app on startup."""
    try:
        from fastapi_mail import FastMail, ConnectionConfig

        smtp_user = os.getenv("SMTP_USER")
        smtp_password = os.getenv("SMTP_PASSWORD")
        mail_from = os.getenv("MAIL_FROM")
        smtp_host = os.getenv("SMTP_HOST")

        # Refuse to build a broken config — missing critical values
        if not all([smtp_user, smtp_password, mail_from, smtp_host]):
            logger.warning(
                "Email not configured: one or more SMTP env vars are missing. "
                "Set SMTP_USER, SMTP_PASSWORD, MAIL_FROM, SMTP_HOST in .env"
            )
            return None

        # Guard against placeholder value
        if "PASTE" in (smtp_password or "").upper():
            logger.warning(
                "SMTP_PASSWORD looks like a placeholder. "
                "Set a real SMTP Password in .env"
            )
            return None

        conf = ConnectionConfig(
            MAIL_USERNAME=smtp_user,
            MAIL_PASSWORD=smtp_password,
            MAIL_FROM=mail_from,
            MAIL_PORT=int(os.getenv("SMTP_PORT", "587")),
            MAIL_SERVER=smtp_host,
            MAIL_STARTTLS=os.getenv("SMTP_TLS", "True").strip().lower() == "true",
            MAIL_SSL_TLS=os.getenv("MAIL_SSL_TLS", "False").strip().lower() == "true",
            MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME", "BookKeepro"),
        )
        return FastMail(conf)

    except Exception as e:
        logger.error(f"Failed to initialise email client: {e}")
        return None


async def send_email(to: str, subject: str, body: str) -> bool:
    """
    Send an HTML email. Returns True on success, False on any failure.
    Errors are logged but never crash the caller.
    """
    try:
        if not to or "@" not in to:
            logger.warning(f"Invalid recipient email: {to}")
            return False

        fm = _build_mail_client()
        if fm is None:
            logger.warning(f"Email skipped (client not configured) — would have sent to {to}: {subject}")
            return False

        from fastapi_mail import MessageSchema
        message = MessageSchema(
            subject=subject,
            recipients=[to],
            body=body,
            subtype="html",
        )

        await fm.send_message(message)
        logger.info(f"Email sent to {to}: {subject}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")
        return False
