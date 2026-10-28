filepath = 'frontend/src/components/StatusChip.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '<div className="flex flex-col items-start gap-1 status-chip-container">',
    '<div className="status-chip-container">'
)
content = content.replace(
    'shadow-sm border border-black/5',
    ''
)
content = content.replace(
    '<div className="text-xs text-[var(--error)] italic mt-1 font-medium bg-[var(--error-bg)] px-2 py-1 rounded-sm border border-[var(--error)]/20">',
    '<div className="status-chip-note">'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("StatusChip fixed")
