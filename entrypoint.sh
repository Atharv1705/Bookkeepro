#!/bin/sh
# entrypoint.sh -- fix volume ownership then drop to appuser
# Runs as root (before USER appuser in Dockerfile) so it can chown.
# The CMD is then exec'd as appuser via gosu/su-exec.
set -e

# Fix ownership of bind-mounted volumes that may have been created by root.
chown -R appuser:appuser /app/uploads /app/services/api/chroma_db 2>/dev/null || true

# Run migrations
echo "[entrypoint] Running DB migrations..."
su-exec appuser python /app/services/api/migrate.py

# Hand off to the real command (uvicorn) as appuser
echo "[entrypoint] Starting app as appuser..."
exec su-exec appuser "$@"
