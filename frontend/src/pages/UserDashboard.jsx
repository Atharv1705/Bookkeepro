import { useState, useEffect } from 'react';
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

  useEffect(() => {
    checkEngagement();
    loadAdminDocs();
  }, []);

  const checkEngagement = async () => {
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
  };

  const handleEngagementChange = async (e) => {
    const isChecked = e.target.checked;
    if (!isChecked) {
      // Don't allow unchecking
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
      setEngagementChecked(false);
    }
  };

  const loadAdminDocs = async () => {
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
    } catch (err) {
      showToast("Network error", "error");
    } finally {
      setDocLoading(false);
    }
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
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
          background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)'
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
        </div>
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
                  <tr key={doc.id}>
                    <td>
                      <div style={{fontWeight: 500, color: 'var(--navy)'}}>{doc.doc_label}</div>
                      <div className="text-sm text-muted">{doc.filename}</div>
                    </td>
                    <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{display:'flex', gap:'8px'}}>
                        <button className="btn btn-secondary btn-sm" onClick={() => viewDoc(doc.storage_key)}>View</button>
                        <button className="btn btn-primary btn-sm" onClick={() => respondDoc(doc.id, true)} disabled={docLoading}>Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => respondDoc(doc.id, false)} disabled={docLoading}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}