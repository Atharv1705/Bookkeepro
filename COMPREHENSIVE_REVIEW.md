# BookKeepPro — Comprehensive Code Review

## Scores

| Area | Score | Notes |
|------|-------|-------|
| Architecture | 5/10 | FastAPI + MySQL foundation is sound; coupling, dead code, and SPA-less design weaken it |
| Security | 4/10 | Real credentials committed to `.env`, weak JWT secret, no rate-limiting, XSS vectors |
| Database Design | 5/10 | Four tables with no migration tool, legacy orphan table, missing indexes |
| API Design | 6/10 | Consistent REST style but mixed auth patterns, unvalidated inputs, duplicate endpoints |
| File Storage | 6/10 | Completed S3 migration from Google Drive, but placeholder keys still in `.env` |
| CPA Workflow | 5/10 | Core upload/review loop works; missing audit trail, e-signature, versioning |
| UI/UX | 6/10 | Clean responsive design; accessibility gaps, no loading states, inline HTML generation |
| Production Readiness | 3/10 | No Docker, no HTTPS config, secrets in repo, no monitoring, debug routes exposed |
| Scalability | 4/10 | Synchronous DB queries in async handlers, no caching, missing connection pooling config |
| Maintainability | 4/10 | Duplicate logic, lots of dead commented code, no tests, no API docs, scattered `...existing code...` |
| **Overall** | **4.8/10** | Functional prototype; needs significant hardening before any real client data is handled |


---

## 1. Architecture Review

**Overall pattern:** A single FastAPI process serves both the REST API and all frontend HTML files as static routes. There is no SPA framework, no build step, and no CDN layer.

**What works well:**
- Routers are split by domain (`auth`, `upload`, `review`, `contact`) which is sensible.
- SQLAlchemy ORM with a clean `get_db` dependency injection pattern.
- `pool_pre_ping=True` on the engine guards against stale connections.
- Background tasks (`BackgroundTasks`) keep email sending non-blocking.

**Structural problems:**

1. **Two duplicate auth modules.** `services/api/app/auth/security.py` contains the router AND all auth logic. `services/api/app/routers/auth.py` is a thin re-export that just re-exports `router` from `security.py`. Meanwhile, `services/api/app/auth/jwt_utils.py` exists as a second, independent JWT implementation that reads a different env var (`JWT_SECRET` vs `SECRET_KEY`) and is **never used**. This is a maintenance hazard and could lead to token-mismatch bugs if someone starts calling `jwt_utils.py`.

2. **Two overlapping document systems.** The legacy `UploadedFile` model + the `uploaded_files` table coexists with the new `PersonalDocument` / `BusinessDocument` / `AdminDocument` tables. The admin route `GET /api/auth/admin/users/{user_id}/documents` still queries `UploadedFile`, while the upload routes use the new tables. The admin user-detail page calls `/api/upload/admin/users/{user_id}/documents` which correctly uses the new tables — so depending on which endpoint the frontend calls, the admin sees different data.

3. **Frontend served by the API process.** Routes like `/home`, `/login`, `/dashboard` return raw `FileResponse`. This couples frontend delivery to the API's uptime and adds unnecessary load. For a CPA firm, the API process should be behind a reverse proxy (nginx/Caddy) that serves static files itself.

4. **CORS is open wildcard.** `allow_origins=["*"]` with `allow_credentials=True` is a configuration error — browsers actually block credentialed requests to wildcard origins. This will silently fail in production if credentials are ever sent via CORS.

5. **`main.py` contains a live test email endpoint** (`GET /test-email`) that fires a real email to `info@bookkeepro.net` on every HTTP GET. This should not exist in any deployed build.

6. **No environment-specific configuration.** There is one `.env` for everything. Production DB credentials, Gmail SMTP password, and development placeholders all live in the same file.


---

## 2. Security Audit

### 2.1 Secrets Committed to Repository

**Critical.** The `.env` file contains live production credentials:

- `MYSQL_PASSWORD=Atharv@1705` — production database root password
- `SMTP_PASSWORD=nghh mqxz tcxh fixy` — live Gmail App Password
- `SECRET_KEY=supersecretkey` — JWT signing key (trivially guessable, used in production)
- `ADMIN_EMAIL=atharvg.aiindia@gmail.com` — personal email
- A comment block containing what appear to be additional server credentials: `cg276A4iSSGw` and `3FHpewD45C3j`
- `oauth_token.json` and `credentials.json` are in the repo root — these are Google OAuth refresh tokens

The `.env` file should be in `.gitignore`. These credentials must be rotated immediately if this repo has ever been pushed to a remote.

### 2.2 JWT Secret Strength

`SECRET_KEY=supersecretkey` in `.env` is a weak, dictionary-guessable string. JWTs are signed with this key. An attacker who knows it can forge tokens for any user, including admins. Use at minimum a 256-bit random secret: `openssl rand -hex 32`.

