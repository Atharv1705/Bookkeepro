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
  const [engagementLink, setEngagementLink] = useState(null);
  // Track which doc rows have the AI summary panel open
  const [expandedSummary, setExpandedSummary] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  // Reject comment panel for admin docs: { docId, note }
  const [rejectPanel, setRejectPanel] = useState(null);


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
      
      const tplRes = await authFetch("/api/upload/templates?category=engagement&tax_year=2025");
      if (tplRes.ok) {
        const tpls = await tplRes.json();
        if (tpls && tpls.length > 0) {
          setEngagementLink(tpls[0].download);
        } else {
          // Fallback static link if no template is defined
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
    } catch (err) { console.error(err);
      showToast("Network error", "error");
    } finally {
      setDocLoading(false);
    }
  };

  const openUserRejectPanel = (docId) => {
    setRejectPanel({ docId, note: '' });
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
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px'}}>
          <div>
            <h3 style={{margin: 0, marginBottom: '4px'}}>Engagement Letter</h3>
            <p className="text-sm">Please review and acknowledge the engagement letter before uploading documents.</p>
          </div>
          {engagementLink && (
            <a 
              href={engagementLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-secondary btn-sm"
              style={{display: 'flex', alignItems: 'center', gap: '6px', borderRadius: 'var(--radius-pill)'}}
            >
              <span className="material-symbols-outlined" style={{fontSize: '18px'}}>download</span>
              Download PDF
            </a>
          )}
        </div>
        
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
                  <th>Status</th>
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
                        {doc.review_status ? (
                          <div>
                            <span className={`badge ${doc.review_status === 'approved' ? 'badge-green' : doc.review_status === 'rejected' ? 'badge-red' : 'badge-yellow'}`} style={{fontWeight:700}}>
                              {doc.review_status.toUpperCase()}
                            </span>
                            {doc.review_status === 'rejected' && doc.review_note && (
                              <div style={{fontSize:'12px', color:'#c0392b', fontStyle:'italic', marginTop:'4px'}}>
                                Reason: "{doc.review_note}"
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="badge badge-yellow">PENDING</span>
                        )}
                      </td>
                      <td>
                        <div style={{display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center'}}>
                          <button className="btn btn-secondary btn-sm" onClick={() => viewDoc(doc.storage_key)}>View</button>
                          <button className="btn btn-primary btn-sm" onClick={() => respondDoc(doc.id, true)} disabled={docLoading}>Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => openUserRejectPanel(doc.id)} disabled={docLoading}>Reject</button>
                        </div>
                      </td>
                    </tr>

                    {/* Inline Reject Panel */}
                    {rejectPanel?.docId === doc.id && (
                      <tr key={`reject-${doc.id}`}>
                        <td colSpan={4} style={{padding:'0'}}>
                          <div style={{
                            padding: '14px 16px',
                            background: 'rgba(220,53,69,0.05)',
                            border: '1px solid rgba(220,53,69,0.25)',
                            borderTop: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                          }}>
                            <div style={{fontWeight:600, fontSize:'13px', color:'#c0392b', display:'flex', alignItems:'center', gap:'6px'}}>
                              <span className="material-symbols-outlined" style={{fontSize:'16px'}}>feedback</span>
                              Reason for Rejection (optional)
                            </div>
                            <textarea
                              rows={3}
                              placeholder="Tell the admin why you are rejecting this document..."
                              value={rejectPanel.note}
                              onChange={e => setRejectPanel(prev => ({...prev, note: e.target.value}))}
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid rgba(220,53,69,0.35)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '13px',
                                resize: 'vertical',
                                outline: 'none',
                                fontFamily: 'inherit',
                                background: 'white',
                                boxSizing: 'border-box'
                              }}
                            />
                            <div style={{display:'flex', gap:'8px', justifyContent:'flex-end'}}>
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{borderRadius:'var(--radius-sm)'}}
                                onClick={() => setRejectPanel(null)}
                              >Cancel</button>
                              <button
                                className="btn btn-danger btn-sm"
                                style={{borderRadius:'var(--radius-sm)'}}
                                disabled={docLoading}
                                onClick={() => respondDoc(doc.id, false, rejectPanel.note)}
                              >
                                <span className="material-symbols-outlined" style={{fontSize:'15px', verticalAlign:'middle', marginRight:'4px'}}>block</span>
                                Confirm Rejection
                              </button>
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
