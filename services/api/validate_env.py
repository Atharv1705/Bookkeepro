import os
import sys

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
    for var in REQUIRED_VARS:
        val = os.getenv(var)
        if not val:
            missing.append(var)
        elif "password" in val.lower() or "secret" in val.lower() or "your" in val.lower() or "here" in val.lower():
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
