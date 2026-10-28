filepath = 'frontend/src/pages/AdminUserDetail.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

import_statement = "import StatusChip from '../components/StatusChip';\n"
if "import StatusChip" not in content:
    # Insert after the last import
    last_import_idx = content.rfind("import ")
    if last_import_idx != -1:
        end_of_line = content.find("\n", last_import_idx)
        content = content[:end_of_line+1] + import_statement + content[end_of_line+1:]
    else:
        content = import_statement + content

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added StatusChip import.")
