import requests

# 1. Login as User 2
res = requests.post("http://localhost:8000/api/auth/login", data={"username": "user@example.com", "password": "password"})
user_token = res.json()["access_token"]
print("User token:", user_token[:10])

# 2. Upload a personal document for TY 2026
files = {'file': ('test.pdf', b'fake pdf content', 'application/pdf')}
data = {'doc_type': 'test_doc', 'tax_year': 2026}
res = requests.post(
    "http://localhost:8000/api/upload/personal-documents",
    headers={"Authorization": f"Bearer {user_token}"},
    files=files,
    data=data
)
print("Upload status:", res.status_code)

# 3. Login as Admin
res = requests.post("http://localhost:8000/api/auth/login", data={"username": "admin@example.com", "password": "password"})
admin_token = res.json()["access_token"]

# 4. Check admin status for TY 2026
res = requests.get("http://localhost:8000/api/chatbot/admin-status?tax_year=2026", headers={"Authorization": f"Bearer {admin_token}"})
print("Admin status 2026:", res.json().get("pending_personal"))

# 5. Check admin status for TY 2025
res = requests.get("http://localhost:8000/api/chatbot/admin-status?tax_year=2025", headers={"Authorization": f"Bearer {admin_token}"})
print("Admin status 2025:", res.json().get("pending_personal"))

