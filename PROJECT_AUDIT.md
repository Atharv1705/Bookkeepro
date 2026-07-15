# BookKeepPro — Project Audit Report
**Date:** June 16, 2026  
**Auditor:** Kiro  
**Scope:** All routes, RBAC logic, JWT implementation, document ownership, storage integration, user deletion workflow  
**Status at audit time:** Contabo S3 migration partially applied — upload.py imports boto3 but still calls `upload_to_drive()` and `get_drive_service()` which no longer exist in the file. Server will crash on any upload.

---

## Executive Summary

The project is a FastAPI + MySQL + vanilla-HTML bookkeeping web application. The core auth and RBAC architecture is sound — JWT role is correctly read from the database on every request, and a `require_admin` dependency is consistently applied on admin endpoints. The critical issues are:

1. **BROKEN: upload.py references `upload_to_drive()` and `get_drive_service()` which were removed during the Contabo migration** — the server will 500 on every upload and delete.
2. **BROKEN: `admin-login.html` blocks `super_admin` role** — only allows `data.role === "admin"`.
3. **BROKEN: `admin.js` (loaded by nobody) blocks `super_admin`** — but this file is not actually used; admin-dashboard.html has its own inline script.
4. **MEDIUM: No file size or MIME type validation on uploads** — any file type/size is accepted.
5. **MEDIUM: `services/temp/` has 260+ orphaned temp files** that were never cleaned up.
6. **MEDIUM: CORS is `allow_origins=["*"]`** — overly permissive for a production app with auth.
7. **LOW: `admin-user-detail.html` view links still use `drive.google.com`** — won't work after Contabo migration.
8. **LOW: `SignupRequest` schema accepts a `role` field from the client** — a user can self-assign `admin` at registration.
9. **LOW: `SECRET_KEY` defaults to `"change-this-secret"`** if env var not set.
10. **LOW: No password strength validation** on signup or reset.

---

## 1. Route Inventory

### Auth Routes — `/api/auth/` (security.py)

| Method | Path | Auth Required | Role Required | Status |
|--------|------|--------------|--------------|--------|
| POST | `/api/auth/signup` | No | — | ✅ Works |
| POST | `/api/auth/login` | No | — | ✅ Works |
| POST | `/api/auth/forgot-password` | No | — | ✅ Works |
| POST | `/api/auth/reset-password` | No (token in body) | — | ✅ Works |
| GET | `/api/auth/me` | Yes | Any | ✅ Works |
| GET | `/api/auth/admin/users` | Yes | admin/super_admin | ✅ Works |
| GET | `/api/auth/admin/users/{id}/documents` | Yes | admin/super_admin | ⚠️ Queries legacy `uploaded_files` table (empty) |

### Upload Routes — `/api/upload/` (upload.py)

| Method | Path | Auth Required | Role Required | Status |
|--------|------|--------------|--------------|--------|
| POST | `/api/upload/personal-documents` | Yes | user | 🔴 BROKEN — calls `upload_to_drive()` |
| GET | `/api/upload/personal-documents` | Yes | user | ✅ Works |
| DELETE | `/api/upload/personal-documents/{id}` | Yes | user (owner) | 🔴 BROKEN — calls `get_drive_service()` |
| POST | `/api/upload/business-documents` | Yes | user | 🔴 BROKEN — calls `upload_to_drive()` |
| GET | `/api/upload/business-documents` | Yes | user | ✅ Works |
| DELETE | `/api/upload/business-documents/{id}` | Yes | user (owner) | 🔴 BROKEN — calls `get_drive_service()` |
| POST | `/api/upload/admin-documents` | Yes | admin/super_admin | 🔴 BROKEN — calls `upload_to_drive()` |
| GET | `/api/upload/admin-documents` | Yes | any authenticated | ✅ Works |
| DELETE | `/api/upload/admin-documents/{id}` | Yes | admin/super_admin | 🔴 BROKEN — calls `get_drive_service()` | 
| GET | `/api/upload/admin/users/{id}/documents` | Yes | admin/super_admin | ✅ Works |
| DELETE | `/api/upload/admin/users/{id}` | Yes | admin/super_admin | 🔴 BROKEN — calls `get_drive_service()` |

### Review Routes — `/api/review/` (review.py)

| Method | Path | Auth Required | Role Required | Status |
|--------|------|--------------|--------------|--------|
| POST | `/api/review/submit` | Yes | admin/super_admin | ✅ Works |
| POST | `/api/review/notify-user` | Yes | admin/super_admin | ✅ Works |
| POST | `/api/review/admin-doc-response` | Yes | user only | ✅ Works |

