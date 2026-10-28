filepath = 'frontend/src/pages/UserDashboard.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove semantic search
import re
content = re.sub(r'const \[searchQuery, setSearchQuery\] = useState\(""\);\n\s*const \[searchResults, setSearchResults\] = useState\(\[\]\);\n\s*const \[isSearching, setIsSearching\] = useState\(false\);', '', content)
content = re.sub(r'const handleSearch = async.*?finally \{\n\s*setIsSearching\(false\);\n\s*\}\n\s*\};\n', '', content, flags=re.DOTALL)

# 2. Hide buttons on approved
old_buttons = """<button className="btn btn-primary btn-sm" onClick={() => respondDoc(doc.id, true)} disabled={docLoading}>Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => openUserRejectPanel(doc.id)} disabled={docLoading}>Reject</button>"""
new_buttons = """{(!doc.review_status || doc.review_status === 'pending') && (
                            <>
                              <button className="btn btn-primary btn-sm" onClick={() => respondDoc(doc.id, true)} disabled={docLoading}>Approve</button>
                              <button className="btn btn-danger btn-sm" onClick={() => openUserRejectPanel(doc.id)} disabled={docLoading}>Reject</button>
                            </>
                          )}"""
content = content.replace(old_buttons, new_buttons)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("UserDashboard patched.")
