filepath = 'frontend/src/pages/AdminDashboard.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix --radius-full
content = content.replace('var(--radius-full)', 'var(--radius-md)')

# Add Sort and Tax Year labels
content = content.replace(
    '<select className="select-input"',
    '<label style={{display:"flex", alignItems:"center", gap:"8px", fontSize:"13px", fontWeight:500}}>Sort: <select className="select-input"'
)
# Wait, this might replace multiple. Let's be more specific.
