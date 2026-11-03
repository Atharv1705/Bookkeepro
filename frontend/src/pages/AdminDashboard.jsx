import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import CountUp from '../components/CountUp';

export default function AdminDashboard() {
  const { authFetch, user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const { showToast } = useToast();
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false, title: "", message: "", confirmText: "OK", isDestructive: false, onConfirm: () => {}
  });

  const [stats, setStats] = useState({ total_users: 0, pending_personal: 0, pending_business: 0, admins: 0 });
  const [bookmarks, setBookmarks] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [userSort, setUserSort] = useState("newest");
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [adminAssignmentFilter, setAdminAssignmentFilter] = useState("all");
  const [staffList, setStaffList] = useState([]);
  const [tab, setTab] = useState("users");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // --- Staff List Fetch ---
  const fetchStaff = useCallback(async () => {
    try {
      const res = await authFetch('/api/auth/admin/staff');
      if (res.ok) {
        setStaffList(await res.json());
      }
    } catch (err) {
      console.error("Failed to load staff list", err);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleAssignAdmin = async (userId, newAdminId) => {
    try {
      const res = await authFetch(`/api/auth/admin/users/${userId}/assign-admin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: newAdminId ? parseInt(newAdminId, 10) : null }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message || "Admin assigned", "success");
        setUsers(prev => prev.map(u => u.id === userId ? {
          ...u,
          assigned_admin_id: data.assigned_admin_id,
          assigned_admin_name: data.assigned_admin_name,
          assigned_admin_email: data.assigned_admin_email,
        } : u));
        fetchStaff();
      } else {
        const err = await res.json();
        showToast(err.detail || "Failed to assign admin", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error while assigning admin", "error");
    }
  };

  // --- Template Management State ---
  const [tplCategory, setTplCategory] = useState("personal");
  const [tplYear, setTplYear] = useState(new Date().getFullYear().toString());
  const [templates, setTemplates] = useState([]);
  const [tplName, setTplName] = useState("");
  const [tplFile, setTplFile] = useState(null);
  const [tplLoading, setTplLoading] = useState(false);

  const [digestHtml, setDigestHtml] = useState(null);
  const [digestLoading, setDigestLoading] = useState(false);

  const fetchDigest = useCallback(async () => {
    setDigestLoading(true);
    try {
      const res = await authFetch('/api/chatbot/daily-digest');
      if (res.ok) {
        const data = await res.json();
        setDigestHtml(data.digest);
        showToast("AI Daily briefing generated successfully!", "success");
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Failed to generate daily digest", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error while generating digest", "error");
    } finally {
      setDigestLoading(false);
    }
  }, [authFetch, showToast]);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      let usersUrl = `/api/auth/admin/users?tax_year=${filterYear}`;
      if (isSuperAdmin) {
        if (adminAssignmentFilter !== "all") {
          usersUrl += `&assigned_admin_id=${adminAssignmentFilter}`;
        }
      } else {
        if (adminAssignmentFilter === "unassigned") {
          usersUrl += `&assigned_admin_id=unassigned`;
        }
      }

      const [usersRes, statsRes, bookmarksRes] = await Promise.all([
        authFetch(usersUrl),
        authFetch(`/api/chatbot/admin-status?tax_year=${filterYear}`),
        authFetch(`/api/upload/bookmarks`)
      ]);
      
      if (bookmarksRes.ok) {
        const payload = await bookmarksRes.json();
        setBookmarks(payload.bookmarks || []);
      }
      
      let newUsersArray = [];
      let adminsCount = 0;
      
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
        const total = newUsersArray.length;
        const pendingP = newUsersArray.reduce((acc, u) => acc + (u.pending_personal || 0), 0);
        const pendingB = newUsersArray.reduce((acc, u) => acc + (u.pending_business || 0), 0);
        setStats({ total_users: total, pending_personal: pendingP, pending_business: pendingB, admins: adminsCount });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [authFetch, filterYear, adminAssignmentFilter, isSuperAdmin]);

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
        const fileInput = document.getElementById("tplFile");
        if (fileInput) fileInput.value = "";
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
    if (userSort === 'newest') return (b.id || 0) - (a.id || 0);
    if (userSort === 'oldest') return (a.id || 0) - (b.id || 0);
    return 0;
  });

  return (
    <div>
      <ConfirmModal 
        {...confirmConfig} 
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} 
      />

      {/* ================= EXECUTIVE ADMIN HERO ================= */}
      <section className="dash-hero dash-rise" style={{ '--i': 0, marginBottom: '24px' }}>
        <div className="dash-hero-content">
          <div className="dash-hero-eyebrow">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>verified_user</span>
            PARTNER &amp; STAFF PRACTICE CONSOLE
          </div>
          <h1 className="dash-hero-title">Client Management &amp; Tax Review</h1>
          <p className="dash-hero-sub">
            Monitor client document vaults, allocate staff CPAs, review AI statement ingestion, and finalize returns for TY {filterYear}.
          </p>

          <div className="dash-hero-badges" style={{ marginTop: '18px' }}>
            <span className="dash-glass-pill">
              <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#60A5FA' }}>shield</span>
              Executive Control
            </span>
            <span className="dash-glass-pill">
              <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#34D399' }}>verified</span>
              CPA Workpapers
            </span>
            <span className="dash-glass-pill">
              <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#C4B5FD' }}>auto_awesome</span>
              AI Ingestion Active
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', zIndex: 1 }}>
          {/* Tax Year Glass Select */}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="dash-glass-select dash-focusable"
            aria-label="Filter Tax Year"
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>Tax Year {y}</option>
            ))}
          </select>

          {/* AI Daily Briefing Button */}
          <button
            className="dash-hero-ai-btn dash-focusable"
            onClick={fetchDigest}
            disabled={digestLoading}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>auto_awesome</span>
            {digestLoading ? 'Analyzing...' : 'AI Daily Briefing'}
          </button>
        </div>
      </section>

      {/* Daily Digest Drawer / Box */}
      {digestHtml && (
        <section className="dash-card dash-digest-drawer" style={{ marginBottom: '24px' }}>
          <div className="dash-digest-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="dash-chip dash-chip--violet" style={{ width: '32px', height: '32px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>auto_awesome</span>
              </div>
              <div>
                <strong style={{ fontSize: '14px', color: '#0A2540' }}>AI Executive Daily Briefing</strong>
                <span style={{ fontSize: '12px', color: '#6D28D9', marginLeft: '8px', fontWeight: 600 }}>TY {filterYear} Digest</span>
              </div>
            </div>
            <button
              className="dash-table-action-btn dash-focusable"
              onClick={() => setDigestHtml(null)}
              title="Dismiss Briefing"
              aria-label="Dismiss Briefing"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            </button>
          </div>
          <div
            style={{ padding: '20px 24px', fontSize: '13.5px', color: '#0A2540', lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(digestHtml) }}
          />
        </section>
      )}

      {/* ================= EXECUTIVE KPI METRICS BAR ================= */}
      <div className="dash-kpis dash-rise" style={{ '--i': 1, marginTop: 0, marginBottom: '24px' }}>
        {/* Total Clients */}
        <div
          className={`dash-card dash-kpi-card dash-kpi-card--blue ${userFilter === 'all' ? 'dash-kpi-card--active' : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setUserFilter('all')}
        >
          <div className="dash-kpi-bar dash-kpi-bar--blue" />
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Total Clients</span>
            <div className="dash-chip dash-chip--blue">
              <span className="material-symbols-outlined">group</span>
            </div>
          </div>
          <div className="dash-kpi-value">
            <CountUp value={stats.total_users} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: userFilter === 'all' ? '#1D4ED8' : '#425466', fontWeight: 600 }}>
              {userFilter === 'all' ? 'Active Filter: All' : 'Click to filter all'}
            </span>
          </div>
        </div>

        {/* Pending Personal */}
        <div
          className={`dash-card dash-kpi-card dash-kpi-card--amber ${userFilter === 'pending_personal' ? 'dash-kpi-card--active' : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setUserFilter('pending_personal')}
        >
          <div className="dash-kpi-bar dash-kpi-bar--amber" />
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Pending Personal</span>
            <div className="dash-chip dash-chip--amber">
              <span className="material-symbols-outlined">person_search</span>
            </div>
          </div>
          <div className="dash-kpi-value" style={{ color: '#92600A' }}>
            <CountUp value={stats.pending_personal} />
            {stats.pending_personal > 0 && <span className="dash-pulse-dot dash-pulse-dot--amber" />}
          </div>
          <div style={{ fontSize: '12px', color: '#425466' }}>
            Awaiting CPA Form Review
          </div>
        </div>

        {/* Pending Business */}
        <div
          className={`dash-card dash-kpi-card dash-kpi-card--teal ${userFilter === 'pending_business' ? 'dash-kpi-card--active' : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setUserFilter('pending_business')}
        >
          <div className="dash-kpi-bar dash-kpi-bar--teal" />
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Pending Business</span>
            <div className="dash-chip dash-chip--teal">
              <span className="material-symbols-outlined">business_center</span>
            </div>
          </div>
          <div className="dash-kpi-value" style={{ color: '#0D9488' }}>
            <CountUp value={stats.pending_business} />
            {stats.pending_business > 0 && <span className="dash-pulse-dot dash-pulse-dot--teal" />}
          </div>
          <div style={{ fontSize: '12px', color: '#425466' }}>
            Bank Statements &amp; Ledgers
          </div>
        </div>

        {/* Staff Admins */}
        <div
          className={`dash-card dash-kpi-card dash-kpi-card--slate ${userFilter === 'admin' ? 'dash-kpi-card--active' : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setUserFilter('admin')}
        >
          <div className="dash-kpi-bar dash-kpi-bar--slate" />
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Staff Admins</span>
            <div className="dash-chip dash-chip--slate">
              <span className="material-symbols-outlined">admin_panel_settings</span>
            </div>
          </div>
          <div className="dash-kpi-value" style={{ color: '#425466' }}>
            <CountUp value={stats.admins} />
          </div>
          <div style={{ fontSize: '12px', color: '#425466' }}>
            Active Advisory Accounts
          </div>
        </div>
      </div>

      {/* ================= TAB CONTROLS ================= */}
      <div className="dash-rise" style={{ '--i': 2, marginBottom: '20px' }}>
        <div className="dash-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'users'}
            className={`dash-tab-btn ${tab === 'users' ? 'active' : ''}`}
            onClick={() => setTab('users')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>group</span>
            Client Dossiers ({filteredUsers.length})
          </button>

          <button
            role="tab"
            aria-selected={tab === 'bookmarks'}
            className={`dash-tab-btn ${tab === 'bookmarks' ? 'active' : ''}`}
            onClick={() => setTab('bookmarks')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px', color: tab === 'bookmarks' ? '#B7791F' : 'inherit' }}>star</span>
            Bookmarked Vault Documents ({bookmarks.length})
          </button>

          <button
            role="tab"
            aria-selected={tab === 'templates'}
            className={`dash-tab-btn ${tab === 'templates' ? 'active' : ''}`}
            onClick={() => setTab('templates')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>description</span>
            Statutory Templates &amp; Organizers
          </button>
        </div>
      </div>

      {/* ================= USERS OVERVIEW TAB ================= */}
      {tab === 'users' && (
        <div className="dash-tab-panel">
          {/* Search & Filter Bar */}
          <div className="dash-toolbar" style={{ marginBottom: '20px' }}>
            {/* Search Input */}
            <div className="dash-input-wrap">
              <span className="material-symbols-outlined search-icon">search</span>
              <input
                type="text"
                placeholder="Search clients by name, business, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="dash-input dash-focusable"
              />
            </div>

            {/* Admin Assignment Filter */}
            {isSuperAdmin ? (
              <select
                value={adminAssignmentFilter}
                onChange={(e) => setAdminAssignmentFilter(e.target.value)}
                className="dash-select dash-focusable"
                aria-label="Filter by assigned staff administrator"
              >
                <option value="all">👥 All Staff Administrators</option>
                <option value="unassigned">⚠️ Unassigned Clients</option>
                <optgroup label="Staff CPAs">
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.email} ({s.assigned_clients_count || 0} clients)
                    </option>
                  ))}
                </optgroup>
              </select>
            ) : (
              <select
                value={adminAssignmentFilter}
                onChange={(e) => setAdminAssignmentFilter(e.target.value)}
                className="dash-select dash-focusable"
                aria-label="Filter by assigned administrator"
              >
                <option value="all">My Assigned Clients</option>
                <option value="unassigned">Unassigned Clients</option>
              </select>
            )}

            {/* Sort Dropdown */}
            <select
              value={userSort}
              onChange={(e) => setUserSort(e.target.value)}
              className="dash-select dash-focusable"
              aria-label="Sort clients"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest_pending">Highest Pending Filings</option>
              <option value="asc">Name (A &rarr; Z)</option>
              <option value="desc">Name (Z &rarr; A)</option>
            </select>
          </div>

          {/* Client Cards Grid */}
          {loading ? (
            <div className="dash-clients-grid">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="dash-card dash-client-card" style={{ height: '180px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="dash-skeleton" style={{ width: '44px', height: '44px', borderRadius: '50%' }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div className="dash-skeleton" style={{ height: '16px', width: '60%' }} />
                      <div className="dash-skeleton" style={{ height: '13px', width: '80%' }} />
                    </div>
                  </div>
                  <div className="dash-skeleton" style={{ height: '32px', width: '100%', borderRadius: '8px' }} />
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="dash-card dash-empty-state">
              <div className="dash-empty-icon">
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>search_off</span>
              </div>
              <h4 style={{ fontSize: '16px', color: '#0A2540', margin: 0 }}>No matching clients found</h4>
              <p style={{ fontSize: '13px', color: '#425466', maxWidth: '440px', margin: 0 }}>
                Try adjusting your search criteria, tax year, or staff filter.
              </p>
            </div>
          ) : (
            <div className="dash-clients-grid">
              {filteredUsers.map((u, idx) => {
                const avatarVariant = (u.id || 0) % 4;
                const avatarClasses = [
                  'dash-avatar--brand',
                  'dash-avatar--success',
                  'dash-avatar--ai',
                  'dash-avatar--warm'
                ];
                const avatarClass = avatarClasses[avatarVariant];

                return (
                  <div
                    key={u.id}
                    className="dash-card dash-client-card dash-rise"
                    style={{ '--i': idx, cursor: 'pointer' }}
                    onClick={() => navigate(`/admin-user-detail?user_id=${u.id}`)}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                      <div className={`dash-avatar ${avatarClass}`}>
                        {(u.name || "U").charAt(0).toUpperCase()}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '15px', color: '#0A2540', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.name || "Unnamed Client"}
                        </div>
                        <div style={{ fontSize: '13px', color: '#425466', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                          {u.email}
                        </div>

                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                          <span className={`dash-pill ${u.role === 'super_admin' ? 'dash-pill--rejected' : u.role === 'admin' ? 'dash-pill--pending' : 'dash-pill--approved'}`}>
                            {u.role === 'super_admin' ? 'Super Admin' : u.role === 'admin' ? 'Staff CPA' : 'Client'}
                          </span>

                          {u.pending_personal > 0 && (
                            <span className="dash-pill dash-pill--pending">
                              {u.pending_personal} Personal
                            </span>
                          )}
                          {u.pending_business > 0 && (
                            <span className="dash-pill" style={{ background: 'rgba(20, 184, 166, 0.12)', color: '#0D9488', border: '1px solid rgba(20, 184, 166, 0.28)' }}>
                              {u.pending_business} Business
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Bottom: Assigned CPA + Action Link */}
                    <div className="dash-client-footer">
                      {isSuperAdmin ? (
                        <div className="dash-cpa-assign" onClick={(e) => e.stopPropagation()}>
                          <span
                            className="material-symbols-outlined dash-cpa-icon"
                            style={{ color: u.assigned_admin_name ? '#047857' : '#B7791F' }}
                            title={u.assigned_admin_name ? `Assigned to ${u.assigned_admin_name}` : 'Unassigned'}
                          >
                            {u.assigned_admin_name ? 'assignment_ind' : 'person_alert'}
                          </span>
                          <select
                            value={u.assigned_admin_id || ""}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleAssignAdmin(u.id, e.target.value);
                            }}
                            className="dash-cpa-select dash-focusable"
                            aria-label={`Assign CPA for ${u.name || u.email}`}
                          >
                            <option value="">Unassigned</option>
                            {staffList.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.name || s.email}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="dash-cpa-badge">
                          <span
                            className="material-symbols-outlined dash-cpa-icon"
                            style={{ color: u.assigned_admin_name ? '#047857' : '#B7791F' }}
                          >
                            {u.assigned_admin_name ? 'assignment_ind' : 'person_alert'}
                          </span>
                          <span
                            className="dash-cpa-label"
                            style={{ color: u.assigned_admin_name ? '#0A2540' : '#92600A' }}
                          >
                            {u.assigned_admin_name || 'Unassigned'}
                          </span>
                        </div>
                      )}

                      <span className="dash-open-btn">
                        <span>Open</span>
                        <span className="material-symbols-outlined dash-open-arrow">arrow_forward</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= BOOKMARKS TAB ================= */}
      {tab === 'bookmarks' && (
        <div className="dash-tab-panel">
          <div className="dash-card" style={{ padding: '24px 26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-display, 'Playfair Display', serif)", fontSize: '18px', color: '#0A2540', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#B7791F', fontSize: '22px' }}>star</span>
                  Bookmarked Vault Documents
                </h3>
                <span style={{ fontSize: '13px', color: '#425466' }}>
                  Starred items across all active client returns
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#425466', fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>
                {bookmarks.length} starred document{bookmarks.length === 1 ? '' : 's'}
              </div>
            </div>

            {bookmarks.length === 0 ? (
              <div className="dash-empty-state">
                <div className="dash-empty-icon" style={{ color: '#B7791F', background: '#FFF8E6' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>star_border</span>
                </div>
                <h4 style={{ fontSize: '16px', color: '#0A2540', margin: 0 }}>No Documents Starred</h4>
                <p style={{ fontSize: '13px', color: '#425466', maxWidth: '440px', margin: 0 }}>
                  Bookmark critical schedules in any client dossier for rapid access.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {bookmarks.map((b) => (
                  <div
                    key={`${b.type}-${b.id}`}
                    className="dash-row-card"
                    style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}
                    onClick={() => navigate(`/admin-user-detail?user_id=${b.user_id}`)}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div className="dash-chip dash-chip--blue" style={{ width: '32px', height: '32px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>description</span>
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '13.5px', color: '#0A2540', wordBreak: 'break-word', flex: 1 }}>
                        {b.filename || b.doc_name}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#425466' }}>
                      Client: <strong style={{ color: '#0A2540' }}>{b.user_name}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2E8F0', paddingTop: '10px', marginTop: '4px' }}>
                      <span className="dash-pill dash-pill--info">{b.type}</span>
                      <span className="dash-open-btn">
                        <span>Open</span>
                        <span className="material-symbols-outlined dash-open-arrow">arrow_forward</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TEMPLATES TAB ================= */}
      {tab === 'templates' && (
        <div className="dash-tab-panel">
          <div className="dash-card" style={{ padding: '24px 26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-display, 'Playfair Display', serif)", fontSize: '18px', color: '#0A2540', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#1D4ED8', fontSize: '22px' }}>description</span>
                  Official Statutory Templates &amp; Worksheets
                </h3>
                <p style={{ fontSize: '13px', color: '#425466', margin: 0 }}>
                  Upload blank organizers, deduction checklists, and engagement PDFs available to all active clients.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  value={tplCategory}
                  onChange={(e) => setTplCategory(e.target.value)}
                  className="dash-select dash-focusable"
                  style={{ height: '38px', fontSize: '12.5px' }}
                >
                  <option value="personal">Personal Documents</option>
                  <option value="business">Business Documents</option>
                </select>

                <select
                  value={tplYear}
                  onChange={(e) => setTplYear(e.target.value)}
                  className="dash-select dash-focusable"
                  style={{ height: '38px', fontSize: '12.5px' }}
                >
                  {yearOptions.map(y => (
                    <option key={y} value={y}>Tax Year {y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Templates List */}
            <div style={{ marginBottom: '28px' }}>
              <h5 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#425466', marginBottom: '12px', fontWeight: 600 }}>
                Active Templates on File:
              </h5>

              {tplLoading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#425466' }}>
                  <div className="dash-skeleton" style={{ height: '48px', width: '100%', marginBottom: '8px' }} />
                  <div className="dash-skeleton" style={{ height: '48px', width: '100%' }} />
                </div>
              ) : templates.length === 0 ? (
                <div className="dash-empty-state" style={{ padding: '28px 16px', background: '#F6F9FC', borderRadius: '12px' }}>
                  <p style={{ fontSize: '13.5px', color: '#425466', margin: 0 }}>
                    No templates configured for {tplCategory} TY {tplYear}.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {templates.map(t => (
                    <div
                      key={t.id}
                      className="dash-row-card"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="dash-chip dash-chip--blue" style={{ width: '36px', height: '36px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>picture_as_pdf</span>
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: '#0A2540' }}>{t.name}</div>
                          {t.download ? (
                            <a href={t.download} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#1D4ED8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <span>View Current PDF</span>
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span>
                            </a>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#425466' }}>No file attached</span>
                          )}
                        </div>
                      </div>

                      <button
                        className="dash-table-action-btn dash-focusable"
                        style={{ color: '#DC2626', borderColor: 'rgba(220,38,38,0.25)', borderRadius: '8px' }}
                        onClick={() => deleteTemplate(t.id)}
                        title="Delete Template"
                        aria-label={`Delete ${t.name}`}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upload New Template Form */}
            <div style={{ background: '#F6F9FC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '22px' }}>
              <h4 style={{ fontSize: '15px', color: '#0A2540', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#1D4ED8', fontSize: '18px' }}>cloud_upload</span>
                Upload New Template Worksheet
              </h4>
              <form onSubmit={handleTplUpload} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '440px' }}>
                <input
                  type="text"
                  placeholder="Template Title (e.g. Schedule C Expense Organizer)"
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  required
                  className="dash-input dash-focusable"
                  style={{ padding: '0 14px', height: '42px' }}
                />
                <input
                  type="file"
                  id="tplFile"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setTplFile(e.target.files[0])}
                  className="dash-input dash-focusable"
                  style={{ padding: '8px 12px', height: 'auto', background: '#FFFFFF' }}
                />
                <button
                  type="submit"
                  className="artha-pill-btn artha-pill-primary dash-focusable"
                  style={{ width: 'fit-content', padding: '10px 22px', fontSize: '13px' }}
                >
                  Upload &amp; Publish Template
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