### 2.3 Token Expiry Too Long

`ACCESS_TOKEN_EXPIRE_MINUTES=480` (8 hours). For an accounting firm with sensitive financial documents, tokens should expire in 30–60 minutes with refresh token rotation. There is currently no refresh token mechanism.

### 2.4 JWT Role Read from DB (Good)

`security.py: get_current_user()` correctly re-reads the user's role from the database on every request rather than trusting the role embedded in the JWT. This is a good pattern that prevents role escalation via JWT forgery.

### 2.5 No Rate Limiting

Login (`POST /api/auth/login`), forgot-password (`POST /api/auth/forgot-password`), and signup endpoints have no rate limiting. An attacker can brute-force passwords or enumerate registered emails at unlimited speed.

### 2.6 Password Policy Not Enforced

`schemas.py: SignupRequest.password` is a plain `str` with no minimum length, complexity, or common-password check. Users can sign up with a single character as their password.

### 2.7 XSS via innerHTML (Frontend)

Multiple HTML files construct DOM content using direct `innerHTML` assignment with server-supplied values:
- `admin-user-detail.html` — `detailName.textContent` is used (safe), but `renderRow()` inlines `doc.filename` directly into `tr.innerHTML` without sanitisation.
- `dashboard.html` — `d.doc_label` is spliced into `.map()` → `.join("")` → `list.innerHTML` without encoding.
- `upload-personal.html` and `upload-business.html` — `addOtherDocItem` inlines filenames into `div.innerHTML`.
- `admin-user-detail.html` `addOtherDoc` inlines `doc.drive` (a storage key) directly into an `onclick` attribute string — if the storage key ever contains a quote character this is an injection vector.

A malicious filename stored in the database would execute JavaScript in any admin's browser.

### 2.8 No File Type Validation on Backend

`upload.py: upload_to_storage()` accepts any file type. The frontend hints "PDF, JPG, PNG · Max 10MB" but neither the content-type nor the file extension is validated server-side. An attacker can upload an HTML file or SVG with embedded scripts. There is also no file size check in the backend — the 10MB limit is frontend-only.

### 2.9 Presigned URL Authorization Gap

`GET /api/upload/view-url?key=<any_key>` requires authentication (any valid user) but does **not** verify that the requesting user owns the document. Any authenticated user can call this endpoint with any object key and receive a presigned URL granting read access to another user's tax documents. This is a direct IDOR (Insecure Direct Object Reference) vulnerability.

### 2.10 Admin Role Check Duplicated and Inconsistent

Several admin endpoints call `_=Depends(require_admin)` AND then re-check `if current_user.role not in [UserRole.admin, ...]` inside the function body. This duplication is harmless but creates confusion. Some upload endpoints only have one layer; `delete_admin_document` has both. Pick one pattern and apply it consistently.

### 2.11 Contact Form — No Message Field

`routers/contact.py: ContactForm` collects name, email, phone — but **no message body**. A user filling the contact form has no way to explain what they need. This is both a UX and functional gap.

### 2.12 Debug / Test Routes in Production Code

`main.py` exposes `GET /test-email` — any unauthenticated visitor can trigger a real email send to the admin address. Remove before deployment.

### 2.13 `allow_credentials=True` with Wildcard CORS

As noted in Architecture: `CORSMiddleware(allow_origins=["*"], allow_credentials=True)` is an invalid combination per the CORS spec and will cause credential requests to fail in browsers. The correct fix is to enumerate the specific origin (e.g., `https://bookkeepro.net`).


---

## 3. Database Review

### 3.1 Models Overview

Five tables exist:
- `users` — core user table with role and email-verification flag
- `uploaded_files` — **legacy** table, still referenced by `crud.py` and one admin route; superseded by the three tables below
- `personal_documents` — user personal tax documents
- `business_documents` — user business tax documents
- `admin_documents` — documents uploaded by admin for the user to review

### 3.2 No Migration Tool

Tables are created via `models.Base.metadata.create_all(bind=engine)` at startup. There is no Alembic (or any migration tool). This means:
- Adding a column requires manual SQL or a `create_all` that does nothing to existing tables.
- Column renames or drops cannot be expressed in code.
- Production schema drift is inevitable as the codebase evolves.

### 3.3 Legacy `UploadedFile` / `uploaded_files` Table

`models.py` defines `UploadedFile` and `User.uploads` relationship. `crud.py` has `create_uploaded_file` and `delete_uploaded_file`. The `GET /api/auth/admin/users/{user_id}/documents` endpoint queries this table. However all upload routes now write to `PersonalDocument` / `BusinessDocument`. Unless some old code path still writes to `uploaded_files`, this table accumulates no new data but is still queried by the admin route — meaning admins see no documents for new users via that endpoint. This is a live data integrity bug.

### 3.4 Missing Indexes

