import os
import logging
from fastapi import FastAPI, HTTPException, Request
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


mount_if_exists("/js",     "js",     "js")
mount_if_exists("/images", "images", "images")
mount_if_exists("/css",    "css",    "css")

UPLOAD_DIR = os.path.abspath(os.path.join(FRONTEND_DIR, "..", "uploads"))
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR, exist_ok=True)

log.info("FRONTEND_DIR resolved to: %s", FRONTEND_DIR)
log.info("CSS dir exists: %s", os.path.isdir(os.path.join(FRONTEND_DIR, "css")))


from fastapi.templating import Jinja2Templates

templates = Jinja2Templates(directory=FRONTEND_DIR)

def serve_frontend_file(request: Request, filename: str):
    full = os.path.join(FRONTEND_DIR, filename)
    if os.path.isfile(full):
        return templates.TemplateResponse(
            name=filename,
            context={"request": request},
            headers={
                "Cache-Control": "no-store, no-cache, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )
    log.warning("Frontend file not found: %s", full)
    raise HTTPException(status_code=404, detail="Page not found")


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
# Frontend page routes
# ─────────────────────────────────────────────

@app.get("/",                   tags=["frontend"]) 
def home(request: Request):                     return serve_frontend_file(request, "home.html")

@app.get("/home",               tags=["frontend"])#route to home page
def home_page(request: Request):                return serve_frontend_file(request, "home.html")

@app.get("/login",              tags=["frontend"]) #route to login page
def login_page(request: Request):               return serve_frontend_file(request, "login.html") 

@app.get("/signup",             tags=["frontend"]) #route to signup page
def signup_page(request: Request):              return serve_frontend_file(request, "signup.html") 

@app.get("/dashboard",          tags=["frontend"])
def dashboard_page(request: Request):           return serve_frontend_file(request, "dashboard.html") #route to dashboard page

@app.get("/admin-dashboard",    tags=["frontend"])
def admin_dashboard_page(request: Request):     return serve_frontend_file(request, "admin-dashboard.html") #route to admin dashboard page

@app.get("/admin-user-detail",  tags=["frontend"])
def admin_user_detail(request: Request):        return serve_frontend_file(request, "admin-user-detail.html") #route to admin-user-detail page

@app.get("/upload-personal",    tags=["frontend"])
def upload_personal(request: Request):          return serve_frontend_file(request, "upload-personal.html") #route to upload-personal

@app.get("/upload-business",    tags=["frontend"])
def upload_business(request: Request):          return serve_frontend_file(request, "upload-business.html") #route to upload-business

@app.get("/contact",            tags=["frontend"])
def contact_page(request: Request):             return serve_frontend_file(request, "contact.html") #route to contact page

@app.get("/services",           tags=["frontend"])
def services_page(request: Request):            return serve_frontend_file(request, "services.html") #route to service page

@app.get("/about-us",           tags=["frontend"])
def about_us_page(request: Request):            return serve_frontend_file(request, "about-us.html") # route to about-us page


@app.get("/forgot-password",    tags=["frontend"])
def forgot_password_page(request: Request):     return serve_frontend_file(request, "forgot-password.html")

@app.get("/profile",            tags=["frontend"])
def profile_page(request: Request):             return serve_frontend_file(request, "profile.html") #route to forgot-password page

@app.get("/reset-password",     tags=["frontend"])
def reset_password_page(request: Request):      return serve_frontend_file(request, "reset-password.html") #route to reset-password page

@app.get("/verify-email",       tags=["frontend"])
def verify_email_page(request: Request):        return serve_frontend_file(request, "verify-email.html")# route to verify-email page

@app.get("/resend-verification", tags=["frontend"]) # route to resend-verification page
def resend_verification_page(request: Request): return serve_frontend_file(request, "resend-verification.html")
