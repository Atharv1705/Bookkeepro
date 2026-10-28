import re

filepath = 'frontend/public/css/base.css'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

split_str = "/* ============================================================\n   MOTION SYSTEM (Phase 3)\n   ============================================================ */"
if split_str in content:
    content = content.split(split_str)[0].strip() + "\n"
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("base.css cleaned.")
else:
    print("MOTION SYSTEM block not found in base.css.")
