import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import CountUp from '../components/CountUp';

export default function UserDashboard() {
  const { user, authFetch } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [engagementChecked, setEngagementChecked] = useState(false);
  const [engagementDisabled, setEngagementDisabled] = useState(false);
  const [adminDocs, setAdminDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [engagementLink, setEngagementLink] = useState(null);
  const [deadlines, setDeadlines] = useState([]);
  
  // Reject comment panel for admin docs: { docId, note }
  const [rejectPanel, setRejectPanel] = useState(null);

  const checkEngagement = useCallback(async () => {
    try {
      const res = await authFetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.engagement_acknowledged_at) {
          setEngagementChecked(true);
          setEngagementDisabled(true);
        }
      }
      
      const tplRes = await authFetch(`/api/upload/templates?category=engagement&tax_year=${new Date().getFullYear()}`);
      if (tplRes.ok) {
        const tpls = await tplRes.json();
        if (tpls && tpls.length > 0) {
          setEngagementLink(tpls[0].download);
        } else {
          setEngagementLink("/Engagement_Letter_Template.pdf");
        }
      } else {
        setEngagementLink("/Engagement_Letter_Template.pdf");
      }
    } catch (err) {
      console.error(err);
      setEngagementLink("/Engagement_Letter_Template.pdf");
    }
  }, [authFetch]);

  const loadAdminDocs = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const res = await authFetch("/api/upload/admin-documents");
      if (res.ok) {
        setAdminDocs(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDocs(false);
    }
  }, [authFetch]);

  const loadDeadlines = useCallback(async () => {
    try {
      const res = await authFetch("/api/review/my-deadlines");
      if (res.ok) {
        const data = await res.json();
        setDeadlines(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load deadlines:", err);
    }
  }, [authFetch]);

  useEffect(() => {
    checkEngagement();
    loadAdminDocs();
    loadDeadlines();
  }, [checkEngagement, loadAdminDocs, loadDeadlines]);

  // Poll every 15s while any doc still has ai_summary === null (backend still processing)
  useEffect(() => {
    const hasPending = adminDocs.some(d => d.ai_summary === null);
    if (!hasPending) return;
    const timer = setInterval(loadAdminDocs, 15000);
    return () => clearInterval(timer);
  }, [adminDocs, loadAdminDocs]);

  const handleEngagementChange = async (e) => {
    const isChecked = e.target.checked;
    if (!isChecked) {
      setEngagementChecked(true);
      return;
    }
    try {
      setEngagementChecked(true);
      const res = await authFetch("/api/auth/acknowledge-engagement", { method: "POST" });
      if (res.ok) {
        showToast("Engagement Letter acknowledged successfully", "success");
        setEngagementDisabled(true);
      } else {
        setEngagementChecked(false);
      }
    } catch (err) {
      console.error(err);
      setEngagementChecked(false);
    }
  };

  const viewDoc = async (storageKey) => {
    try {
      const res = await authFetch(`/api/upload/view-url?key=${encodeURIComponent(storageKey)}`);
      if (res.ok) {
        const data = await res.json();
        window.open(data.url, "_blank");
      } else {
        showToast("Could not generate view link", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Could not generate view link", "error");
    }
  };

  const downloadDoc = async (storageKey, originalFilename) => {
    try {
      const res = await authFetch(`/api/upload/view-url?key=${encodeURIComponent(storageKey)}`);
      if (res.ok) {
        const data = await res.json();
        const fileRes = await fetch(data.url);
        const blob = await fileRes.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = originalFilename || storageKey.split('/').pop() || 'document';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        showToast("Could not generate download link", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error downloading document", "error");
    }
  };

  const respondDoc = async (docId, approved, reason = "") => {
    if (docLoading) return;
    setDocLoading(true);
    try {
      const res = await authFetch("/api/review/admin-doc-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId, status: approved ? "approved" : "rejected", reason })
      });
      if (res.ok) {
        setRejectPanel(null);
        showToast(`Document ${approved ? 'approved' : 'rejected'} successfully`, "success");
        loadAdminDocs();
      } else {
        showToast("Failed to submit response", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error", "error");
    } finally {
      setDocLoading(false);
    }
  };

  const openUserRejectPanel = (docId) => {
    setRejectPanel({ docId, note: '' });
  };

  // ── Derived Numbers (Constraint 1) ─────────────────────────
  const totalDeliverables = adminDocs.length;
  const approvedDocs = adminDocs.filter(d => d.review_status === 'approved').length;
  const pendingReviewDocs = adminDocs.filter(d => d.review_status === 'sent_for_approval' || d.review_status === 'pending' || !d.review_status).length;
  const percentApproved = totalDeliverables > 0 ? Math.round((approvedDocs / totalDeliverables) * 100) : 0;

  // Next deadline calculation
  const upcomingDeadlines = deadlines.filter(d => typeof d.days_left === 'number');
  const minDeadline = upcomingDeadlines.length > 0 
    ? upcomingDeadlines.reduce((min, d) => d.days_left < min.days_left ? d : min, upcomingDeadlines[0]) 
    : null;
  const isAnyOverdue = deadlines.some(d => d.is_overdue || d.days_left < 0);

  // SVG Progress Ring calculations (radius 38, perimeter = 2 * PI * 38 = 238.76)
  const ringRadius = 38;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = totalDeliverables > 0 
    ? ringCircumference - (percentApproved / 100) * ringCircumference 
    : ringCircumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ================= 1. EXECUTIVE AURORA HERO ================= */}
      <section className="dash-hero dash-rise" style={{ '--i': 0 }}>
        <div>
          <div className="dash-hero-eyebrow">
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>shield</span>
            CLIENT ADVISORY VAULT
          </div>
          <h1 className="dash-hero-title">Welcome, {user?.name || user?.email?.split('@')[0]}</h1>
          <p className="dash-hero-sub">
            Secure workspace for document exchange, verified tax filings, and AI ledger reconciliation.
          </p>

          <div className="dash-hero-badges">
            <div className="dash-glass-pill">
              <span className="material-symbols-outlined">verified</span>
              <span>Active Client Vault</span>
            </div>
            <div className="dash-glass-pill">
              <span className="material-symbols-outlined">calendar_today</span>
              <span>TY {new Date().getFullYear()}</span>
            </div>
            <div className="dash-glass-pill">
              <span className="material-symbols-outlined">lock</span>
              <span>Secure Client Portal</span>
            </div>
          </div>
        </div>

        {/* Right: SVG Progress Ring */}
        <div className="dash-progress-ring-wrap">
          <svg className="dash-progress-ring-svg" viewBox="0 0 96 96">
            <defs>
              <linearGradient id="userRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#14B8A6" />
              </linearGradient>
            </defs>
            <circle
              className="dash-progress-ring-track"
              cx="48"
              cy="48"
              r={ringRadius}
              strokeWidth="7"
              fill="none"
            />
            {totalDeliverables > 0 && (
              <circle
                className="dash-progress-ring-bar"
                cx="48"
                cy="48"
                r={ringRadius}
                strokeWidth="7"
                fill="none"
                stroke="url(#userRingGrad)"
                strokeDasharray={ringCircumference}
                strokeDashoffset={strokeDashoffset}
              />
            )}
          </svg>
          <div style={{
            position: 'absolute',
            marginTop: '26px',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '18px',
            fontWeight: 700,
            color: '#FFFFFF'
          }}>
            {totalDeliverables === 0 ? '-' : <CountUp value={percentApproved} suffix="%" />}
          </div>
          <div className="dash-progress-caption">
            {totalDeliverables === 0 ? 'No deliverables yet' : 'Deliverables approved'}
          </div>
        </div>
      </section>

      {/* ================= 2. KPI STRIP ================= */}
      <section className="dash-kpis dash-rise" style={{ '--i': 1 }}>
        {/* Deliverables */}
        <div className="dash-card dash-kpi-card">
          <div className="dash-kpi-bar dash-kpi-bar--blue" />
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Deliverables</span>
            <div className="dash-chip dash-chip--blue">
              <span className="material-symbols-outlined">folder_open</span>
            </div>
          </div>
          <div className="dash-kpi-value">
            <CountUp value={totalDeliverables} />
          </div>
        </div>

        {/* Needs your review */}
        <div className="dash-card dash-kpi-card">
          <div className="dash-kpi-bar dash-kpi-bar--amber" />
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Needs your review</span>
            <div className="dash-chip dash-chip--amber">
              <span className="material-symbols-outlined">pending_actions</span>
            </div>
          </div>
          <div className="dash-kpi-value">
            <CountUp value={pendingReviewDocs} />
            {pendingReviewDocs > 0 && <span className="dash-pulse-dot" title="Action pending" />}
          </div>
        </div>

        {/* Approved */}
        <div className="dash-card dash-kpi-card">
          <div className="dash-kpi-bar dash-kpi-bar--green" />
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Approved</span>
            <div className="dash-chip dash-chip--green">
              <span className="material-symbols-outlined">task_alt</span>
            </div>
          </div>
          <div className="dash-kpi-value">
            <CountUp value={approvedDocs} />
          </div>
        </div>

        {/* Next deadline */}
        <div className="dash-card dash-kpi-card">
          <div className={`dash-kpi-bar ${isAnyOverdue ? 'dash-kpi-bar--red' : 'dash-kpi-bar--blue'}`} />
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Next deadline</span>
            <div className={`dash-chip ${isAnyOverdue ? 'dash-chip--red' : 'dash-chip--blue'}`}>
              <span className="material-symbols-outlined">event</span>
            </div>
          </div>
          <div className="dash-kpi-value" style={{ color: isAnyOverdue ? '#DC2626' : 'var(--ink, #0A2540)', fontSize: minDeadline ? '24px' : '30px' }}>
            {!minDeadline ? (
              'None'
            ) : minDeadline.is_overdue || minDeadline.days_left < 0 ? (
              <span style={{ color: '#DC2626' }}>Overdue</span>
            ) : (
              `${minDeadline.days_left}d`
            )}
          </div>
        </div>
      </section>

      {/* ================= 3. URGENT FILING DEADLINES BANNER ================= */}
      {deadlines && deadlines.some(d => d.days_left <= 7) && (
        <section className={`dash-alert ${deadlines.some(d => d.is_overdue || d.days_left < 0) ? 'dash-alert--overdue' : ''} dash-rise`} style={{ '--i': 2 }}>
          <div className="dash-alert-left">
            <div className={`dash-chip ${deadlines.some(d => d.is_overdue || d.days_left < 0) ? 'dash-chip--red' : 'dash-chip--amber'}`}>
              <span className="material-symbols-outlined">alarm</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#0A2540', fontSize: '14.5px', marginBottom: '3px' }}>
                Action Required: Upcoming Statutory Tax Deadlines
              </div>
              <div style={{ fontSize: '13px', color: '#425466' }}>
                {deadlines.filter(d => d.days_left <= 7).map((d, idx) => (
                  <span key={idx} style={{ marginRight: '16px', display: 'inline-block' }}>
                    <strong>{d.doc_type?.toUpperCase()}</strong>:{' '}
                    {d.is_overdue || d.days_left < 0 ? (
                      <span style={{ color: '#DC2626', fontWeight: 600 }}>Overdue by {Math.abs(d.days_left)} day(s)</span>
                    ) : (
                      <span>Due in {d.days_left} day(s) ({new Date(d.deadline_date).toLocaleDateString()})</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================= 4. ENGAGEMENT LETTER MODULE ================= */}
      <section className="dash-card dash-rise" style={{ '--i': 3, padding: '24px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontFamily: "var(--font-display, 'Playfair Display', serif)", fontSize: '18px', color: '#0A2540', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#1D4ED8', fontSize: '20px' }}>handshake</span>
              Professional Engagement Letter
            </h3>
            <p style={{ fontSize: '13px', color: '#425466', margin: 0 }}>
              Annual terms of engagement &amp; professional representation for Tax Year {new Date().getFullYear()}.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {engagementDisabled ? (
              <span className="dash-pill dash-pill--approved">
                Acknowledged &amp; Verified
              </span>
            ) : (
              <span className="dash-pill dash-pill--pending">
                Action Required
              </span>
            )}

            {engagementLink && (
              <a
                href={engagementLink}
                target="_blank"
                rel="noopener noreferrer"
                className="artha-pill-btn artha-pill-outline"
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>download</span>
                Download PDF
              </a>
            )}
          </div>
        </div>

        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px 18px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: engagementDisabled ? 'default' : 'pointer' }}>
            <input
              type="checkbox"
              checked={engagementChecked}
              disabled={engagementDisabled}
              onChange={handleEngagementChange}
              style={{ width: '18px', height: '18px', accentColor: '#1D4ED8', cursor: engagementDisabled ? 'default' : 'pointer' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: '#0A2540', fontSize: '13.5px' }}>
                I acknowledge and accept the ABC CPA Engagement Agreement
              </div>
              <div style={{ fontSize: '12px', color: '#425466', marginTop: '2px' }}>
                Authorizes our advisory team to prepare filings, represent your accounts, and maintain confidential financial ledgers.
              </div>
            </div>
            <div className={`dash-chip ${engagementChecked ? 'dash-chip--green' : 'dash-chip--amber'}`} style={{ width: '32px', height: '32px', borderRadius: '50%' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                {engagementChecked ? 'done' : 'hourglass_top'}
              </span>
            </div>
          </label>
        </div>
      </section>

      {/* ================= 5. PRACTICE VAULT ACTION HUB ================= */}
      <section className="dash-vault-grid dash-rise" style={{ '--i': 4 }}>
        {/* Personal Docs Card */}
        <div className="dash-card dash-vault-card">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div className="dash-vault-tile dash-vault-tile--brand">
                <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>person</span>
              </div>
              <span className="dash-pill dash-pill--info">FORM 1040 / W-2</span>
            </div>

            <h3 style={{ fontFamily: "var(--font-display, 'Playfair Display', serif)", fontSize: '19px', color: '#0A2540', margin: '0 0 6px' }}>
              Personal Tax Documents
            </h3>
            <p style={{ fontSize: '13px', color: '#425466', margin: '0 0 14px', lineHeight: 1.5 }}>
              Upload wage statements, 1099 contracts, government IDs, foreign bank disclosures (FBAR), and itemized deduction records.
            </p>

            <ul className="dash-vault-list">
              <li>
                <span className="material-symbols-outlined check-icon">check_circle</span>
                W-2s, 1099-NEC, 1099-INT/DIV &amp; K-1 Pass-Throughs
              </li>
              <li>
                <span className="material-symbols-outlined check-icon">check_circle</span>
                FinCEN 114 (FBAR) &amp; Form 8938 Foreign Assets
              </li>
              <li>
                <span className="material-symbols-outlined check-icon">check_circle</span>
                Mortgage 1098 &amp; Charitable Deduction Receipts
              </li>
            </ul>
          </div>

          <button
            className="artha-pill-btn artha-pill-primary dash-focusable"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={!engagementChecked}
            onClick={() => navigate('/upload-personal')}
          >
            Access Personal Vault
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
          </button>
        </div>

        {/* Business Docs Card */}
        <div className="dash-card dash-vault-card dash-vault-card--business">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div className="dash-vault-tile dash-vault-tile--success">
                <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>business_center</span>
              </div>
              <span className="dash-pill dash-pill--approved">1120-S / LLC / P&amp;L</span>
            </div>

            <h3 style={{ fontFamily: "var(--font-display, 'Playfair Display', serif)", fontSize: '19px', color: '#0A2540', margin: '0 0 6px' }}>
              Business &amp; Entity Documents
            </h3>
            <p style={{ fontSize: '13px', color: '#425466', margin: '0 0 14px', lineHeight: 1.5 }}>
              Upload bank statements for AI reconciliation, payroll summaries, corporate agreements, and asset depreciation logs.
            </p>

            <ul className="dash-vault-list">
              <li>
                <span className="material-symbols-outlined check-icon">check_circle</span>
                Instant AI Ingestion from Bank Statements (PDF/Image)
              </li>
              <li>
                <span className="material-symbols-outlined check-icon">check_circle</span>
                Form 1120, 1120-S &amp; 1065 Partnership Filings
              </li>
              <li>
                <span className="material-symbols-outlined check-icon">check_circle</span>
                Balance Sheet, Trial Balance &amp; QuickBooks Ledgers
              </li>
            </ul>
          </div>

          <button
            className="artha-pill-btn artha-pill-dark dash-focusable"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={!engagementChecked}
            onClick={() => navigate('/upload-business')}
          >
            Access Business Vault
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
          </button>
        </div>
      </section>

      {/* ================= 6. AI ASSISTANT CARD (VIOLET) ================= */}
      <section className="dash-ai dash-rise" style={{ '--i': 5 }}>
        <div className="dash-ai-left">
          <div className="dash-chip dash-chip--violet" style={{ width: '44px', height: '44px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>auto_awesome</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--ink, #0A2540)', fontSize: '15.5px' }}>
              Ask the AI assistant
            </div>
            <div style={{ color: '#425466', fontSize: '13px', marginTop: '2px' }}>
              Get quick answers about your documents and filings.
            </div>
          </div>
        </div>

        <button
          className="dash-ai-btn dash-focusable"
          onClick={() => document.querySelector('.chatbot-fab')?.click()}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>forum</span>
          Open Assistant
        </button>
      </section>

      {/* ================= 7. CERTIFIED DELIVERABLES TABLE ================= */}
      <section className="dash-card dash-rise" style={{ '--i': 6, padding: '24px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontFamily: "var(--font-display, 'Playfair Display', serif)", fontSize: '18px', color: '#0A2540', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#1D4ED8', fontSize: '20px' }}>inventory_2</span>
              Final Tax Returns &amp; CPA Deliverables
            </h3>
            <p style={{ fontSize: '13px', color: '#425466', margin: 0 }}>
              Official tax filings, audit defense packages, and reconciled P&amp;L statements finalized by your advisory partner.
            </p>
          </div>

          <div style={{ fontSize: '12px', color: '#425466', fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>
            {adminDocs.length} deliverable{adminDocs.length === 1 ? '' : 's'} available
          </div>
        </div>

        {loadingDocs ? (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Document Label &amp; File</th>
                  <th>Date Prepared</th>
                  <th>Status &amp; Client Action</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map(n => (
                  <tr key={n}>
                    <td><div className="dash-skeleton" style={{ height: '18px', width: '65%' }} /></td>
                    <td><div className="dash-skeleton" style={{ height: '16px', width: '50%' }} /></td>
                    <td><div className="dash-skeleton" style={{ height: '22px', width: '90px' }} /></td>
                    <td style={{ textAlign: 'right' }}><div className="dash-skeleton" style={{ height: '28px', width: '80px', display: 'inline-block' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : adminDocs.length === 0 ? (
          <div className="dash-empty-state">
            <div className="dash-empty-icon">
              <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>folder_open</span>
            </div>
            <h4 style={{ fontSize: '16px', color: '#0A2540', margin: 0 }}>No Deliverables Published Yet</h4>
            <p style={{ fontSize: '13px', color: '#425466', maxWidth: '440px', margin: 0 }}>
              Once our CPAs review your statements and prepare final returns, they will appear here for your review and approval.
            </p>
          </div>
        ) : (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Document Label &amp; File</th>
                  <th>Date Prepared</th>
                  <th>Status &amp; Client Action</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminDocs.map(doc => (
                  <React.Fragment key={doc.id}>
                    <tr>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="dash-chip dash-chip--blue" style={{ width: '32px', height: '32px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                              picture_as_pdf
                            </span>
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0A2540', fontSize: '13.5px' }}>{doc.doc_label}</div>
                            <div style={{ fontSize: '11.5px', color: '#425466' }}>{doc.filename}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', color: '#425466' }}>
                          {new Date(doc.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </td>
                      <td>
                        {doc.review_status === 'approved' ? (
                          <span className="dash-pill dash-pill--approved">
                            Approved by Client
                          </span>
                        ) : doc.review_status === 'rejected' ? (
                          <div>
                            <span className="dash-pill dash-pill--rejected">
                              Revision Requested
                            </span>
                            {doc.review_note && (
                              <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px', fontStyle: 'italic' }}>
                                Note: &ldquo;{doc.review_note}&rdquo;
                              </div>
                            )}
                          </div>
                        ) : doc.review_status === 'sent_for_approval' ? (
                          <div>
                            <span className="dash-pill dash-pill--pending">
                              Pending Client Approval
                            </span>
                            {doc.review_note && (
                              <div style={{ fontSize: '11.5px', color: '#92600A', marginTop: '4px', fontStyle: 'italic' }}>
                                CPA Note: &ldquo;{doc.review_note}&rdquo;
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="dash-pill dash-pill--pending">
                            Pending Review
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button
                            className="dash-table-action-btn"
                            title="View Document"
                            onClick={() => viewDoc(doc.storage_key)}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility</span>
                          </button>
                          <button
                            className="dash-table-action-btn"
                            title="Download Document"
                            onClick={() => downloadDoc(doc.storage_key, doc.filename)}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
                          </button>

                          {doc.review_status === 'sent_for_approval' && (
                            <>
                              <button
                                className="artha-pill-btn artha-pill-primary"
                                style={{ padding: '5px 12px', fontSize: '12px' }}
                                onClick={() => respondDoc(doc.id, true)}
                                disabled={docLoading}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>
                                Approve
                              </button>
                              <button
                                className="artha-pill-btn artha-pill-outline"
                                style={{ padding: '5px 10px', fontSize: '12px', color: '#DC2626', borderColor: 'rgba(220,38,38,0.3)' }}
                                onClick={() => openUserRejectPanel(doc.id)}
                                disabled={docLoading}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                                Request Changes
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Inline Reject Feedback Panel */}
                    {rejectPanel?.docId === doc.id && (
                      <tr key={`reject-${doc.id}`}>
                        <td colSpan={4} style={{ padding: '0' }}>
                          <div
                            style={{
                              padding: '18px 22px',
                              background: '#FFF8F8',
                              borderTop: '1px solid rgba(220, 38, 38, 0.2)',
                              borderBottom: '1px solid rgba(220, 38, 38, 0.2)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px'
                            }}
                          >
                            <div style={{ fontWeight: 600, fontSize: '13px', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit_note</span>
                              Specify Revisions Needed for CPA Review
                            </div>
                            <textarea
                              rows={3}
                              placeholder="Please explain the discrepancy, missing deduction, or change requested..."
                              value={rejectPanel.note}
                              onChange={e => setRejectPanel(prev => ({ ...prev, note: e.target.value }))}
                              style={{
                                width: '100%',
                                padding: '12px 14px',
                                border: '1px solid rgba(220, 38, 38, 0.3)',
                                borderRadius: '12px',
                                fontSize: '13px',
                                outline: 'none',
                                fontFamily: 'inherit',
                                background: '#FFFFFF'
                              }}
                            />
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                              <button
                                className="artha-pill-btn artha-pill-outline"
                                style={{ padding: '6px 14px', fontSize: '12px' }}
                                onClick={() => setRejectPanel(null)}
                              >
                                Cancel
                              </button>
                              <button
                                className="artha-pill-btn artha-pill-dark"
                                style={{ padding: '6px 16px', fontSize: '12px', background: '#DC2626', borderColor: '#DC2626' }}
                                disabled={docLoading}
                                onClick={() => respondDoc(doc.id, false, rejectPanel.note)}
                              >
                                Submit Revision Request
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