- `personal_documents(user_id)` — no index; full table scan on every user document load
- `business_documents(user_id)` — same
- `admin_documents(user_id)` and `admin_documents(uploaded_by)` — no index
- `uploaded_files(owner_id)` — no index

For a small user base this is acceptable, but it should be addressed before scale.

### 3.5 Inconsistent Timestamp Column

`BusinessDocument.uploaded_at` is `Column(DateTime, ...)` (without `timezone=True`), while `PersonalDocument.uploaded_at` and all other timestamp columns use `Column(DateTime(timezone=True), ...)`. This can cause timezone-related bugs when comparing timestamps across tables.

### 3.6 `drive_file_id` Column Name Mismatch

The column is named `drive_file_id` in all document tables but now stores S3 object keys (e.g., `uploads/abc123.pdf`). Comments in `upload.py` acknowledge this ("column reused as storage_key"). This is a technical debt item that will confuse future developers.

### 3.7 No Soft Deletes / Audit Trail

Documents are hard-deleted with `db.delete(doc)`. For a CPA firm handling tax documents, there is a regulatory expectation of record retention. Hard deletes mean there is no way to recover a document after deletion or prove what was filed.

### 3.8 No Document Status Field

There is no `status` column on `PersonalDocument` or `BusinessDocument` (e.g., `pending`, `approved`, `rejected`). The admin's review state is stored only in `localStorage` in the browser — if the admin refreshes the page, all review decisions are lost. Nothing is persisted server-side.


---

## 4. API Review

| Method | Path | Issues Found |
|--------|------|-------------|
| POST | `/api/auth/signup` | No password minimum length; role field in `SignupRequest` lets any caller set `role="admin"` — see note below |
| POST | `/api/auth/login` | No rate limiting; `role` field in `LoginRequest` is checked but the field itself is unnecessary and misleading |
| GET | `/api/auth/verify-email` | Token passed as query param (logged in server access logs); consider POST with body |
| POST | `/api/auth/resend-verification` | Uses `ForgotPasswordRequest` schema (wrong semantic reuse) |
| POST | `/api/auth/forgot-password` | No rate limiting; email enumeration partially mitigated |
| POST | `/api/auth/reset-password` | No password complexity check on new password |
| GET | `/api/auth/me` | Fine |
| GET | `/api/auth/admin/users` | Returns all users including admins; no pagination |
| GET | `/api/auth/admin/users/{user_id}/documents` | Queries legacy `UploadedFile` table — returns empty for all new users |
| POST | `/api/upload/admin-documents` | Double auth check (require_admin + inline role check); redundant |
| GET | `/api/upload/admin-documents` | Fine |
| DELETE | `/api/upload/admin-documents/{doc_id}` | Double auth check redundancy |
| GET | `/api/upload/personal-documents` | Returns full ORM objects — no explicit field selection, leaks all columns |
| POST | `/api/upload/personal-documents` | No file size limit; no file type validation |
| DELETE | `/api/upload/personal-documents/{doc_id}` | Correctly scoped to owner |
| GET | `/api/upload/business-documents` | Same leakage issue as personal |
| POST | `/api/upload/business-documents` | No file size limit; no file type validation |
| DELETE | `/api/upload/business-documents/{doc_id}` | Correctly scoped to owner |
| GET | `/api/upload/view-url` | **IDOR** — any authenticated user can fetch a presigned URL for any object key |
| GET | `/api/upload/admin/users/{user_id}/documents` | Fine; correct table |
| DELETE | `/api/upload/admin/users/{user_id}` | Dangerous — no second confirmation server-side; no super_admin-only guard |
| POST | `/api/review/submit` | `payload: dict` — no Pydantic schema; `user_id` type not validated |
| POST | `/api/review/notify-user` | `payload: dict` — no Pydantic schema; `approved`/`rejected` arrays not validated for type/length |
| POST | `/api/review/admin-doc-response` | Emails admin but does not update any DB record; status is ephemeral |
| POST | `/api/contact` | No message body in form; no spam protection (CAPTCHA / honeypot) |
| GET | `/test-email` | **Unauthenticated** — sends real email; must be removed |
| GET | `/auth/google/callback` | Returns a plain string, not JSON; leftover OAuth stub |

**Note on role escalation via signup:** `SignupRequest` has no `role` field, but `security.py: signup()` reads `role_value = getattr(payload, "role", None) or "user"`. Since Pydantic v2 silently ignores extra fields by default, this is currently safe — an attacker cannot pass `role=admin` via the API. However, the code comments suggest this was intentional, and it only takes a future `model_config = ConfigDict(extra='allow')` change to open a privilege escalation path. The defensive fix is to explicitly remove the `getattr` fallback and always set `role = "user"` on signup.


---

## 5. File Storage Review

### Current State

The application has fully migrated from Google Drive to Contabo S3-compatible object storage. The implementation in `upload.py` is solid:
- Uses boto3 with S3v4 signatures
- Generates presigned URLs with a 7-day expiry
- Handles upload, view, and delete cleanly
- Errors are logged and never surface raw boto3 exceptions to clients

