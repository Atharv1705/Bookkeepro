import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.limiter import limiter
from app import models
from app.db import engine

log = logging.getLogger("uvicorn.error")

app = FastAPI(title="BookKeepPro API", docs_url=None, redoc_url=None)  # hide docs in production

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Create DB tables on startup (new tables only — does not alter existing)
models.Base.metadata.create_all(bind=engine)

# ─────────────────────────────────────────────
# Routers — isolated so one failure never kills the others
# ─────────────────────────────────────────────
try:
    from app.routers import auth      # type: ignore
    app.include_router(auth.router)
except Exception as exc:
    log.exception("Failed to load auth router: %s", exc)

try:
    from app.routers import upload    # type: ignore
    app.include_router(upload.router)
except Exception as exc:
    log.exception("Failed to load upload router: %s", exc)

try:
    from app.routers import contact   # type: ignore
    app.include_router(contact.router)
except Exception as exc:
    log.exception("Failed to load contact router: %s", exc)

try:
    from app.routers import review    # type: ignore
    app.include_router(review.router)
except Exception as exc:
    log.exception("Failed to load review router: %s", exc)

try:
    from app.routers import chatbot   # type: ignore
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
        "https://aiindiacpa.duckdns.org,http://localhost:8000",
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
# Static files — fallback for when nginx is not in front
# In production, nginx serves /css, /assets, /images directly
# ─────────────────────────────────────────────
FRONTEND_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend")
)
DIST_DIR   = os.path.join(FRONTEND_DIR, "dist")
SPA_INDEX  = os.path.join(DIST_DIR, "index.html")


def _mount_if_exists(route: str, path: str, name: str) -> None:
    if os.path.isdir(path):
        app.mount(route, StaticFiles(directory=path), name=name)
        log.info("Mounted static %s → %s", route, path)


_mount_if_exists("/css",    os.path.join(DIST_DIR, "css"),    "css")
_mount_if_exists("/assets", os.path.join(DIST_DIR, "assets"), "assets")
_mount_if_exists("/images", os.path.join(DIST_DIR, "images"), "images")

# Ensure uploads directory exists
UPLOAD_DIR = os.path.abspath(os.path.join(FRONTEND_DIR, "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ─────────────────────────────────────────────
# Ops
# ─────────────────────────────────────────────

@app.get("/health", tags=["ops"])
def health():
    return {"status": "ok"}


@app.post("/logout", tags=["auth"])
def logout():
    return {"message": "Logged out"}


# ─────────────────────────────────────────────
# SPA catch-all — serve index.html for all non-API routes
# React Router handles client-side navigation
# ─────────────────────────────────────────────

@app.get("/{full_path:path}", tags=["frontend"])
def spa_fallback(full_path: str):
    if os.path.isfile(SPA_INDEX):
        return FileResponse(
            SPA_INDEX,
            headers={
                "Cache-Control": "no-store, no-cache, must-revalidate",
                "Pragma":        "no-cache",
                "Expires":       "0",
            },
        )
    raise HTTPException(
        status_code=404,
        detail="Frontend not built. Run 'npm run build' in /frontend.",
    )