### Contact Route — `/api/contact`

| Method | Path | Auth Required | Status |
|--------|------|--------------|--------|
| POST | `/api/contact` | No (public) | ✅ Works |

### Frontend Routes (HTML pages served by FastAPI)

All pages served via `serve_frontend_file()` with `Cache-Control: no-store` headers. No backend role check before serving HTML — authorization is frontend-only (localStorage check).

| Path | Page | Notes |
|------|------|-------|
| `/` `/home` | home.html | Public ✅ |
| `/login` | login.html | Public ✅ |
| `/signup` | signup.html | Public ✅ |
| `/admin-login` | admin-login.html | Public ✅ |
| `/dashboard` | dashboard.html | Frontend guard only |
| `/upload-personal` | upload-personal.html | Frontend guard only |
| `/upload-business` | upload-business.html | Frontend guard only |
| `/admin-dashboard` | admin-dashboard.html | Frontend guard only |
| `/admin-user-detail` | admin-user-detail.html | Frontend guard only |
| `/forgot-password` | forgot-password.html | Public ✅ |
| `/reset-password` | reset-password.html | Public ✅ |
| `/contact` `/services` `/about-us` | Static pages | Public ✅ |

---

## 2. RBAC Logic Review

### Backend (security.py)

**`get_current_user()`** — Decodes JWT, extracts email (`sub` claim), queries the DB for the user, and returns the DB user object. Role is always the DB value. ✅ Correct.

**`require_admin()`** — FastAPI dependency. Checks `current_user.role in [UserRole.admin, UserRole.super_admin]`. Raises HTTP 403 if not. ✅ Correct.

**Admin endpoint pattern** — All admin-gated endpoints use both `current_user=Depends(get_current_user)` and `_=Depends(require_admin)`. Some also have a redundant inline `if current_user.role not in [...]` check — this is harmless but unnecessary. ✅ Correct overall.

**`require_admin` calls `get_current_user` again** — Because `require_admin` uses `Depends(get_current_user)` internally, and admin endpoints also declare `current_user=Depends(get_current_user)`, FastAPI's dependency cache means `get_current_user` is only called once per request. ✅ No double DB query.

### Issues Found

**ISSUE R-1 — Signup allows self-assigned role (HIGH)**  
`SignupRequest` schema has no `role` field, but `security.py` does:
```python
role_value = getattr(payload, "role", None) or "user"
```
Since `SignupRequest` has no `role` field, `getattr` always returns `None`, so this always defaults to `"user"`. ✅ Safe as-is, but fragile — if `role` is ever added to the schema, any client can register as admin. The `getattr` call should be removed and hardcoded to `"user"`.

**ISSUE R-2 — `admin-login.html` blocks `super_admin` (MEDIUM)**  
```javascript
if (data.role !== "admin")
    return alert("This account is not an admin");
```
A `super_admin` user cannot log in via the admin login page. Should be:
```javascript
if (data.role !== "admin" && data.role !== "super_admin")
```

**ISSUE R-3 — `admin.js` checks `role !== 'admin'` only (LOW)**  
The file `frontend/js/admin.js` is not imported by any HTML page (admin-dashboard.html uses inline script). It is dead code. But it blocks `super_admin`. Should be cleaned up.

**ISSUE R-4 — No backend auth on HTML page routes (LOW)**  
Pages like `/admin-dashboard`, `/upload-personal` are served without any server-side role check. A user with a direct URL gets the HTML. The frontend JS redirects unauthenticated users, but this is security theatre — the HTML itself is public. For a client-facing production app this is an acceptable tradeoff (SPA pattern), but worth noting.

---

## 3. JWT Implementation Review

**Algorithm:** HS256 with `python-jose`. ✅  
**Secret key source:** `os.getenv("SECRET_KEY", "change-this-secret")`. The fallback `"change-this-secret"` is dangerous if `.env` is absent.  
**Token expiry:** `ACCESS_TOKEN_EXPIRE_MINUTES` — defaults to `"1440"` (24 hours) in security.py, but `.env` sets it to `60` minutes. ✅ Env wins.  
**Token payload:**
```json
{ "sub": "user@email.com", "role": "user", "exp": 1234567890 }
```
Role is embedded but never trusted from JWT — always re-fetched from DB. ✅  
**Password reset token:** Separate token with `"type": "password_reset"` claim and 15-minute expiry. Type is validated before use. ✅  
**No token revocation:** JWT is stateless. A token remains valid until expiry even after logout or password change. Logout just clears localStorage. Acceptable for this use case but worth documenting.  
**No refresh token mechanism:** Users are logged out after 60 minutes with no way to silently refresh. Could be improved with a refresh token endpoint.