### Remaining Issues

1. **Placeholder credentials in `.env`.** `CONTABO_ACCESS_KEY=your_access_key_here` and `CONTABO_SECRET_KEY=your_secret_key_here` — the storage is not actually connected. All upload attempts will return 500 errors until real credentials are filled in.

2. **Google Drive artefacts still present.** `requirements.txt` still includes `google-api-python-client`, `google-auth`, `google-auth-httplib2`, `google-auth-oauthlib`, and related packages. `credentials.json` and `oauth_token.json` sit in the project root (committed to git). `generate_drive_token.py` exists in the root. These should be removed entirely.

3. **Presigned URL expiry is 7 days.** For tax documents in an accounting firm, 7 days is a long time for a direct-access URL to remain valid. Consider 1-hour or same-session expiry.

4. **No virus/malware scanning.** Files are uploaded directly to object storage without scanning. A client could upload a malicious PDF that an admin then downloads and opens.

5. **Column name `drive_file_id` now stores S3 keys.** The naming inconsistency will cause confusion; rename to `storage_key` in a future migration.

6. **No bucket lifecycle policy.** Deleted DB records remove the S3 object, but if a delete partially fails (DB commit after S3 delete fails), the DB record remains pointing to a non-existent object, causing 500 errors on view attempts.


---

## 6. CPA Workflow Review

### What works
- Clients can sign up, verify email, upload personal and business documents, and download organizer PDFs.
- Admins can view all user documents, mark them approved/rejected, set a filing timeline, and send notification emails.
- Admins can upload prepared returns for the client to review, and clients can approve or reject those returns.
- The engagement letter PDF is served from the static `images/` directory for download.

### What a real CPA firm needs that is missing

1. **No document status persisted server-side.** Admin approval/rejection state lives in `localStorage` under `review_state_{userId}`. If the admin opens a different browser, logs out, or clears storage, all decisions are lost. A `status` column on `personal_documents` and `business_documents` is required.

2. **No audit log.** For IRS compliance and professional liability, every action (document uploaded, reviewed, approved, rejected, deleted) must be timestamped and attributed to a user. There is currently no audit trail table.

3. **No e-signature on the engagement letter.** Clients download the engagement letter PDF but there is no mechanism to confirm they have read and signed it. For a CPA engagement, a signed engagement letter is a professional and often legal requirement.

4. **No task / deadline tracking.** Tax filing has hard deadlines (April 15, October 15, etc.). The app has no concept of a filing year, deadline, or extension status.

5. **No document versioning.** If a client uploads a corrected W-2 after the CPA has already reviewed the first one, there is no versioning — the old document is simply replaced (or a duplicate is added). There is no way to track which version was reviewed.

6. **No multi-client isolation.** All users see all admin-uploaded documents addressed to them, but there is no firm-wide document template system or bulk-action workflow.

7. **No payment or billing integration.** CPA engagements involve invoices. There is no record of service type, fee, or payment status.

8. **No two-factor authentication.** Tax documents contain SSNs, EINs, and financial records. MFA is expected by prudent security practice and may be required by state CPA licensing boards.

9. **Contact form has no message field.** `contact.py: ContactForm` only collects name, email, and phone. There is nowhere for the prospective client to describe what they need.

10. **Dashboard engagement letter download is hardcoded.** The file path `./images/general_engagement_letter_2025-1 - common.pdf` is baked into the HTML. Each tax year, a developer must manually update the HTML file.


---

## 7. UI/UX Review

