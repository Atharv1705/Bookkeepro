import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function AdminUserDetail() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('user_id');
  const navigate = useNavigate();
  const { authFetch, user: currentUser } = useAuth();
  const { showToast } = useToast();
  
  const [userDetail, setUserDetail] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState('personal');
  const [taxYear, setTaxYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);

  // States for Review Emails
  const [personalTimeline, setPersonalTimeline] = useState(0);
  const [businessTimeline, setBusinessTimeline] = useState(0);

  // States for Audit Log
  const [auditLog, setAuditLog] = useState([]);
  const [auditLoaded, setAuditLoaded] = useState(false);

  const adminDocInputRef = useRef(null);

  useEffect(() => {
    if (!userId) {
      navigate('/admin-dashboard');
      return;
    }
    fetchUserDetails();
  }, [userId, taxYear]);

  const fetchUserDetails = async () => {
    setLoading(true);
    try {
      const url = taxYear ? `/api/upload/admin/users/${userId}/documents?tax_year=${taxYear}` : `/api/upload/admin/users/${userId}/documents`;
      const res = await authFetch(url);
      
      if (!res.ok) {
        if (res.status === 403) navigate('/admin-dashboard');
        return;
      }
      
      const payload = await res.json();
      setUserDetail(payload.user);
      setDocuments(payload.documents || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLog = async () => {
    try {
      const res = await authFetch(`/api/auth/admin/audit-logs?user_id=${userId}&limit=30`);
      if (res.ok) {
        setAuditLog(await res.json());
        setAuditLoaded(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit' && !auditLoaded) {
      loadAuditLog();
    }
  }, [activeTab]);

  const deleteUser = async () => {
    if (!window.confirm("WARNING: This will permanently delete this user, all their documents, and their audit history. Are you sure?")) return;
    try {
      const res = await authFetch(`/api/upload/admin/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        navigate('/admin-dashboard');
      } else {
        alert("Failed to delete user");
      }
    } catch (err) {
      console.error("Error deleting user", err);
    }
  };

  const handleChangeRole = async (newRole) => {
    if (!window.confirm(`Change user role to ${newRole}?`)) return;
    try {
      const res = await authFetch(`/api/auth/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        showToast("Role updated successfully", "success");
        fetchUserDetails();
      } else {
        const data = await res.json();
        showToast(data.detail || "Failed to change role", "error");
      }
    } catch (err) {
      showToast("Network error", "error");
    }
  };

  const handleDocApprove = async (docId, type, isApproved) => {
    try {
      const status = isApproved ? 'approved' : 'rejected';
      const ep = type === "personal" ? `/api/upload/personal-documents/${docId}/review-status` : `/api/upload/business-documents/${docId}/review-status`;
      const res = await authFetch(ep, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: "" })
      });
      if (res.ok) {
        fetchUserDetails(); // reload docs
      } else {
        showToast("Failed to save review status", "error");
      }
    } catch (err) {
      console.error("Approval error", err);
      showToast("Approval error", "error");
    }
  };

  const deleteAdminDoc = async (docId) => {
    if (!window.confirm("Delete this admin document?")) return;
    try {
      const res = await authFetch(`/api/upload/admin-documents/${docId}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Document deleted", "success");
        fetchUserDetails();
      }
    } catch(err) {
      console.error(err);
    }
  };

  const uploadAdminDoc = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("user_id", userId);
    try {
      const res = await authFetch("/api/upload/admin-documents", {
        method: "POST",
        body: fd
      });
      if (res.ok) {
        showToast("Admin document uploaded", "success");
        fetchUserDetails();
      } else {
        showToast("Failed to upload admin document", "error");
      }
    } catch(err) {
      showToast("Upload failed", "error");
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

  const sendEmail = async (type) => {
    const docsToReview = documents.filter(d => d.type === type);
    const approved = docsToReview.filter(d => d.review_status === "approved").map(d => d.doc_type);
    const rejected = docsToReview.filter(d => d.review_status === "rejected").map(d => d.doc_type);
    
    if (approved.length === 0 && rejected.length === 0) {
      showToast(`No ${type} documents selected.`, "warning");
      return;
    }

    try {
      const res = await authFetch("/api/review/notify-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          type: type,
          approved: approved,
          rejected: rejected,
          personal_timeline: type === "personal" ? personalTimeline : 0,
          business_timeline: type === "business" ? businessTimeline : 0
        })
      });
      if (res.ok) {
        showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} approval email sent`, "success");
      } else {
        showToast("Failed to send email", "error");
      }
    } catch(err) {
      showToast("Error sending email", "error");
    }
  };

  const submitAllDocs = async () => {
    if (!window.confirm("Submit all documents for review?\nAn email will be sent to the user.")) return;
    try {
      const res = await authFetch("/api/review/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId })
      });
      if (res.ok) {
        showToast("Documents submitted — email sent to user.", "success");
      } else {
        showToast("Failed to submit", "error");
      }
    } catch (err) {
      showToast("Error submitting documents", "error");
    }
  };

  if (loading && !userDetail) {
    return <div className="page-main-wide page-enter"><div className="empty-state"><div className="empty-title">Loading user details...</div></div></div>;
  }

  if (!userDetail) {
    return <div className="page-main-wide page-enter"><div className="empty-state"><div className="empty-title">User not found</div></div></div>;
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  const personalDocs = documents.filter(d => d.type === "personal");
  const businessDocs = documents.filter(d => d.type === "business");
  const returnDocs = documents.filter(d => d.type === "admin");

  return (
    <div className="page-main-wide page-enter">
      {/* User Info Bar */}
      <div className="card" style={{marginBottom: '20px'}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'16px'}}>
          <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
            <div style={{width:'52px', height:'52px', borderRadius:'50%', background:'linear-gradient(135deg,var(--header-bg),var(--blue-light))', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'20px', color:'var(--navy)', flexShrink:0}}>
              {(userDetail.name || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{fontWeight:700, fontSize:'18px', color:'var(--navy)'}}>{userDetail.name || "—"}</div>
              <div style={{fontSize:'13px', color:'var(--muted)', marginTop:'2px'}}>{userDetail.email}</div>
              <div style={{display:'flex', gap:'8px', marginTop:'6px', flexWrap:'wrap'}}>
                {currentUser?.role === 'super_admin' && currentUser.id !== userDetail.id ? (
                  <select 
                    className="select-input" 
                    style={{padding: '2px 8px', fontSize: '12px', height: 'auto', borderRadius: 'var(--radius-pill)', background: 'var(--card)', border: '1px solid var(--border)'}}
                    value={userDetail.role}
                    onChange={(e) => handleChangeRole(e.target.value)}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                    {userDetail.role === 'super_admin' && <option value="super_admin" disabled>super_admin</option>}
                  </select>
                ) : (
                  <span className={`badge ${userDetail.role === 'super_admin' ? 'badge-red' : userDetail.role === 'admin' ? 'badge-orange' : 'badge-blue'}`}>{userDetail.role}</span>
                )}
                {!userDetail.engagement_acknowledged_at && (
                  <span className="badge badge-yellow"><span className="material-symbols-outlined" style={{fontSize: '14px'}}>pending</span> Engagement not acknowledged</span>
                )}
              </div>
            </div>
          </div>
          <div style={{display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap'}}>
            <button className="btn btn-primary btn-sm" onClick={submitAllDocs} style={{borderRadius:'var(--radius-sm)'}}>Trigger Submit Review</button>
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', marginLeft: '12px', paddingLeft: '16px', borderLeft: '1px solid var(--border)'}}>
              <label className="form-label" style={{margin:0, fontSize: '11px'}}>Tax Year</label>
              <select className="select-input" style={{width: 'auto', padding: '6px 12px', fontSize: '13px'}} value={taxYear} onChange={(e) => setTaxYear(e.target.value)}>
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button className="btn btn-danger btn-sm" onClick={deleteUser} style={{borderRadius:'var(--radius-sm)'}}>Delete User</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`} onClick={() => setActiveTab('personal')}><span className="material-symbols-outlined">description</span> Personal Docs</button>
        <button className={`tab-btn ${activeTab === 'business' ? 'active' : ''}`} onClick={() => setActiveTab('business')}><span className="material-symbols-outlined">business</span> Business Docs</button>
        <button className={`tab-btn ${activeTab === 'returns' ? 'active' : ''}`} onClick={() => setActiveTab('returns')}>📤 Returns for Review</button>
        <button className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}><span className="material-symbols-outlined">history</span> Audit Trail</button>
      </div>

      {/* Tab: Personal */}
      {activeTab === 'personal' && (
        <div className="tab-panel active">
          <div style={{display:'flex', gap:'20px', flexWrap:'wrap'}}>
            <div style={{flex:2, minWidth:0}}>
              <div className="card-flat">
                {personalDocs.length === 0 ? (
                  <p className="text-muted">No personal documents uploaded for {taxYear}.</p>
                ) : (
                  personalDocs.map(doc => (
                    <div key={doc.id} style={{ display:'flex', alignItems:'flex-start', gap:'16px', padding:'14px 0', borderBottom:'1px solid var(--border)'}}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:'13px', color:'var(--navy)' }}>{doc.doc_type}</div>
                        <div style={{ fontSize:'12px', color:'var(--muted)', marginTop:'2px' }}>Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}</div>
                        {doc.notes && <div style={{ fontSize:'12px', color:'var(--warn)', marginTop:'3px' }}>Notes: {doc.notes}</div>}
                        {doc.review_status && (
                          <div style={{ fontSize:'12px', color: doc.review_status === "approved" ? "var(--success)" : doc.review_status === "rejected" ? "var(--error)" : "var(--yellow)", marginTop:'3px', fontWeight:600, textTransform:'uppercase' }}>
                            {doc.review_status}
                          </div>
                        )}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0, flexWrap:'wrap' }}>
                        <button onClick={() => viewDoc(doc.storage_key)} className="btn btn-secondary btn-sm" style={{borderRadius:'var(--radius-sm)'}}>View</button>
                        <button className="btn btn-secondary btn-sm" style={{borderRadius:'var(--radius-sm)'}} onClick={() => handleDocApprove(doc.id, doc.type, true)}>Approve</button>
                        <button className="btn btn-danger btn-sm" style={{borderRadius:'var(--radius-sm)'}} onClick={() => handleDocApprove(doc.id, doc.type, false)}>Reject</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div style={{flex:1, minWidth:'240px'}}>
              <div className="card-flat" style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                <h3>Filing Timeline</h3>
                <div className="timeline-control">
                  <button className="tl-btn" onClick={() => setPersonalTimeline(Math.max(0, personalTimeline - 1))}>−</button>
                  <div>
                    <div className="tl-value">{personalTimeline}</div>
                    <div className="tl-label">days</div>
                  </div>
                  <button className="tl-btn" onClick={() => setPersonalTimeline(personalTimeline + 1)}>+</button>
                </div>
                <button className="btn btn-secondary w-full" style={{borderRadius:'var(--radius-sm)'}} onClick={() => sendEmail("personal")}>
                  Send Personal Approval Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Business */}
      {activeTab === 'business' && (
        <div className="tab-panel active">
          <div style={{display:'flex', gap:'20px', flexWrap:'wrap'}}>
            <div style={{flex:2, minWidth:0}}>
              <div className="card-flat">
                {businessDocs.length === 0 ? (
                  <p className="text-muted">No business documents uploaded for {taxYear}.</p>
                ) : (
                  businessDocs.map(doc => (
                    <div key={doc.id} style={{ display:'flex', alignItems:'flex-start', gap:'16px', padding:'14px 0', borderBottom:'1px solid var(--border)'}}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:'13px', color:'var(--navy)' }}>{doc.doc_type}</div>
                        <div style={{ fontSize:'12px', color:'var(--muted)', marginTop:'2px' }}>Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}</div>
                        {doc.notes && <div style={{ fontSize:'12px', color:'var(--warn)', marginTop:'3px' }}>Notes: {doc.notes}</div>}
                        {doc.review_status && (
                          <div style={{ fontSize:'12px', color: doc.review_status === "approved" ? "var(--success)" : doc.review_status === "rejected" ? "var(--error)" : "var(--yellow)", marginTop:'3px', fontWeight:600, textTransform:'uppercase' }}>
                            {doc.review_status}
                          </div>
                        )}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0, flexWrap:'wrap' }}>
                        <button onClick={() => viewDoc(doc.storage_key)} className="btn btn-secondary btn-sm" style={{borderRadius:'var(--radius-sm)'}}>View</button>
                        <button className="btn btn-secondary btn-sm" style={{borderRadius:'var(--radius-sm)'}} onClick={() => handleDocApprove(doc.id, doc.type, true)}>Approve</button>
                        <button className="btn btn-danger btn-sm" style={{borderRadius:'var(--radius-sm)'}} onClick={() => handleDocApprove(doc.id, doc.type, false)}>Reject</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div style={{flex:1, minWidth:'240px'}}>
              <div className="card-flat" style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                <h3>Filing Timeline</h3>
                <div className="timeline-control">
                  <button className="tl-btn" onClick={() => setBusinessTimeline(Math.max(0, businessTimeline - 1))}>−</button>
                  <div>
                    <div className="tl-value">{businessTimeline}</div>
                    <div className="tl-label">days</div>
                  </div>
                  <button className="tl-btn" onClick={() => setBusinessTimeline(businessTimeline + 1)}>+</button>
                </div>
                <button className="btn btn-secondary w-full" style={{borderRadius:'var(--radius-sm)'}} onClick={() => sendEmail("business")}>
                  Send Business Approval Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Returns */}
      {activeTab === 'returns' && (
        <div className="tab-panel active">
          <div className="card-flat">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
              <h3 style={{margin:0}}>Admin Documents</h3>
              <div>
                <input type="file" hidden ref={adminDocInputRef} accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={e => {if(e.target.files[0]) uploadAdminDoc(e.target.files[0])}} />
                <button className="btn btn-primary btn-sm" style={{borderRadius:'var(--radius-sm)'}} onClick={() => adminDocInputRef.current?.click()}>+ Upload Document</button>
              </div>
            </div>
            {returnDocs.length === 0 ? (
              <p className="text-muted">No returns or final documents uploaded yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Filename</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnDocs.map(doc => (
                      <tr key={doc.id}>
                        <td>
                          <div style={{fontWeight:500, color:'var(--navy)'}}>{doc.filename}</div>
                        </td>
                        <td>{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                        <td>
                          <div style={{display:'flex', gap:'8px'}}>
                            <button className="btn btn-secondary btn-sm" onClick={() => viewDoc(doc.storage_key)}>View</button>
                            <button className="btn btn-danger btn-sm" onClick={() => deleteAdminDoc(doc.id)}>Delete</button>
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
      )}

      {/* Tab: Audit */}
      {activeTab === 'audit' && (
        <div className="tab-panel active">
          <div className="card-flat">
            <h3 style={{marginBottom:'16px'}}>Recent Activity</h3>
            {auditLog.length === 0 ? (
              <p className="text-muted">No audit logs found.</p>
            ) : (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Action</th>
                      <th>Details</th>
                      <th>IP / Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLog.map(log => (
                      <tr key={log.id}>
                        <td style={{whiteSpace:'nowrap', color:'var(--muted)'}}>{new Date(log.created_at).toLocaleString()}</td>
                        <td><span className="badge badge-blue">{log.action}</span></td>
                        <td>{log.details}</td>
                        <td className="text-sm text-muted">
                          {log.ip_address}<br/>
                          <span style={{fontSize:'10px'}}>{log.user_agent?.substring(0, 30)}...</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
