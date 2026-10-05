import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

export default function AdminDashboard() {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false, title: "", message: "", confirmText: "OK", isDestructive: false, onConfirm: () => {}
  });
  const [activeTab, setActiveTab] = useState("users");
  const [stats, setStats] = useState({ total_users: 0, pending_personal: 0, pending_business: 0, admins: 0 });
  const [bookmarks, setBookmarks] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [userSort, setUserSort] = useState("newest");
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
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

  const [digestHtml, setDigestHtml]   = useState(null);
  const [digestLoading, setDigestLoading] = useState(false);

  const fetchDigest = useCallback(async () => {
    setDigestLoading(true);
    try {
      const res = await authFetch('/api/chatbot/daily-digest');
      if (res.ok) {
        const data = await res.json();
        setDigestHtml(data.digest);
      }
    } catch (err) { console.error(err); }
    finally { setDigestLoading(false); }
  }, [authFetch]);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes, bookmarksRes] = await Promise.all([
        authFetch(`/api/auth/admin/users?tax_year=${filterYear}`),
        authFetch(`/api/chatbot/admin-status?tax_year=${filterYear}`),
        authFetch(`/api/upload/bookmarks`)
      ]);
      
      if (bookmarksRes.ok) {
        const payload = await bookmarksRes.json();
        setBookmarks(payload.bookmarks || []);
      }
      
      let newUsersArray = users;
      let adminsCount = stats.admins;
      
      if (usersRes.ok) {
        const payload = await usersRes.json();
        newUsersArray = Array.isArray(payload) ? payload : (payload.users || []);
        setUsers(newUsersArray);
        adminsCount = newUsersArray.filter(u => u.role === "admin" || u.role === "super_admin").length;
      }
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({ 
          total_users: statsData.total_users, 
          pending_personal: statsData.pending_personal, 
          pending_business: statsData.pending_business, 
          admins: statsData.admin_accounts 
        });
      } else {
        // Fallback to local computation if admin-status fails
        const total    = newUsersArray.length;
        const pendingP = newUsersArray.reduce((acc, u) => acc + (u.pending_personal || 0), 0);
        const pendingB = newUsersArray.reduce((acc, u) => acc + (u.pending_business || 0), 0);
        setStats({ total_users: total, pending_personal: pendingP, pending_business: pendingB, admins: adminsCount });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [authFetch, filterYear]);

  const loadTemplates = useCallback(async () => {
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
  }, [authFetch, tplCategory, tplYear]);

  useEffect(() => {
    fetchAdminData();
  }, [authFetch, fetchAdminData, filterYear]);

  useEffect(() => {
    if (tab === "templates") {
      loadTemplates();
    }
  }, [tab, tplCategory, tplYear, loadTemplates]);

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
        showToast("Template uploaded successfully", "success");
      } else {
        const err = await res.json();
        showToast(err.detail || "Upload failed", "error");
      }
    } catch (err) {
      console.error("Upload error", err);
    }
  };

  const deleteTemplate = async (id) => {
    setConfirmConfig({
      isOpen: true,
      title: "Delete Template",
      message: "Are you sure you want to delete this template?",
      isDestructive: true,
      confirmText: "Delete",
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await authFetch(`/api/upload/admin/templates/${id}`, { method: "DELETE" });
          if (res.ok) {
            loadTemplates();
            showToast("Template deleted", "success");
          } else {
            showToast("Failed to delete template", "error");
          }
        } catch (err) {
          console.error("Delete error", err);
          showToast("Network error", "error");
        }
      }
    });
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  const filteredUsers = users.filter(u => {
    // Stat Card Filters
    if (userFilter === 'admin' && u.role !== 'admin' && u.role !== 'super_admin') return false;
    if (userFilter === 'pending_personal' && !(u.pending_personal > 0)) return false;
    if (userFilter === 'pending_business' && !(u.pending_business > 0)) return false;

    if (!search) return true;
    const q = search.toLowerCase();
    return (u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  }).sort((a, b) => {
    if (userSort === 'asc') return (a.name || '').localeCompare(b.name || '');
    if (userSort === 'desc') return (b.name || '').localeCompare(a.name || '');
    if (userSort === 'highest_pending') {
      const aPending = (a.pending_personal || 0) + (a.pending_business || 0);
      const bPending = (b.pending_personal || 0) + (b.pending_business || 0);
      return bPending - aPending;
    }
    // Default fallback to ID if created_at is missing
    if (userSort === 'newest') return (b.id || 0) - (a.id || 0);
    if (userSort === 'oldest') return (a.id || 0) - (b.id || 0);
    return 0;
  });

  return (
    <div className="">
      <ConfirmModal 
        {...confirmConfig} 
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} 
      />
      <h1 style={{ 
        margin: '0 0 32px 0', 
        fontSize: '42px', 
        fontFamily: 'var(--font-display)',
        fontWeight: '800', 
        color: 'var(--ink)', 
        textAlign: 'center',
        letterSpacing: '-0.5px'
      }}>
        Admin Dashboard <span style={{ color: 'var(--brass)', fontWeight: 600, fontSize: '32px' }}>{tab === 'templates' ? '| Templates' : ''}</span>
      </h1>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
      {tab === 'users' && (
          <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '500px', flexWrap: 'wrap' }}>
            <div className="search-wrap" style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
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
            <select 
              className="select-input" 
              style={{ width: 'auto', padding: '10px 16px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)', outline: 'none', background: 'white' }}
              value={userSort}
              onChange={(e) => setUserSort(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest_pending">Highest Pending</option>
              <option value="asc">Name (A-Z)</option>
              <option value="desc">Name (Z-A)</option>
            </select>
            <select
              className="select-input"
              style={{ width: 'auto', padding: '10px 16px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)', outline: 'none', background: 'white' }}
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <option value={currentYear - 1}>TY {currentYear - 1}</option>
              <option value={currentYear}>TY {currentYear}</option>
              <option value={currentYear + 1}>TY {currentYear + 1}</option>
            </select>
          </div>
        )}
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
          <span className="material-symbols-outlined">group</span> Users Overview
        </button>
        <button className={`tab-btn ${tab === 'bookmarks' ? 'active' : ''}`} onClick={() => setTab('bookmarks')}>
          <span className="material-symbols-outlined">star</span> Bookmarks
        </button>
        <button className={`tab-btn ${tab === 'templates' ? 'active' : ''}`} onClick={() => setTab('templates')}>
          <span className="material-symbols-outlined">description</span> Templates
        </button>
      </div>

      {/* Users Tab */}
      
      {tab === 'bookmarks' && (
        <div style={{marginTop: '16px'}}>
          <h2 style={{fontFamily: 'var(--font-display)', fontSize:'28px', fontWeight:700, color:'var(--navy)', marginBottom:'24px', display:'flex', alignItems:'center', gap:'12px', letterSpacing: '-0.5px'}}>
            <span className="material-symbols-outlined" style={{color:'var(--orange)', fontSize:'32px'}}>star</span>
            Bookmarked Documents
          </h2>
          {bookmarks.length === 0 ? (
            <div className="card shadow-sm p-lg" style={{textAlign: 'center', padding: '48px 24px'}}>
              <span className="material-symbols-outlined" style={{fontSize: '48px', color: 'var(--border)'}}>star_border</span>
              <p style={{color:'var(--text-light)', marginTop: '16px', fontSize: '16px'}}>No bookmarked documents found.</p>
            </div>
          ) : (
            <div className="users-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px'}}>
              {bookmarks.map((b) => (
                <div key={`${b.type}-${b.id}`} className="user-card stagger fade-up" style={{background: 'var(--surface)', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', display: 'flex', flexDirection: 'column'}} onClick={() => navigate(`/admin-user-detail?user_id=${b.user_id}`)}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
                >
                  <div className="user-top" style={{alignItems: 'flex-start', display: 'flex', gap: '16px'}}>
                    <div className="user-avatar" style={{background: 'var(--orange-light)', color: 'var(--orange)', borderRadius: '12px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                      <span className="material-symbols-outlined" style={{fontSize: '24px'}}>description</span>
                    </div>
                    <div className="user-info" style={{flex: 1}}>
                      <div className="u-name" style={{fontSize: '16px', fontWeight: 700, color: 'var(--navy)', wordBreak: 'break-word'}}>{b.filename || b.doc_name}</div>
                      <div className="u-email" style={{fontSize: '14px', color: 'var(--muted)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px'}}>
                         <span className="material-symbols-outlined" style={{fontSize:'16px'}}>person</span> {b.user_name}
                      </div>
                    </div>
                  </div>
                  <div className="user-bottom" style={{marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '16px', marginTop: '20px'}}>
                    <span className={`badge ${b.type === 'personal' ? 'badge-blue' : b.type === 'business' ? 'badge-green' : 'badge-gray'}`} style={{textTransform:'uppercase', fontSize: '12px'}}>
                      {b.type}
                    </span>
                    <span className="badge badge-gray" style={{fontSize: '12px', background: 'white', border: '1px solid var(--border)', color: 'var(--text-light)'}}>
                       <span className="material-symbols-outlined" style={{fontSize:'14px', verticalAlign:'middle', marginRight: '4px'}}>calendar_today</span>
                       {new Date(b.uploaded_at).toLocaleDateString()}
                    </span>
                    <span style={{flex: 1}}></span>
                    <span className="material-symbols-outlined" style={{color: 'var(--orange)', fontSize: '20px'}}>arrow_forward</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {tab === 'users' && (
        <>
          {/* Daily Digest */}
          <div className="card" style={{ marginBottom: '20px', background: 'var(--emerald-light)', border: '1px solid rgba(31,93,70,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--emerald)', fontSize: '22px' }}>auto_awesome</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--navy)' }}>AI Daily Digest</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Plain-English summary of today's activity</div>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={fetchDigest} disabled={digestLoading} style={{ borderRadius: 'var(--radius-sm)' }}>
                {digestLoading ? 'Generating…' : '✨ Generate Digest'}
              </button>
            </div>
            {digestHtml && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(31,93,70,0.2)', fontSize: '13px', color: 'var(--navy)', lineHeight: '1.7' }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(digestHtml) }} />
            )}
          </div>

          {/* Stats Bar */}
          <div className="admin-stats">
            <div className={`stat-card accent-blue ${userFilter === 'all' ? 'active-filter' : ''}`} onClick={() => setUserFilter('all')} style={{ cursor: 'pointer', border: userFilter === 'all' ? '2px solid var(--blue)' : 'none' }}>
              <div className="stat-icon"><span className="material-symbols-outlined">group</span></div>
              <div className="stat-value">{stats.total_users}</div>
              <div className="stat-label">Total Users</div>
            </div>
            <div className={`stat-card accent-green ${userFilter === 'admin' ? 'active-filter' : ''}`} onClick={() => setUserFilter('admin')} style={{ cursor: 'pointer', border: userFilter === 'admin' ? '2px solid var(--green)' : 'none' }}>
              <div className="stat-icon"><span className="material-symbols-outlined">security</span></div>
              <div className="stat-value">{stats.admins}</div>
              <div className="stat-label">Admin Accounts</div>
            </div>
            <div className={`stat-card accent-orange ${userFilter === 'pending_personal' ? 'active-filter' : ''}`} onClick={() => setUserFilter('pending_personal')} style={{ cursor: 'pointer', border: userFilter === 'pending_personal' ? '2px solid var(--orange)' : 'none' }}>
              <div className="stat-icon"><span className="material-symbols-outlined">description</span></div>
              <div className="stat-value">{stats.pending_personal}</div>
              <div className="stat-label">Pending Personal</div>
            </div>
            <div className={`stat-card accent-orange ${userFilter === 'pending_business' ? 'active-filter' : ''}`} onClick={() => setUserFilter('pending_business')} style={{ cursor: 'pointer', border: userFilter === 'pending_business' ? '2px solid var(--orange)' : 'none' }}>
              <div className="stat-icon"><span className="material-symbols-outlined">business</span></div>
              <div className="stat-value">{stats.pending_business}</div>
              <div className="stat-label">Pending Business</div>
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
                    {u.pending_personal > 0 && (
                      <span className="badge badge-orange pulse" style={{ cursor: 'default' }}>
                        <span className="material-symbols-outlined" style={{fontSize:'12px', verticalAlign:'middle'}}>description</span>
                        {' '}{u.pending_personal} personal
                      </span>
                    )}
                    {u.pending_business > 0 && (
                      <span className="badge badge-orange pulse" style={{ cursor: 'default' }}>
                        <span className="material-symbols-outlined" style={{fontSize:'12px', verticalAlign:'middle'}}>business</span>
                        {' '}{u.pending_business} business
                      </span>
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
