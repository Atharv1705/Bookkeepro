filepath = 'frontend/src/components/ExpandableSummaryBlock.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Remove handleExport function
start_str = "const handleExport = () => {"
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
        content = content[:start_idx] + content[end_idx+1:].lstrip('\n')

# Remove the button
content = re.sub(r'<button onClick=\{handleExport\}.*?Export Excel\s*</button>\n?\s*', '', content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed handleExport and button from ExpandableSummaryBlock.")
