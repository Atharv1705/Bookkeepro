import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const { user, authFetch } = useAuth();
  const [stats, setStats] = useState({ total_users: 0, pending_docs: 0, admins: 0 });
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("users");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // --- Template Management State ---
  const [tplCategory, setTplCategory] = useState("personal");
  const [tplYear, setTplYear] = useState(new Date().getFullYear().toString());
  const [templates, setTemplates] = useState([]);
  const [tplName, setTplName] = useState("");
  const [tplFile, setTplFile] = useState(null);
  const [tplLoading, setTplLoading] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, [authFetch]);

  useEffect(() => {
    if (tab === "templates") {
      loadTemplates();
    }
  }, [tab, tplCategory, tplYear]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/auth/admin/users");
      
      if (res.ok) {
        const payload = await res.json();
        const usersArray = Array.isArray(payload) ? payload : (payload.users || []);
        setUsers(usersArray);
        
        // Compute stats locally like legacy frontend
        const total = usersArray.length;
        const pending = usersArray.reduce((s, u) => s + (u.pending_docs || 0), 0);
        const admins = usersArray.filter(u => u.role === "admin" || u.role === "super_admin").length;
        
        setStats({ total_users: total, pending_docs: pending, admins: admins });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    setTplLoading(true);
    try {
      const res = await authFetch(`/api/upload/templates?category=${tplCategory}&tax_year=${tplYear}`);
      if (res.ok) {
        setTemplates(await res.json());
      } else {
        setTemplates([]);
      }
    } catch (err) {
      console.error("Failed to load templates", err);
      setTemplates([]);
    } finally {
      setTplLoading(false);
    }
  };

  const handleTplUpload = async (e) => {
    e.preventDefault();
    if (!tplFile || !tplName) return;

    const fd = new FormData();
    fd.append("category", tplCategory);
    fd.append("tax_year", tplYear);
    fd.append("name", tplName);
    fd.append("file", tplFile);

    try {
      const res = await authFetch("/api/upload/admin/templates", {
        method: "POST",
        body: fd
      });
      if (res.ok) {
        setTplName("");
        setTplFile(null);
        document.getElementById("tplFile").value = "";
        loadTemplates();
      } else {
        const err = await res.json();
        alert(err.detail || "Upload failed");
      }
    } catch (err) {
      console.error("Upload error", err);
    }
  };

  const deleteTemplate = async (id) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    try {
      const res = await authFetch(`/api/upload/admin/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        loadTemplates();
      } else {
        alert("Failed to delete template");
      }
    } catch (err) {
      console.error("Delete error", err);
    }
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  const filteredUsers = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  });

  return (
    <div className="page-main-wide page-enter">
      <div className="flex-between align-center" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', color: 'var(--navy)' }}>
          Users <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{tab === 'templates' ? 'Templates' : ''}</span>
        </h1>
        {tab === 'users' && (
          <div className="search-wrap" style={{ width: '100%', maxWidth: '300px' }}>
            <span className="material-symbols-outlined search-icon" style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '20px'}}>search</span>
            <input 
              type="text" 
              className="search-input" 
              style={{ width: '100%', padding: '10px 12px 10px 40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', outline: 'none' }}
              placeholder="Search by name or email" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
          <span className="material-symbols-outlined">group</span> Users Overview
        </button>
        <button className={`tab-btn ${tab === 'templates' ? 'active' : ''}`} onClick={() => setTab('templates')}>
          <span className="material-symbols-outlined">description</span> Templates
        </button>
      </div>

      {/* Users Tab */}
      {tab === 'users' && (
        <>
          {/* Stats Bar */}
          <div className="admin-stats">
            <div className="stat-card accent-blue">
              <div className="stat-icon"><span className="material-symbols-outlined">group</span></div>
              <div className="stat-value">{stats.total_users}</div>
              <div className="stat-label">Total Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><span className="material-symbols-outlined">security</span></div>
              <div className="stat-value">{stats.admins}</div>
              <div className="stat-label">Admin Accounts</div>
            </div>
            <div className="stat-card accent-orange">
              <div className="stat-icon"><span className="material-symbols-outlined">pending</span></div>
              <div className="stat-value">{stats.pending_docs}</div>
              <div className="stat-label">Pending Docs</div>
            </div>
          </div>

          {/* User Grid */}
          <div className="users-grid">
            {loading ? (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                <div className="empty-icon"><span className="material-symbols-outlined">pending</span></div>
                <div className="empty-title">Loading users...</div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                <div className="empty-title">No users found</div>
              </div>
            ) : (
              filteredUsers.map(u => (
                <div key={u.id} className="user-card stagger fade-up" onClick={() => navigate(`/admin-user-detail?user_id=${u.id}`)}>
                  <div className="user-top">
                    <div className="user-avatar">{(u.name || "U").charAt(0).toUpperCase()}</div>
                    <div className="user-info">
                      <div className="u-name">{u.name || "—"}</div>
                      <div className="u-email">{u.email || "—"}</div>
                    </div>
                  </div>
                  <div className="user-bottom">
                    <span className={`badge role-badge ${u.role === 'super_admin' ? 'badge-red' : u.role === 'admin' ? 'badge-orange' : 'badge-blue'}`}>
                      {u.role}
                    </span>
                    {u.pending_docs > 0 && (
                      <span className="badge badge-orange pulse" style={{ cursor: 'default' }}>{u.pending_docs} pending</span>
                    )}
                  </div>
                  <div className="click-layer"></div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Templates Tab */}
      {tab === 'templates' && (
        <div className="card" style={{ marginTop: '20px' }}>
          <h3>Manage Required Templates</h3>
          <p className="text-sm" style={{ color: 'var(--muted)', marginBottom: '20px' }}>Upload new templates for users to download.</p>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <select className="select-input" style={{ width: 'auto' }} value={tplCategory} onChange={(e) => setTplCategory(e.target.value)}>
              <option value="personal">Personal</option>
              <option value="business">Business</option>
            </select>
            <select className="select-input" style={{ width: 'auto' }} value={tplYear} onChange={(e) => setTplYear(e.target.value)}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div style={{ marginTop: '20px', minHeight: '150px' }}>
            {tplLoading ? (
              <div className="text-muted">Loading templates...</div>
            ) : templates.length === 0 ? (
              <p className="text-muted">No templates found for {tplCategory} {tplYear}.</p>
            ) : (
              templates.map(t => (
                <div key={t.id} className="card-flat" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <h5 style={{ marginBottom: '4px' }}>{t.name}</h5>
                    {t.download ? (
                      <a href={t.download} target="_blank" rel="noreferrer" className="text-sm" style={{ color: 'var(--blue)' }}>View File</a>
                    ) : (
                      <span className="text-sm text-muted">No file</span>
                    )}
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteTemplate(t.id)}>Delete</button>
                </div>
              ))
            )}
          </div>

          <hr style={{ margin: '24px 0', borderTop: '1px solid var(--border)' }} />

          <h4 style={{ marginBottom: '12px' }}>Upload New Template</h4>
          <form onSubmit={handleTplUpload} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
            <input 
              type="text" 
              className="input" 
              placeholder="Template Name (e.g. Individual Tax Organizer)" 
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              required 
            />
            <input 
              type="file" 
              id="tplFile"
              className="input" 
              accept=".pdf,.doc,.docx"
              onChange={(e) => setTplFile(e.target.files[0])}
            />
            <button type="submit" className="btn btn-primary" style={{borderRadius: 'var(--radius-sm)'}}>Upload Template</button>
          </form>
        </div>
      )}
    </div>
  );
}