import os
import logging
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, PlainTextResponse
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
        "https://aiindiacpa.duckdns.org",
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


class CachedStaticFiles(StaticFiles):
    """StaticFiles subclass that injects Cache-Control headers."""

    def __init__(self, *args, max_age: int = 86400, immutable: bool = False, **kwargs):
        super().__init__(*args, **kwargs)
        parts = [f"public, max-age={max_age}"]
        if immutable:
            parts.append("immutable")
        self._cache_control = ", ".join(parts)

    async def get_response(self, path, scope):        # type: ignore[override]
        resp = await super().get_response(path, scope)
        resp.headers["Cache-Control"] = self._cache_control
        return resp


def _mount_cached(route: str, path: str, name: str, **kwargs) -> None:
    if os.path.isdir(path):
        app.mount(route, CachedStaticFiles(directory=path, **kwargs), name=name)
        log.info("Mounted static %s → %s", route, path)


# Hashed filenames — cache forever
_mount_cached("/assets", os.path.join(DIST_DIR, "assets"), "assets",
              max_age=31_536_000, immutable=True)
# Images & CSS — cache for 1 day
_mount_cached("/css",    os.path.join(DIST_DIR, "css"),    "css",    max_age=86_400)
_mount_cached("/images", os.path.join(DIST_DIR, "images"), "images", max_age=86_400)

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
# Crawler files — must be served BEFORE the SPA catch-all
# ─────────────────────────────────────────────

@app.get("/robots.txt", tags=["seo"])
def robots_txt():
    robots_path = os.path.join(DIST_DIR, "robots.txt")
    if os.path.isfile(robots_path):
        return FileResponse(robots_path, media_type="text/plain")
    return PlainTextResponse("User-agent: *\nAllow: /\n")


@app.get("/llms.txt", tags=["seo"])
def llms_txt():
    llms_path = os.path.join(DIST_DIR, "llms.txt")
    if os.path.isfile(llms_path):
        return FileResponse(llms_path, media_type="text/plain")
    return PlainTextResponse("# BookKeepPro\n")


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