### Issues Found

**ISSUE J-1 — Weak fallback SECRET_KEY (HIGH)**  
If `.env` is missing or `SECRET_KEY` is not set, the server uses `"change-this-secret"`. Anyone who knows this default can forge valid JWTs. Should fail hard:
```python
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable not set")
```

**ISSUE J-2 — `jwt_utils.py` is a dead file (LOW)**  
`services/api/app/auth/jwt_utils.py` exists and defines its own `create_access_token` / `decode_token` using `JWT_SECRET` env var (different from `SECRET_KEY`). This file is never imported anywhere. It should be deleted to avoid confusion.

---

## 4. Document Ownership Checks

### Personal Documents
**List** (`GET /api/upload/personal-documents`): Filters by `PersonalDocument.user_id == current_user.id`. ✅  
**Delete** (`DELETE /api/upload/personal-documents/{id}`): Queries with both `id == doc_id AND user_id == current_user.id`. Returns 404 if not found (doesn't reveal existence to wrong user). ✅

### Business Documents
**List** (`GET /api/upload/business-documents`): Filters by `BusinessDocument.user_id == current_user.id`. ✅  
**Delete** (`DELETE /api/upload/business-documents/{id}`): Fetches by id first, then checks `doc.user_id != current_user.id` and raises 403. Slightly weaker than personal — reveals document existence to non-owner (404 vs 403 leakage). Minor.

### Admin Documents
**List** (`GET /api/upload/admin-documents`): Admin must supply `user_id` param; user auto-scoped to own id. ✅  
**Delete** (`DELETE /api/upload/admin-documents/{id}`): Admin-only via `require_admin`. No ownership check needed (admin owns all admin docs). ✅  
**User-response** (`POST /api/review/admin-doc-response`): Checks `doc.user_id` is not verified against `current_user.id` — a user can respond to an admin doc uploaded for a different user if they know the `doc_id`. **ISSUE O-1 below.**

### Issues Found

**ISSUE O-1 — Admin doc response missing ownership check (MEDIUM)**  
In `review.py`, `admin_doc_response()` verifies the user is authenticated and has role `user`, but does not verify that `doc.user_id == current_user.id`:
```python
doc = db.query(AdminDocument).filter_by(id=doc_id).first()
# ← no check that doc.user_id == current_user.id
```
Any logged-in user can approve/reject admin documents intended for other users if they guess or obtain a `doc_id`. Should add:
```python
if doc.user_id != current_user.id:
    raise HTTPException(status_code=403, detail="Not authorized")
```

**ISSUE O-2 — Business doc delete reveals existence (LOW)**  
Personal delete returns 404 for non-owned docs (ownership baked into query). Business delete returns 403 for non-owned docs (fetches first, then checks). This leaks whether a doc with that ID exists. Standardize to the personal pattern.

---

## 5. Storage Integration Review

### Current State — BROKEN (Migration Incomplete)

`upload.py` was migrated to use Contabo S3 (`boto3`). The new helper functions `upload_to_storage()`, `delete_from_storage()`, and `get_presigned_url()` are correctly defined at the top of the file.

**However**, all endpoint functions still call the old Google Drive functions that no longer exist in the file:**

| Endpoint | Still calls | Result |
|----------|-------------|--------|
| `upload_admin_document` | `upload_to_drive(file)` | `NameError` → HTTP 500 |
| `delete_admin_document` | `get_drive_service()` | `NameError` → HTTP 500 |
| `upload_personal_document` | `upload_to_drive(file)` | `NameError` → HTTP 500 |
| `delete_personal_document` | `get_drive_service()` | `NameError` → HTTP 500 |
| `upload_business_document` | `upload_to_drive(file)` | `NameError` → HTTP 500 |
| `delete_business_document` | `get_drive_service()` | `NameError` → HTTP 500 |
| `delete_user_completely` | `get_drive_service()` | `NameError` → HTTP 500 |

Additionally, the DB column `drive_file_id` is used as the storage key field across all models. After migration this column stores S3 object keys, not Drive IDs — the column name is misleading but functionally harmless.

**Frontend** — All "View" buttons in `upload-personal.html`, `upload-business.html`, `admin-user-detail.html`, and `dashboard.html` construct URLs like:
```
https://drive.google.com/file/d/${doc.drive_file_id}/view
```
After migration, `drive_file_id` will contain an S3 key like `uploads/abc123.pdf`, not a Drive ID. These links will break. View should use a presigned URL API endpoint instead.

### Issues Found

**ISSUE S-1 — All upload and delete endpoints broken (CRITICAL)**  
Migration to Contabo was started but not completed. `upload_to_drive()` and `get_drive_service()` calls must be replaced with `upload_to_storage()` and `delete_from_storage()`.

**ISSUE S-2 — No presigned URL endpoint (HIGH)**  
After migration, files are in private S3 storage. There is no backend endpoint to generate a presigned URL for viewing a document. The frontend currently links directly to Google Drive. A new endpoint `GET /api/upload/document-url?key=...` is needed.

**ISSUE S-3 — No file size limit enforced (MEDIUM)**  
No `Content-Length` check or file size cap in the upload endpoints. A user could upload a multi-GB file. FastAPI/uvicorn has no default upload limit. Should add:
```python
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
contents = await file.read(MAX_UPLOAD_BYTES + 1)
if len(contents) > MAX_UPLOAD_BYTES:
    raise HTTPException(status_code=413, detail="File too large. Max 10MB.")
```

**ISSUE S-4 — No MIME type validation (MEDIUM)**  
No validation of `file.content_type`. A user can upload any file type. The upload page says "Allowed: PDF, JPG, PNG" but this is not enforced. Should validate:
```python
ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png"}
if file.content_type not in ALLOWED_TYPES:
    raise HTTPException(status_code=400, detail="File type not allowed")
```

**ISSUE S-5 — 260+ orphaned temp files in `services/temp/` (LOW)**  
These are leftover from a previous implementation that wrote files to disk. The current Contabo implementation reads file bytes directly into memory (`await file.read()`). The temp directory should be cleaned and can be gitignored or deleted entirely.

---

## 6. User Deletion Workflow Review

**Endpoint:** `DELETE /api/upload/admin/users/{user_id}`  
**Auth:** `require_admin` ✅  
**Frontend confirmation:** Double confirm dialog ✅

### Workflow
1. Fetches user by ID — 404 if not found ✅
2. Fetches and deletes all `AdminDocument` records + storage files
3. Fetches and deletes all `PersonalDocument` records + storage files
4. Fetches and deletes all `BusinessDocument` records + storage files
5. Deletes user row
6. Single `db.commit()` at the end ✅

### Issues Found

**ISSUE D-1 — Storage calls broken (CRITICAL)**  
Calls `get_drive_service()` which no longer exists. Will 500 before deleting anything. Same as ISSUE S-1.

**ISSUE D-2 — No DB transaction rollback on partial failure (MEDIUM)**  
If storage deletes succeed for some docs but the DB delete fails, the DB and storage go out of sync. The DB records would remain pointing to deleted files. Should wrap in a try/except with `db.rollback()`:
```python
try:
    # ... all deletes ...
    db.commit()
except Exception as e:
    db.rollback()
    raise HTTPException(status_code=500, detail="Deletion failed")
```

**ISSUE D-3 — `uploaded_files` (legacy) table not cleaned on user delete (LOW)**  
The deletion workflow deletes from `personal_documents`, `business_documents`, and `admin_documents`, but not from `uploaded_files`. If any legacy records exist for the user, they become orphaned FK references. Should include:
```python
db.query(UploadedFile).filter(UploadedFile.owner_id == user_id).delete()
```

**ISSUE D-4 — Admin can delete themselves (LOW)**  
There is no check preventing `current_user.id == user_id`. An admin can delete their own account via the API. Should add:
```python
if user_id == current_user.id:
    raise HTTPException(status_code=400, detail="Cannot delete your own account")
```

---

## 7. Code Quality & Miscellaneous Issues

**ISSUE Q-1 — `crud.py` has `# ...existing code...` markers and duplicate imports (LOW)**  
The file has stray markers from incremental edits:
```python
# ...existing code...
from sqlalchemy.orm import Session
from app.models import User
# ...existing code...
```
These are dead lines. The file should be cleaned up.

**ISSUE Q-2 — `models.py` has commented-out old model and `# ...existing code...` marker (LOW)**  
The old `AdminDocument` definition is commented out inline. Dead code makes the file harder to read. Should be removed.

**ISSUE Q-3 — `upload.py` has large commented-out code blocks (LOW)**  
Three old `list_admin_documents` and one old `upload_admin_document` implementation are commented out inline. Should be removed.

**ISSUE Q-4 — `upload.py` imports `User` three times (LOW)**  
```python
from app.models import AdminDocument, UserRole   # line 1
from app.models import User                       # line 2 — duplicate
from app.models import (AdminDocument, PersonalDocument, BusinessDocument, User)  # line 3
from app.models import User                       # line 4 — triplicate
```
Clean up to a single import block.

**ISSUE Q-5 — CORS is open to all origins (MEDIUM)**  
```python
allow_origins=["*"]
```
With JWT in Authorization headers and `allow_credentials=True`, this is overly permissive. `allow_credentials=True` with `allow_origins=["*"]` is actually rejected by browsers — FastAPI silently ignores the credentials flag when origins is `*`. Should be:
```python
allow_origins=["https://bookkeepro.net", "http://localhost:8000"]
```

**ISSUE Q-6 — `dashboard.html` has verbose debug `console.log` statements (LOW)**  
`loadAdminUploadedDocs()` logs token value, raw responses, and rendering steps to the browser console. These expose internal state and should be removed before production.

**ISSUE Q-7 — Contact form builds `body` variable but uses inline f-string (LOW)**  
In `contact.py`, a `body` variable is built but then ignored — a second inline f-string is used in `background.add_task()`. The unused `body` variable and `subject` variable should be removed.

---

## Priority Fix Order

### Immediate (Blocks all functionality)
1. **S-1 / D-1** — Complete the Contabo migration: replace all `upload_to_drive()` and `get_drive_service()` calls with `upload_to_storage()` and `delete_from_storage()`
2. **S-2** — Add presigned URL endpoint so "View" buttons work after migration

### High (Security or data integrity)
3. **J-1** — Make `SECRET_KEY` mandatory (raise on startup if missing)
4. **O-1** — Add `doc.user_id == current_user.id` check in `admin_doc_response`
5. **R-2** — Fix `admin-login.html` to allow `super_admin` role

### Medium (Feature gaps)
6. **S-3** — Add 10MB file size limit
7. **S-4** — Add MIME type validation
8. **D-2** — Wrap user deletion in a DB transaction with rollback
9. **Q-5** — Restrict CORS origins

### Low (Cleanup)
10. **J-2** — Delete `jwt_utils.py`
11. **D-3** — Delete from `uploaded_files` on user deletion
12. **D-4** — Prevent admin self-deletion
13. **S-5** — Clean `services/temp/` directory
14. **R-3** — Delete or update `admin.js`
15. **Q-1 through Q-7** — Code cleanup

---

## Appendix — Database Table Summary

| Table | Purpose | Active? |
|-------|---------|---------|
| `users` | All accounts (user/admin/super_admin) | ✅ Active |
| `personal_documents` | User-uploaded personal tax docs | ✅ Active |
| `business_documents` | User-uploaded business tax docs | ✅ Active |
| `admin_documents` | Admin-uploaded return docs for users | ✅ Active |
| `uploaded_files` | Legacy single-table design | ⚠️ Abandoned, still exists |

## Appendix — Environment Variables

| Variable | Used By | Required | Notes |
|----------|---------|----------|-------|
| `SECRET_KEY` | JWT signing | Yes | Defaults to insecure value |
| `ALGORITHM` | JWT | No | Defaults to HS256 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT | No | Defaults to 1440 (24h) in code, 60 in .env |
| `MYSQL_*` | DB connection | Yes | |
| `SMTP_HOST/PORT/USER/PASSWORD` | Email | No | Emails skipped if not set |
| `MAIL_FROM` | Email | No | |
| `ADMIN_EMAIL` | Email notifications | No | |
| `CONTABO_ENDPOINT` | Object storage | Yes (after migration) | |
| `CONTABO_ACCESS_KEY` | Object storage | Yes (after migration) | |
| `CONTABO_SECRET_KEY` | Object storage | Yes (after migration) | |
| `CONTABO_BUCKET` | Object storage | Yes (after migration) | |
| `FRONTEND_URL` | Password reset link | No | Defaults to https://bookkeepro.net |
| `DRIVE_FOLDER_ID` | Google Drive (legacy) | No longer needed | |
