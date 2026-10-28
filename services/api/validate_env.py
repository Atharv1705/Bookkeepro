import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Try loading .env from repo root or current directory
for env_candidate in [
    Path(__file__).resolve().parents[2] / ".env",
    Path(__file__).resolve().parent / ".env",
    Path(".env")
]:
    if env_candidate.is_file():
        load_dotenv(env_candidate)
        break

REQUIRED_VARS = [
    "MYSQL_USER",
    "MYSQL_PASSWORD",
    "MYSQL_DATABASE",
    "SECRET_KEY",
    "SMTP_PASSWORD",
    "OPENROUTER_API_KEY"
]

def main():
    missing = []
    placeholder_values = {
        "your_password", "your_password_here", "password", "secret",
        "your_secret_key", "changeme", "change_me", "placeholder",
        "your_api_key_here", "example", "admin"
    }
    for var in REQUIRED_VARS:
        val = os.getenv(var)
        if not val or not val.strip():
            missing.append(var)
        elif val.lower().strip() in placeholder_values or val.lower().startswith("your_") or val.lower().endswith("_here"):
            if var in ["SECRET_KEY", "MYSQL_PASSWORD"]:
                missing.append(f"{var} (looks like a placeholder)")
            else:
                print(f"WARNING: The value for {var} looks like a placeholder. Some features may not work.")
            
    if missing:
        print(f"ERROR: The following required environment variables are missing or invalid: {', '.join(missing)}")
        print("Please check your .env file or environment configuration.")
        sys.exit(1)
        
    print("Environment validation passed.")
    sys.exit(0)

if __name__ == "__main__":
    main()
