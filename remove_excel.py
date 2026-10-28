filepath = 'frontend/src/pages/AdminUserDetail.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Remove the button
content = re.sub(r'<button className="btn btn-secondary btn-sm" onClick=\{exportToExcel\}.*?table_view</span></button>\n?\s*', '', content)

# Remove the exportToExcel function
# It starts with `const exportToExcel = async () => {`
# We can find the block manually or with a regex that captures until the first top-level closing brace, but it's nested.
# Let's extract the start index and find the matching closing brace.
start_str = "const exportToExcel = async () => {"
if start_str in content:
    start_idx = content.find(start_str)
    brace_count = 0
    in_function = False
    end_idx = -1
    for i in range(start_idx, len(content)):
        if content[i] == '{':
            brace_count += 1
            in_function = True
        elif content[i] == '}':
            brace_count -= 1
        
        if in_function and brace_count == 0:
            end_idx = i
            break
            
    if end_idx != -1:
        # also remove trailing newlines
        content = content[:start_idx] + content[end_idx+1:].lstrip('\n')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed export excel feature.")
