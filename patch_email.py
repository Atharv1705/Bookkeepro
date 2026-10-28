import os

filepath = os.path.join("services", "api", "app", "routers", "upload.py")
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# For personal documents
old_personal = "<p>Your personal document <strong>{doc.doc_type}</strong> (Tax Year {doc.tax_year}) has been"
new_personal = "<p>Your personal document <strong>{doc.filename}</strong> (Tax Year {doc.tax_year}) has been"

# For business documents
old_business = "<p>Your business document <strong>{doc.business_type}</strong> (Tax Year {doc.tax_year}) has been"
new_business = "<p>Your business document <strong>{doc.filename}</strong> (Tax Year {doc.tax_year}) has been"

content = content.replace(old_personal, new_personal)
content = content.replace(old_business, new_business)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("upload.py patched successfully")
