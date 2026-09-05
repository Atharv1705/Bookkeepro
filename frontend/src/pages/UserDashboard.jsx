import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function UserDashboard() {
  const { user, authFetch } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [engagementChecked, setEngagementChecked] = useState(false);
  const [engagementDisabled, setEngagementDisabled] = useState(false);
  const [adminDocs, setAdminDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  // Track which doc rows have the AI summary panel open
  const [expandedSummary, setExpandedSummary] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // ── declare callbacks BEFORE the effects that reference them ──

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const res = await authFetch(`/api/search/semantic?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        setSearchResults(await res.json());
      } else {
        showToast("Search failed", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Search failed", "error");
    } finally {
      setIsSearching(false);
    }
  };

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
    } catch (err) {
      console.error(err);
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

  useEffect(() => {
    checkEngagement();
    loadAdminDocs();
  }, [checkEngagement, loadAdminDocs]);

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
    } catch (err) { console.error(err);
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
    } catch (err) { console.error(err);
      showToast("Could not generate view link", "error");
    }
  };

  const respondDoc = async (docId, approved) => {
    if (docLoading) return;
    let reason = "";
    if (!approved) {
      reason = window.prompt("Reason for rejection:");
      if (reason === null) return;
    }
    setDocLoading(true);
    try {
      const res = await authFetch("/api/review/admin-doc-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId, status: approved ? "approved" : "rejected", reason })
      });
      if (res.ok) {
        showToast(`Document ${approved ? 'approved' : 'rejected'} successfully`, "success");
      } else {
        showToast("Failed to submit response", "error");
      }
    } catch (err) { console.error(err);
      showToast("Network error", "error");
    } finally {
      setDocLoading(false);
    }
  };

  const toggleSummary = (docId) => {
    setExpandedSummary(prev => ({ ...prev, [docId]: !prev[docId] }));
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Welcome, {user?.name || user?.email?.split('@')[0]}</h1>
          <p className="page-meta">Here is your dashboard overview</p>
        </div>
      </div>

      <div className="card fade-up">
        <h3 style={{marginBottom: '16px'}}>Engagement Letter</h3>
        <p className="text-sm" style={{marginBottom: '16px'}}>Please acknowledge the engagement letter before uploading documents.</p>
        <label style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
          background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
          cursor: engagementDisabled ? 'not-allowed' : 'pointer'
        }}>
          <input
            type="checkbox"
            checked={engagementChecked}
            disabled={engagementDisabled}
            onChange={handleEngagementChange}
            style={{width:'20px', height:'20px', cursor: engagementDisabled ? 'not-allowed' : 'pointer'}}
          />
          <div>
            <div style={{fontWeight: 600, color: 'var(--navy)'}}>I acknowledge the Engagement Letter</div>
            <div style={{fontSize: '13px', color: 'var(--muted)', marginTop: '2px'}}>By checking this, you agree to our terms of service for the current tax year.</div>
          </div>
        </label>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '20px'}}>
        <div className="card fade-up" style={{animationDelay: '0.1s'}}>
          <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom: '12px'}}>
            <span className="material-symbols-outlined" style={{color:'var(--accent)', fontSize:'28px'}}>description</span>
            <h3 style={{margin:0}}>Personal Documents</h3>
          </div>
          <p className="text-sm text-muted" style={{marginBottom: '20px', minHeight: '40px'}}>Upload your W-2s, 1099s, IDs, and other individual tax forms.</p>
          <button
            className="btn btn-primary w-full"
            disabled={!engagementChecked}
            onClick={() => navigate('/upload-personal')}
          >
            Go to Personal Upload
          </button>
        </div>

        <div className="card fade-up" style={{animationDelay: '0.2s'}}>
          <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom: '12px'}}>
            <span className="material-symbols-outlined" style={{color:'var(--orange)', fontSize:'28px'}}>business</span>
            <h3 style={{margin:0}}>Business Documents</h3>
          </div>
          <p className="text-sm text-muted" style={{marginBottom: '20px', minHeight: '40px'}}>Upload corporate documents, bookkeeping ledgers, and business receipts.</p>
          <button
            className="btn btn-primary w-full"
            disabled={!engagementChecked}
            onClick={() => navigate('/upload-business')}
          >
            Go to Business Upload
          </button>
        </div>
      </div>

      <div className="card fade-up" style={{animationDelay: '0.3s', marginTop: '20px'}}>
        <h3 style={{marginBottom: '16px'}}>Admin Returns / Documents</h3>
        <p className="text-sm" style={{marginBottom: '16px'}}>Documents and tax returns finalized by the admin.</p>

        {loadingDocs ? (
          <div className="empty-state">Loading documents...</div>
        ) : adminDocs.length === 0 ? (
          <div className="empty-state">No documents have been provided by the admin yet.</div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Date Provided</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminDocs.map(doc => (
                  <>
                    <tr key={doc.id}>
                      <td>
                        <div style={{fontWeight: 500, color: 'var(--navy)'}}>{doc.doc_label}</div>
                        <div className="text-sm text-muted">{doc.filename}</div>
                      </td>
                      <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                      <td>
                        <div style={{display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center'}}>
                          <button className="btn btn-secondary btn-sm" onClick={() => viewDoc(doc.storage_key)}>View</button>
                          <button className="btn btn-primary btn-sm" onClick={() => respondDoc(doc.id, true)} disabled={docLoading}>Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => respondDoc(doc.id, false)} disabled={docLoading}>Reject</button>

                          {/* AI Summary badge / button */}
                          {doc.ai_summary === null ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '6px',
                              fontSize: '11.5px', fontWeight: 500,
                              color: 'var(--brass-dark)',
                              padding: '5px 12px', borderRadius: 'var(--radius-pill)',
                              background: 'var(--brass-light)',
                              border: '1px solid rgba(176,128,61,0.25)',
                              letterSpacing: '0.01em',
                            }}>
                              <span style={{display:'inline-block', animation:'spin 1.5s linear infinite', fontSize:'13px'}}>✦</span>
                              Analyzing…
                            </span>
                          ) : doc.ai_summary ? (
                            <button
                              onClick={() => toggleSummary(doc.id)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                fontSize: '11.5px', fontWeight: 600,
                                padding: '5px 14px', borderRadius: 'var(--radius-pill)',
                                border: expandedSummary[doc.id]
                                  ? '1px solid var(--accent)'
                                  : '1px solid rgba(44,122,91,0.35)',
                                cursor: 'pointer',
                                background: expandedSummary[doc.id]
                                  ? 'var(--accent)'
                                  : 'linear-gradient(135deg, rgba(44,122,91,0.10) 0%, rgba(31,93,70,0.06) 100%)',
                                color: expandedSummary[doc.id] ? '#fff' : 'var(--accent)',
                                boxShadow: expandedSummary[doc.id] ? 'var(--shadow-sm)' : 'none',
                                transition: 'all 0.22s ease',
                                letterSpacing: '0.01em',
                              }}
                            >
                              <span style={{fontSize:'13px'}}>✨</span>
                              {expandedSummary[doc.id] ? 'Hide Summary' : 'AI Summary'}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded AI Summary panel — spans full row width */}
                    {expandedSummary[doc.id] && doc.ai_summary && (
                      <tr key={`${doc.id}-summary`}>
                        <td colSpan={3} style={{padding: '0 0 14px'}}>
                          <div style={{
                            display: 'flex',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden',
                            border: '1px solid rgba(44,122,91,0.20)',
                            boxShadow: '0 4px 20px -6px rgba(44,122,91,0.18)',
                            background: 'linear-gradient(135deg, rgba(44,122,91,0.07) 0%, rgba(31,93,70,0.03) 100%)',
                            backdropFilter: 'blur(8px)',
                            animation: 'fadeUp 0.2s ease',
                          }}>
                            {/* Left accent strip */}
                            <div style={{
                              width: '4px', flexShrink: 0,
                              background: 'linear-gradient(180deg, var(--accent) 0%, var(--brass) 100%)',
                            }} />

                            <div style={{padding: '16px 20px', flex: 1}}>
                              {/* Header row */}
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                marginBottom: '10px'
                              }}>
                                <div style={{
                                  width: '28px', height: '28px', borderRadius: 'var(--radius-xs)',
                                  background: 'linear-gradient(135deg, var(--accent) 0%, var(--emerald-dark) 100%)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '14px', flexShrink: 0,
                                  boxShadow: '0 2px 8px rgba(44,122,91,0.30)',
                                }}>
                                  ✨
                                </div>
                                <div>
                                  <div style={{
                                    fontSize: '10px', fontWeight: 700,
                                    letterSpacing: '0.08em', textTransform: 'uppercase',
                                    color: 'var(--accent)',
                                  }}>AI Document Summary</div>
                                  <div style={{
                                    fontSize: '11px', color: 'var(--muted)', marginTop: '1px'
                                  }}>Generated by BookKeepPro AI</div>
                                </div>
                              </div>

                              {/* Summary text */}
                              <p style={{
                                fontSize: '13.5px', lineHeight: '1.7',
                                color: 'var(--ink)',
                                margin: 0,
                                fontFamily: 'var(--font-body)',
                              }}>
                                {doc.ai_summary}
                              </p>

                              {/* Footer disclaimer */}
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                marginTop: '12px',
                                paddingTop: '10px',
                                borderTop: '1px solid rgba(44,122,91,0.12)',
                              }}>
                                <span style={{fontSize:'11px', color:'var(--muted)'}}>⚠</span>
                                <span style={{
                                  fontSize: '11px', color: 'var(--muted)',
                                  fontStyle: 'italic',
                                }}>
                                  AI-generated summary — always review the original document for authoritative information.
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