### Positives
- Consistent color scheme (#BEE2FA header, #FF7F11 primary actions, #0077c8 links).
- `clamp()` used throughout for responsive font and image sizing.
- Password show/hide toggles on all password fields.
- Email-not-verified state handled gracefully in `login.html` with an inline message rather than a raw alert.
- Button disabled during async signup to prevent double-submit.
- Anti-enumeration pattern used in forgot-password and resend-verification ("if the email exists…").

### Problems

1. **XSS via innerHTML throughout.** See Security §2.7. Every filename, doc_label, and user-supplied string that goes into `.innerHTML` without escaping is an XSS vector.

2. **Auth guard is client-side only.** `if (!token || role !== "user") window.location.href = "/login"` in every protected page. This is easily bypassed. The API enforces auth correctly — but the HTML page itself renders before the redirect fires, creating a flash of protected content.

3. **No loading states on data-heavy pages.** `admin-user-detail.html` fires multiple fetch calls on load but shows no spinner. Users on slow connections see a blank page.

4. **No error boundaries.** If any fetch fails silently (network error, 500), the page either freezes or shows stale data with no user-visible message.

5. **Accessibility gaps:**
   - Logo `<img>` in `upload-business.html` has no `alt` attribute.
   - Upload `<label>` elements styled as buttons are not keyboard-accessible (no `tabindex`, no `for` attribute linking to visible inputs in all cases).
   - Admin approval checkboxes in `admin-user-detail.html` have no `<label>` text — screen readers cannot identify them.
   - Color alone distinguishes approve (green) vs reject (red) buttons; no icon or text pattern for color-blind users.

6. **Hardcoded contact info in footer.** `vedant.aiindia@gmail.com` appears in `upload-personal.html` and `upload-business.html` footers — a personal Gmail in a production product footer.

7. **`login.js` is loaded but never used.** `login.html` has its own inline `loginUser()` function. `frontend/js/login.js` defines a different version of `loginUser()` with `expectedRole` parameter and references DOM elements (`userLoginBtn`, `adminLoginBtn`, `loginForm`) that do not exist in `login.html`. The file is not `<script src>`-included in `login.html` at all. The file is effectively dead code.

8. **`admin.js` is not included in `admin-dashboard.html`.** `admin-dashboard.html` has a full inline script that duplicates the logic in `admin.js`. The comment says "no external admin.js" — meaning the external JS file is dead code.

9. **`admin-user-detail.html` — multiple `DOMContentLoaded` listeners.** There are four separate `document.addEventListener("DOMContentLoaded", ...)` blocks in the same file. The first sets up global refs and calls `loadUserDetails()`. The third sets up the `adminDocInput` listener. This fragmentation makes execution order hard to reason about.

10. **No confirmation on send-email actions.** `sendPersonalMail()` and `sendBusinessMail()` send real emails to clients without a confirmation step (unlike `submitDocumentsForReview()` which does `confirm()`).


---

## 8. Production Readiness

### 8.1 No Docker / Containerisation
There is no `Dockerfile`, `docker-compose.yml`, or any containerisation. Deployment is entirely manual. Any server rebuild requires re-installing dependencies by hand.

### 8.2 No Reverse Proxy Configuration
There is no nginx or Caddy config. The FastAPI process is expected to handle TLS termination and static file serving directly. For production: nginx should sit in front, handle HTTPS/TLS, serve static files, and proxy only API calls to uvicorn.

### 8.3 No HTTPS Configuration
`FRONTEND_URL=http://localhost:8000` in `.env`. Reset-password and verification links sent to users will contain `http://localhost:8000` unless the env var is updated for production. If a client clicks a password reset link, it will try to connect to `localhost` on their own machine.

### 8.4 Secrets in Version Control
As detailed in Security §2.1 — production DB password, Gmail app password, JWT signing key, and Google OAuth tokens are all committed to the repo. This is a **showstopper** for production.

### 8.5 No Structured Logging / Monitoring
`logging.getLogger()` is used correctly throughout the backend. However, there is no log aggregation (no Loki, CloudWatch, Papertrail, etc.), no alerting, no uptime monitoring, and no error tracking (no Sentry). For a CPA firm, knowing when an upload fails or an email bounces is important.

### 8.6 No Database Backup Strategy
There is no mention of automated MySQL backups. Tax documents in a database with no backup policy means a server failure = total data loss.

### 8.7 `GET /test-email` Endpoint
Unauthenticated endpoint that sends a real email. Must be removed before any public deployment.

### 8.8 `GET /auth/google/callback`
Dead OAuth callback endpoint returns a plain string. Should be removed or properly implemented.

### 8.9 No Health Check Endpoint
There is no `GET /health` endpoint. Load balancers and monitoring tools need this.

### 8.10 `requirements.txt` in Wrong Location
The `requirements.txt` at the project root is separate from `services/api/requirements.txt`. The root one is likely a duplicate or dev version. This causes confusion about which file to use for deployment.

### 8.11 uvicorn Workers
No `--workers` flag or gunicorn wrapper is configured. Single-worker uvicorn will block on CPU-intensive operations.


---

## 9. Performance Review

### 9.1 Synchronous DB Calls in Async Handlers
Many route handlers are declared `async def` but use synchronous SQLAlchemy ORM calls directly. For example:
- `upload.py: upload_personal_document()` is `async def` but calls `db.query(...).all()`, which blocks the event loop.
- `security.py: signup()` and `login()` are `async def` but call `crud.get_user_by_email()` (synchronous).

Either use `run_in_executor` to offload blocking DB calls, use `asyncpg`/`aiomysql` with async SQLAlchemy, or declare handlers as `def` (FastAPI handles them in a thread pool automatically).

### 9.2 No Connection Pool Configuration
`create_engine(DATABASE_URL, pool_pre_ping=True)` uses SQLAlchemy defaults: `pool_size=5`, `max_overflow=10`. Under any real load (concurrent uploads), this will exhaust quickly. The pool size should be configured explicitly based on the server's MySQL `max_connections`.

### 9.3 N+1 Potential in User Listing
`crud.get_all_users()` returns all users. The admin dashboard renders all of them. If the firm ever has 500+ clients, this becomes a full table scan with no pagination. Add `limit`/`offset` query params.

### 9.4 Document Listing — No Pagination
`list_personal_documents`, `list_business_documents`, and `list_admin_documents` return all documents for a user with no pagination. A client with many documents (e.g., multiple tax years) will eventually cause slow responses.

### 9.5 Per-File Upload Emails
Every single file upload triggers two emails (to user and admin). If a client uploads 6 documents in one session, the admin receives 6 individual notification emails. This should be batched or debounced.

### 9.6 `send_upload_emails` is Awaited Directly
In `upload.py`, `await send_upload_emails(...)` is called inline in the request handler, blocking the response until both emails are sent (or timeout). This should use `BackgroundTasks` like the other email sends in the codebase.

### 9.7 S3 Upload Reads Entire File into Memory
`upload_to_storage()` does `contents = await file.read()` — the entire file is loaded into memory before uploading. For large files (up to 10MB per upload, unlimited users), this can exhaust server RAM under load. Use streaming upload (`s3.upload_fileobj()`) instead.


---

## 10. Maintainability

### 10.1 Dead Commented Code
Large blocks of commented-out code throughout:
- `review.py` — old `@router.post("/submit")` and `@router.post("/notify-user")` are ~80 lines of commented code each.
- `models.py` — original `AdminDocument` class is fully commented out above the new one.
- `login_email.py` — `send_login_welcome_email()` is entirely commented out; the file now only contains `send_signup_welcome_email()` which is imported in `security.py` but **never actually called**.
- `admin-user-detail.html` — multiple commented-out HTML blocks (delete icon, alternate delete button, old `approveForFiling` button).
- `signup.html` — commented-out original `<script>` block.

This should all be removed; git history preserves it.

### 10.2 `...existing code...` Comments in Python Files
`crud.py` has five `# ...existing code...` comment markers scattered through it, including a duplicate `from sqlalchemy.orm import Session` import and a duplicate `from app.models import User` import. This suggests the file was edited by pasting snippets without cleanup.

### 10.3 No Tests
There are zero test files in the repository — no unit tests, integration tests, or end-to-end tests. For a financial application, even basic tests (can a user sign up and log in? can a file upload succeed?) are essential before handling real client data.

### 10.4 No API Documentation
FastAPI auto-generates `/docs` (Swagger) and `/redoc`. These are not explicitly disabled, so they are accessible — but no descriptions, response models, or examples are defined on any endpoint. The auto-generated docs are mostly useless without them.

### 10.5 Two JWT Libraries Used
`security.py` uses `python-jose` (`from jose import jwt`). `jwt_utils.py` uses the `PyJWT` library (`import jwt`). Both are in `requirements.txt`. Only one is needed. Since `jwt_utils.py` is dead code, `PyJWT` can be removed.

### 10.6 Duplicate Password Hashing Context
`crud.py` instantiates `CryptContext(schemes=["bcrypt"])`. `security.py` also instantiates its own `CryptContext(schemes=["bcrypt"])`. Both are used in different parts of the auth flow. Centralise to one instance.

### 10.7 Schema Reuse Mismatch
`resend-verification` uses `ForgotPasswordRequest` schema (which is semantically a "forgot password" schema). Create a dedicated `ResendVerificationRequest` schema.

### 10.8 `send_signup_welcome_email` is Imported but Never Called
`security.py` imports `send_signup_welcome_email` from `login_email.py` but never invokes it. The welcome email is never sent to new users. This is a dead import.

### 10.9 No `.env.example` File
There is no `.env.example` or documented list of required environment variables. A new developer cloning the repo has no way to know what env vars are needed without reading every file.

### 10.10 Google Drive Dependencies Not Cleaned Up
`requirements.txt` still includes the entire Google API client library stack (`google-api-python-client` etc.) even though Google Drive is no longer used. These add ~15MB of unused dependencies to every deployment.


---

## Prioritized Issue List

### 🔴 Critical (Fix before any production use)

| # | Issue | File | Line/Function |
|---|-------|------|---------------|
| C1 | Production DB password, Gmail SMTP password, and JWT secret committed to git; rotate all credentials immediately | `.env` | All credential lines |
| C2 | `SECRET_KEY=supersecretkey` — trivially guessable JWT signing key | `.env` | `SECRET_KEY` |
| C3 | `oauth_token.json` and `credentials.json` committed to repo — live Google OAuth tokens | repo root | — |
| C4 | IDOR: `GET /api/upload/view-url?key=` allows any authenticated user to access any other user's documents | `routers/upload.py` | `get_view_url()` |
| C5 | `GET /test-email` — unauthenticated endpoint that sends real email; open to abuse | `app/main.py` | `test_email()` |
| C6 | `FRONTEND_URL=http://localhost:8000` — password reset and email verification links sent to real clients point to localhost | `.env` + `auth/security.py` | `forgot_password()`, `signup()` |
| C7 | No file type or file size validation on backend upload endpoints | `routers/upload.py` | `upload_to_storage()` |
| C8 | XSS: filenames and doc labels injected into `innerHTML` unsanitised on admin and user pages | `admin-user-detail.html`, `dashboard.html`, `upload-personal.html`, `upload-business.html` | `renderRow()`, `addOtherDoc()`, `loadAdminUploadedDocs()` |

### 🟠 High (Fix this sprint)

| # | Issue | File | Line/Function |
|---|-------|------|---------------|
| H1 | No rate limiting on login, forgot-password, or signup endpoints | `auth/security.py` | `login()`, `forgot_password()` |
| H2 | No password minimum length or complexity enforcement at signup or password reset | `schemas.py`, `auth/security.py` | `SignupRequest`, `reset_password()` |
| H3 | Admin document review state (approve/reject) stored only in `localStorage`; never persisted to DB | `admin-user-detail.html` | `personalReviewState`, `businessReviewState` |
| H4 | Legacy `UploadedFile` table queried by admin route while all uploads now go to new tables — admins see no documents for new users via `GET /api/auth/admin/users/{id}/documents` | `auth/security.py`, `models.py`, `crud.py` | `get_user_documents()` |
| H5 | `allow_origins=["*"]` with `allow_credentials=True` is an invalid CORS combination | `app/main.py` | `CORSMiddleware` config |
| H6 | Token expiry is 8 hours; no refresh token mechanism | `.env`, `auth/security.py` | `ACCESS_TOKEN_EXPIRE_MINUTES` |
| H7 | `send_upload_emails` awaited inline (blocks response until emails send) instead of using BackgroundTasks | `routers/upload.py` | `upload_personal_document()`, `upload_business_document()` |
| H8 | S3 upload reads entire file into memory (`await file.read()`) — memory exhaustion risk under load | `routers/upload.py` | `upload_to_storage()` |
| H9 | No audit log table — no record of who did what to which document | `models.py` | — |
| H10 | Hard delete on all documents — no soft delete or retention for tax records | `routers/upload.py` | all `DELETE` handlers |

### 🟡 Medium (Fix next sprint)

| # | Issue | File | Line/Function |
|---|-------|------|---------------|
| M1 | No Alembic migration setup — schema changes require manual SQL | entire project | `db.py`, `models.py` |
| M2 | `drive_file_id` column name now stores S3 keys — rename to `storage_key` | `models.py` | all document models |
| M3 | Missing indexes on `user_id` FK columns in document tables | `models.py` | `PersonalDocument`, `BusinessDocument`, `AdminDocument` |
| M4 | `BusinessDocument.uploaded_at` missing `timezone=True` — timestamp inconsistency | `models.py` | `BusinessDocument` |
| M5 | Synchronous SQLAlchemy calls inside `async def` handlers block the event loop | `auth/security.py`, `routers/upload.py` | most route handlers |
| M6 | Duplicate `CryptContext` instantiation in `crud.py` and `security.py` | `crud.py`, `auth/security.py` | module level |
| M7 | Dead import: `send_signup_welcome_email` imported in `security.py` but never called | `auth/security.py` | import at bottom |
| M8 | `jwt_utils.py` is an unused second JWT implementation; reading a different env var (`JWT_SECRET` vs `SECRET_KEY`) | `auth/jwt_utils.py` | entire file |
| M9 | Contact form has no message body field | `routers/contact.py`, `frontend/contact.html` | `ContactForm` |
| M10 | No pagination on user list or document list endpoints | `auth/security.py`, `routers/upload.py` | `list_users_for_admin()`, list endpoints |
| M11 | Presigned URL expiry is 7 days — too long for sensitive tax documents | `routers/upload.py` | `PRESIGNED_EXPIRY` |
| M12 | Remove Google Drive dependencies from `requirements.txt` and delete `credentials.json`, `oauth_token.json`, `generate_drive_token.py` | `requirements.txt`, repo root | — |

### 🟢 Low (Backlog)

| # | Issue | File | Line/Function |
|---|-------|------|---------------|
| L1 | Dead commented-out code blocks throughout backend and frontend | `review.py`, `models.py`, `login_email.py`, `admin-user-detail.html` | multiple locations |
| L2 | `# ...existing code...` markers and duplicate imports in `crud.py` | `crud.py` | lines 1, 22–24 |
| L3 | `login.js` and `admin.js` in `frontend/js/` are dead — not included in any HTML page | `frontend/js/login.js`, `frontend/js/admin.js` | entire files |
| L4 | Multiple `DOMContentLoaded` listeners in same file | `admin-user-detail.html` | 4 separate listeners |
| L5 | Personal contact email (`vedant.aiindia@gmail.com`) hardcoded in footer of upload pages | `upload-personal.html`, `upload-business.html` | footer section |
| L6 | Logo `<img>` missing `alt` attribute on upload-business.html header | `upload-business.html` | `.header img` |
| L7 | Approval checkboxes in admin panel have no accessible label text | `admin-user-detail.html` | `renderRow()` |
| L8 | `GET /auth/google/callback` stub endpoint returns a plain string, not JSON | `app/main.py` | `google_callback()` |
| L9 | No `.env.example` documenting required environment variables | repo root | — |
| L10 | No `GET /health` endpoint for monitoring and load balancers | `app/main.py` | — |
| L11 | Upload notification emails sent per-file; should be batched | `routers/upload.py` | `send_upload_emails()` |
| L12 | Engagement letter PDF path hardcoded in dashboard HTML — requires developer to update each tax year | `frontend/dashboard.html` | download link |


---

## Production Readiness Roadmap

The following steps must be completed, in roughly this order, before this application handles real CPA client data.

### Phase 1 — Immediate (Security Emergencies)

1. **Rotate all compromised credentials.** Change the MySQL root password, generate a new Gmail App Password, generate a new 256-bit JWT secret (`openssl rand -hex 32`), and revoke/regenerate the Google OAuth tokens.
2. **Remove secrets from git history.** Use `git filter-repo` or BFG Repo Cleaner to scrub `.env`, `credentials.json`, and `oauth_token.json` from all git history, then force-push. Add these files to `.gitignore`.
3. **Create `.env.example`** with placeholder values documenting every required variable.
4. **Delete the debug endpoint** `GET /test-email` from `main.py`.
5. **Set `FRONTEND_URL`** to the real production domain in the production environment.

### Phase 2 — Critical Security Fixes (Before Any User Can Log In)

6. **Fix the IDOR** in `GET /api/upload/view-url`: verify that the requesting user owns the document corresponding to the requested object key before generating a presigned URL.
7. **Add server-side file validation**: check MIME type via `python-magic`, enforce 10MB size limit, reject executable and script file types.
8. **Add rate limiting**: use `slowapi` (wraps `limits` for FastAPI) on login, signup, forgot-password, and resend-verification endpoints. Suggested limits: 5 login attempts per minute per IP, 3 password-reset requests per hour per email.
9. **Add password minimum length** (at least 8 characters) to `SignupRequest` and `ResetPasswordRequest` using Pydantic validators.
10. **Fix CORS**: replace `allow_origins=["*"]` with the explicit production origin (e.g., `["https://bookkeepro.net"]`).
11. **Sanitise all HTML output**: replace `innerHTML` with `textContent` or a sanitiser library (DOMPurify) for all user-supplied strings rendered on the frontend.

### Phase 3 — Data Integrity

12. **Set up Alembic** for database migrations. Run `alembic init` and create an initial migration from the current models.
13. **Add `status` column** to `personal_documents` and `business_documents` (`pending`, `reviewed`, `approved`, `rejected`) and persist admin review decisions server-side.
14. **Create an `audit_log` table** that records every document upload, deletion, review action, and login event with user ID, timestamp, and IP address.
15. **Fix the legacy `UploadedFile` query** in `GET /api/auth/admin/users/{user_id}/documents` to query the new document tables, or remove the endpoint entirely if the correct one (`/api/upload/admin/users/{user_id}/documents`) covers all use cases.
16. **Implement soft delete** or a retention policy: mark documents as deleted rather than physically removing them; implement a scheduled purge after a legally required retention period.

### Phase 4 — Infrastructure

17. **Containerise the application** with a `Dockerfile` and `docker-compose.yml` (app + MySQL + nginx).
18. **Configure nginx** as a reverse proxy: handle TLS termination (Let's Encrypt / Certbot), serve `frontend/` static files directly, proxy `/api/` to uvicorn.
19. **Configure uvicorn for production**: use `gunicorn -k uvicorn.workers.UvicornWorker` with at least 2 workers, or use `uvicorn --workers 4`.
20. **Set up automated MySQL backups** (daily dump to a separate storage location, tested restore procedure).
21. **Set up error monitoring** (Sentry free tier is sufficient) and log aggregation.
22. **Add a `GET /health` endpoint** returning `{"status": "ok"}` for uptime monitoring.

### Phase 5 — Application Completeness

23. **Add real Contabo S3 credentials** and test a full upload/view/delete cycle.
24. **Remove Google Drive dependencies** from `requirements.txt`; delete `credentials.json`, `oauth_token.json`, `generate_drive_token.py`.
25. **Add a message field** to the contact form and `ContactForm` schema.
26. **Add token refresh** mechanism (or reduce token expiry to 30–60 minutes and re-authenticate).
27. **Add document versioning** or at minimum prevent silent overwrites (require explicit deletion before re-upload of a named document type).
28. **Implement MFA** (TOTP or email OTP) for all users, mandatory for admin accounts.
29. **Write a baseline test suite**: at minimum, pytest integration tests for signup → verify → login → upload → admin review flow.
30. **Engage a CPA compliance consultant** to review the workflow against applicable state board and IRS record-keeping requirements before onboarding real clients.

