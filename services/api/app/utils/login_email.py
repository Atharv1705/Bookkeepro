from app.utils.emailer import send_email


# async def send_login_welcome_email(to: str, name: str | None = None):
#     display_name = name or "Valued Customer"

#     body = f"""
#     <p>Dear {display_name},</p>

#     <p>
#       Welcome to <strong>BookKeepro</strong>
#     </p>

#     <p>
#       You have successfully logged in to your account.
#       We’re excited to support you with your compliance and bookkeeping needs.
#     </p>

#     <p>
#       You can access your dashboard anytime using the link below:
#     </p>

#     <p>
#       <a href="https://bookkeepro.net/dashboard"
#          style="color:#0077c8;font-weight:600;text-decoration:none;">
#         👉 Go to Dashboard
#       </a>
#     </p>

#     <p style="margin-top:20px;">
#       If this login was not initiated by you, please contact our support team immediately.
#     </p>

#     <p style="margin-top:20px;">
#       Kind regards,<br>
#       <strong>BookKeepro Team</strong>
#     </p>
#     """

#     await send_email(
#         to=to,
#         subject="Welcome to BookKeepro",
#         body=body
#     )




# app/utils/emailer.py

async def send_signup_welcome_email(to: str, name: str | None = None):
    display_name = name or "Valued Customer"

    body = f"""
    <p>Dear {display_name},</p>

    <p>
      Welcome to <strong>BookKeepro</strong> 🎉
    </p>

    <p>
      Your account has been successfully created.
      We’re excited to support you with your compliance and bookkeeping needs.
    </p>

    <p>
      You can log in to your dashboard using the link below:
    </p>

    <p>
      <a href="https://bookkeepro.net/login"
         style="color:#0077c8;font-weight:600;text-decoration:none;">
        👉 Login to BookKeepro
      </a>
    </p>

    <p style="margin-top:20px;">
      If you did not create this account, please contact our support team immediately.
    </p>

    <p style="margin-top:20px;">
      Kind regards,<br>
      <strong>BookKeepro Team</strong>
    </p>
    """

    await send_email(
        to=to,
        subject="Welcome to BookKeepro 🎉",
        body=body
    )
