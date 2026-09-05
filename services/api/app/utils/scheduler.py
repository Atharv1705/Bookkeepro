"""
scheduler.py — Daily background job to send filing deadline reminders.

Checks for deadlines that are 7 days or 1 day away and sends reminder emails
to both the user and all admins/super-admins.
"""

import logging
from datetime import date, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

_scheduler = BackgroundScheduler(timezone="UTC")


def _run_deadline_reminders():
    """Check all upcoming deadlines and dispatch reminder emails."""
    # Import inside to avoid circular imports at module load
    from app.db import SessionLocal
    from app.models import FilingDeadline, User, UserRole
    from app.utils.emailer import send_email
    import asyncio

    db = SessionLocal()
    try:
        today = date.today()
        thresholds = [
            (7, "notified_7d", "7 days"),
            (1, "notified_1d", "1 day"),
        ]

        # Fetch all admins/super-admins to CC on reminders
        admins = db.query(User).filter(
            User.role.in_([UserRole.admin, UserRole.super_admin])
        ).all()
        admin_emails = [a.email for a in admins]

        for days_out, flag_col, label in thresholds:
            target_date = today + timedelta(days=days_out)
            deadlines = (
                db.query(FilingDeadline)
                .filter(
                    FilingDeadline.deadline_date == target_date,
                    getattr(FilingDeadline, flag_col) == False,
                )
                .all()
            )

            for dl in deadlines:
                user = db.query(User).filter(User.id == dl.user_id).first()
                if not user:
                    continue

                doc_label = dl.doc_type.capitalize()

                # Email to user
                user_body = f"""
                <p>Dear {user.name or "Sir/Ma'am"},</p>
                <p>This is a reminder that your <strong>{doc_label} document filing deadline</strong>
                is in <strong>{label}</strong> ({dl.deadline_date.strftime('%B %d, %Y')}).</p>
                <p>Please ensure all outstanding actions are completed before the deadline.</p>
                <p>Kind regards,<br><strong>BookKeepro Team</strong></p>
                """
                asyncio.get_event_loop().run_until_complete(
                    send_email(
                        to=user.email,
                        subject=f"Reminder: {doc_label} Filing Deadline in {label} — BookKeepro",
                        body=user_body,
                    )
                )

                # Email to all admins
                admin_body = f"""
                <p>Admin Notice:</p>
                <p>The <strong>{doc_label} filing deadline</strong> for client
                <strong>{user.name or user.email}</strong> ({user.email}) is in
                <strong>{label}</strong> ({dl.deadline_date.strftime('%B %d, %Y')}).</p>
                <p>Please review the client's status and take any necessary action.</p>
                <p><strong>BookKeepro System</strong></p>
                """
                for admin_email in admin_emails:
                    asyncio.get_event_loop().run_until_complete(
                        send_email(
                            to=admin_email,
                            subject=f"Admin Reminder: {user.email} — {doc_label} Deadline in {label}",
                            body=admin_body,
                        )
                    )

                # Mark as notified
                setattr(dl, flag_col, True)
                db.commit()

                logger.info(
                    "Sent %s deadline reminder for user %s (%s)",
                    label, dl.user_id, dl.doc_type,
                )
    except Exception as exc:
        logger.error("Deadline reminder job failed: %s", exc)
    finally:
        db.close()


def start_scheduler():
    """Start the APScheduler. Called once at application startup."""
    if _scheduler.running:
        return

    # Run every day at 08:00 UTC
    _scheduler.add_job(
        _run_deadline_reminders,
        trigger=CronTrigger(hour=8, minute=0, timezone="UTC"),
        id="filing_deadline_reminders",
        replace_existing=True,
        misfire_grace_time=3600,  # If the server was down, run if missed by < 1 hr
    )
    _scheduler.start()
    logger.info("APScheduler started — filing deadline reminders active.")


def stop_scheduler():
    """Gracefully stop the scheduler at application shutdown."""
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped.")
