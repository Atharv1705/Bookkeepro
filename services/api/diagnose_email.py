import os
import sys
import socket
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Load .env
for p in [Path(__file__).resolve().parents[2] / ".env", Path(".env"), Path(__file__).resolve().parent / ".env"]:
    if p.is_file():
        load_dotenv(p)
        break

print("=== 1. Environment Variables Check ===")
smtp_host = os.getenv("SMTP_HOST")
smtp_port = int(os.getenv("SMTP_PORT", "587"))
smtp_user = os.getenv("SMTP_USER")
smtp_password = os.getenv("SMTP_PASSWORD")
mail_from = os.getenv("MAIL_FROM") or smtp_user
admin_email = os.getenv("ADMIN_EMAIL")

print(f"SMTP_HOST:     {smtp_host}")
print(f"SMTP_PORT:     {smtp_port}")
print(f"SMTP_USER:     {smtp_user}")
print(f"MAIL_FROM:     {mail_from}")
print(f"ADMIN_EMAIL:   {admin_email}")
print(f"SMTP_PASSWORD: {'SET (length: ' + str(len(smtp_password)) + ')' if smtp_password else 'NOT SET'}")

if not smtp_host or not smtp_user or not smtp_password:
    print("\n[FAIL] Missing required SMTP configuration in .env!")
    sys.exit(1)

print("\n=== 2. Network Connectivity (Port reachability) ===")
try:
    sock = socket.create_connection((smtp_host, smtp_port), timeout=10)
    sock.close()
    print(f"[OK] Successfully connected to {smtp_host}:{smtp_port}")
except Exception as e:
    print(f"[FAIL] Cannot connect to {smtp_host}:{smtp_port} -> {e}")
    print("WARNING: Outbound port 587 might be blocked by your VPS provider (e.g. Contabo firewall)!")

print("\n=== 3. Sending Test Email ===")
from app.utils.emailer import send_email

test_recipient = sys.argv[1] if len(sys.argv) > 1 else (admin_email or smtp_user)
print(f"Sending test email to: {test_recipient}...")

async def main():
    ok = await send_email(
        to=test_recipient,
        subject="[Test] BookKeepPro SMTP Diagnostic Test",
        body="<h3>BookKeepPro SMTP is working!</h3><p>This is a diagnostic verification email.</p>"
    )
    if ok:
        print(f"[SUCCESS] Email delivered successfully to {test_recipient}!")
    else:
        print(f"[FAIL] send_email returned False. Check the error log above.")

asyncio.run(main())
