# Contabo VPS Deployment Guide

## Prerequisites

- Docker + Docker Compose installed on the VPS
- Port 80 open in Contabo firewall and VPS firewall (`ufw allow 80`)
- Node.js 18+ installed locally (for the frontend build)

---

## First-time deployment

### 1. Clone the repo

```bash
git clone https://github.com/Atharv1705/Bookkeepro.git
cd Bookkeepro
```

### 2. Create `.env` from the example

```bash
cp .env.example .env
# Edit .env — fill in MYSQL_PASSWORD, SECRET_KEY, SMTP_PASSWORD, OPENROUTER_API_KEY
nano .env
```

**Required variables in `.env`:**
```
MYSQL_HOST=db
MYSQL_USER=root
MYSQL_PASSWORD=<strong-password>
MYSQL_DATABASE=bookkeepprodb
SECRET_KEY=<64-char-random-hex>
ALLOWED_ORIGINS=http://<your-ip>,https://bookkeepro.net
OPENROUTER_API_KEY=<your-key>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-gmail>
SMTP_PASSWORD=<app-password>
MAIL_FROM=<your-gmail>
ADMIN_EMAIL=<admin-email>
```

### 3. Build the frontend

⚠️ **This step is required.** nginx serves `frontend/dist` directly from the host.
If this folder is missing or stale, the UI will not load.

```bash
# On VPS or locally (then scp the dist/ folder to VPS)
cd frontend
npm install
npm run build
cd ..
```

### 4. Start all services

```bash
docker compose up -d --build
```

This starts: `nginx` (port 80), `app` (FastAPI, internal), `db` (MySQL, internal).

### 5. Run database migrations

On first deploy, run the SQL migrations to create all required columns and tables:

```bash
# Add extracted_data JSON columns (idempotent — safe to re-run)
docker exec $(docker compose ps -q app) python migrate.py

# Apply schema changes for engagement acknowledgement + unique indexes
docker exec $(docker compose ps -q app) python -c "
import subprocess, os
os.chdir('/app/services/api')
subprocess.run(['python', '-c', '''
from app.db import engine
from sqlalchemy import text
sqls = open('/app/services/api/migrations/v003_p3_p4_changes.sql').read()
with engine.begin() as c:
    for stmt in sqls.split(';'):
        s = stmt.strip()
        if s:
            try: c.execute(text(s))
            except Exception as e: print(f\"Skipped: {e}\")
print(\"v003 done\")
'''])
"

# Create required_document_templates table + seed data
docker exec $(docker compose ps -q app) python -c "
from app.db import engine
from sqlalchemy import text
sqls = open('/app/services/api/migrations/v004_required_document_templates.sql').read()
with engine.begin() as c:
    for stmt in sqls.split(';'):
        s = stmt.strip()
        if s:
            try: c.execute(text(s))
            except Exception as e: print(f'Skipped: {e}')
print('v004 done')
" 2>/dev/null || true
```

### 6. Create the first super admin

```bash
docker exec -it $(docker compose ps -q app) python create_super_admin.py
```

### 7. Verify everything is running

```bash
docker compose ps                    # all 3 containers should be Up
curl http://localhost/health         # should return {"status":"ok"}
docker compose logs app | tail -20   # check for "Application startup complete"
docker compose logs app | grep "Failed to load"  # should be empty
```

---

## Updating to a new version

```bash
git pull

# Rebuild frontend if any frontend files changed
cd frontend && npm install && npm run build && cd ..

# Rebuild and restart (DB volume is preserved — no data loss)
docker compose up -d --build app nginx

# Run migrations if schema changed
docker exec $(docker compose ps -q app) python migrate.py

# Re-run AI extraction backfill if needed
docker exec $(docker compose ps -q app) python backfill_extraction.py
```

---

## HTTPS (required for production with real client data)

```bash
# Install certbot
apt install certbot python3-certbot-nginx

# Get certificate (replace with your domain)
certbot --nginx -d bookkeepro.net -d www.bookkeepro.net

# Update ALLOWED_ORIGINS in .env to use https://
# Update FRONTEND_URL in .env to use https://
docker compose restart app
```

---

## Backup database

```bash
# Run before any major upgrade
docker exec $(docker compose ps -q db) \
  mysqldump -uroot -p"${MYSQL_PASSWORD}" bookkeepprodb \
  > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## Troubleshooting

| Symptom | Check |
|---|---|
| UI loads blank / 404 | Run `npm run build` in `frontend/` — dist is missing |
| API returns 500 | `docker compose logs app` — look for startup errors |
| Chatbot/upload 500 | `docker compose logs app \| grep "Failed to load"` — router failed to load |
| Login fails | Check `MYSQL_HOST=db` in `.env` (not `localhost`) |
| Emails not sending | Verify Gmail App Password in `.env`, check SMTP_PASSWORD has no spaces |
