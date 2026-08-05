import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.limiter import limiter
from app import models
from app.db import engine

log = logging.getLogger("uvicorn.error")

app = FastAPI(title="BookKeepPro API")

# Rate limiter — import from limiter.py to avoid circular imports
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Create DB tables on startup (new tables only — does not alter existing)
models.Base.metadata.create_all(bind=engine)

# ─────────────────────────────────────────────
# Routers — each isolated so one failure never kills the others
# ─────────────────────────────────────────────
try:
    from app.routers import auth  # type: ignore
    app.include_router(auth.router)
except Exception as exc:
    log.exception("Failed to load auth router: %s", exc)

try:
    from app.routers import upload  # type: ignore
    app.include_router(upload.router)
except Exception as exc:
    log.exception("Failed to load upload router: %s", exc)

try:
    from app.routers import contact  # type: ignore
    app.include_router(contact.router)
except Exception as exc:
    log.exception("Failed to load contact router: %s", exc)

try:
    from app.routers import review  # type: ignore
    app.include_router(review.router)
except Exception as exc:
    log.exception("Failed to load review router: %s", exc)

try:
    from app.routers import chatbot  # type: ignore
    app.include_router(chatbot.router)
except Exception as exc:
    log.exception("Failed to load chatbot router: %s", exc)

# ─────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────
_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "ALLOWED_ORIGINS",
        "https://bookkeepro.net,http://localhost:8000",
    ).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Static file mounts
# ─────────────────────────────────────────────
FRONTEND_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend")
)


def mount_if_exists(route: str, subdir: str, name: str):
    path = os.path.join(FRONTEND_DIR, subdir)
    if os.path.isdir(path):
        app.mount(route, StaticFiles(directory=path), name=name)
        log.info("Mounted static %s -> %s", route, path)
    else:
        log.debug("Static directory not found, skipping: %s", path)


mount_if_exists("/js",     "dist/js",     "js")
mount_if_exists("/images", "dist/images", "images")
mount_if_exists("/css",    "dist/css",    "css")

# Mount Vite build assets (JS bundles, hashed chunks)
DIST_ASSETS = os.path.join(FRONTEND_DIR, "dist", "assets")
if os.path.isdir(DIST_ASSETS):
    app.mount("/assets", StaticFiles(directory=DIST_ASSETS), name="assets")
    log.info("Mounted Vite assets -> %s", DIST_ASSETS)

UPLOAD_DIR = os.path.abspath(os.path.join(FRONTEND_DIR, "..", "uploads"))
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR, exist_ok=True)

log.info("FRONTEND_DIR resolved to: %s", FRONTEND_DIR)
log.info("CSS dir exists: %s", os.path.isdir(os.path.join(FRONTEND_DIR, "css")))

DIST_DIR = os.path.join(FRONTEND_DIR, "dist")
SPA_INDEX = os.path.join(DIST_DIR, "index.html")

# Mount the Vite dist folder for hashed static assets not already mounted above
# (favicon, icons.svg, etc.)
if os.path.isdir(DIST_DIR):
    # Serve root-level static assets that Vite places at dist/
    app.mount("/dist", StaticFiles(directory=DIST_DIR), name="dist_root")


# ─────────────────────────────────────────────
# Ops endpoints
# ─────────────────────────────────────────────

@app.get("/health", tags=["ops"])
def health():
    """Health check for monitoring and load balancers."""
    return {"status": "ok"}


@app.post("/logout", tags=["auth"])
def logout():
    # JWT is stateless — token is invalidated client-side by clearing localStorage
    return {"message": "Logged out"}


# ─────────────────────────────────────────────
# SPA catch-all — serve index.html for every non-API GET route
# so React Router handles client-side navigation on direct URL access
# ─────────────────────────────────────────────

@app.get("/{full_path:path}", tags=["frontend"])
def spa_fallback(full_path: str):
    if os.path.isfile(SPA_INDEX):
        return FileResponse(
            SPA_INDEX,
            headers={
                "Cache-Control": "no-store, no-cache, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )
    raise HTTPException(status_code=404, detail="Frontend not built. Run 'npm run build' in /frontend.")
