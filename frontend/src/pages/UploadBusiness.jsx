import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function UploadBusiness() {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [docs, setDocs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRefs = useRef({});
  const extraFileRef = useRef(null);

  useEffect(() => {
    fetchTemplatesAndDocs();
  }, [taxYear]);

  const fetchTemplatesAndDocs = async () => {
    setLoading(true);
    try {
      const tplRes = await authFetch(`/api/upload/templates?category=business&tax_year=${taxYear}`);
      if (tplRes.ok) {
        setTemplates(await tplRes.json());
      }
      
      const docRes = await authFetch(`/api/upload/business-documents?tax_year=${taxYear}`);
      if (docRes.ok) {
        setDocs(await docRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file, docType) => {
    if (file.size > 10 * 1024 * 1024) {
      showToast("File size exceeds 10MB limit", "error");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("tax_year", taxYear);
    fd.append("doc_type", docType);
    try {
      const res = await authFetch("/api/upload/business-documents", {
        method: "POST",
        body: fd
      });
      if (res.ok) {
        showToast("Document uploaded successfully", "success");
        fetchTemplatesAndDocs();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.detail || "Upload failed", "error");
      }
    } catch (err) {
      showToast("Upload failed due to network error", "error");
    }
  };

  const deleteDoc = async (id) => {
    if (!window.confirm("Delete this document?\nThis action cannot be undone.")) return;
    try {
      const res = await authFetch(`/api/upload/business-documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Document deleted", "success");
        fetchTemplatesAndDocs();
      } else {
        showToast("Delete failed", "error");
      }
    } catch (err) {
      showToast("Delete failed", "error");
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

  const handleExtraUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (let file of files) {
      if (file.size > 10 * 1024 * 1024) {
        showToast(`File ${file.name} exceeds 10MB limit`, "error");
        continue;
      }
      await uploadFile(file, "other");
    }
    e.target.value = "";
  };

  const notifyComplete = async () => {
    try {
      const res = await authFetch("/api/upload/notify-upload-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_count: docs.length, doc_category: "Business" })
      });
      if (res.ok) {
        showToast("Admin notified successfully", "success");
      } else {
        showToast("Failed to notify admin", "error");
      }
    } catch (err) {
      showToast("Error notifying admin", "error");
    }
  };

  const years = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];

  return (
    <div>
      <div style={{marginBottom: '16px'}}>
        <Link to="/dashboard" className="fancy-link" style={{fontSize: '14px', fontWeight: 500}}>← Back to Dashboard</Link>
      </div>
      <div className="page-heading">
        <div>
          <h1>Business Documents</h1>
          <p className="page-meta">Upload your business tax documents securely</p>
        </div>
        <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'4px'}}>
          <label className="form-label" style={{margin:0}}>Tax Year</label>
          <select 
            className="select-input" 
            style={{width:'auto', padding:'8px 14px'}}
            value={taxYear}
            onChange={(e) => setTaxYear(e.target.value)}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{marginBottom: '20px'}}>
        <h3 style={{marginBottom: '16px'}}>Required Documents</h3>
        <div id="docWrapper">
          {loading ? (
            <div className="empty-state">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="empty-state">No required documents for this tax year.</div>
          ) : templates.map((dt, i) => {
            const uploaded = docs.filter(d => d.doc_type === dt.name);
            return (
              <div className="doc-slot fade-up" key={i} style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="doc-slot-info">
                  <div className="doc-slot-name">{i+1}. {dt.name}</div>
                  <div className="doc-slot-status">
                    {uploaded.length ? (
                      <span className="pill-pending"><span className="material-symbols-outlined">pending</span> Pending Review</span>
                    ) : (
                      "Missing"
                    )}
                  </div>
                </div>
                <div className="doc-slot-actions">
                  <input 
                    type="file" 
                    hidden 
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                    ref={el => fileInputRefs.current[dt.name] = el}
                    onChange={(e) => e.target.files[0] && uploadFile(e.target.files[0], dt.name)}
                  />
                  <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                    {dt.download && (
                      <a href={dt.download} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{borderRadius: 'var(--radius-pill)', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '4px'}}>
                        <span className="material-symbols-outlined" style={{fontSize: '16px'}}>download</span> Template
                      </a>
                    )}
                    {!uploaded.length && (
                      <button className="btn btn-sm btn-upload-pill" onClick={() => fileInputRefs.current[dt.name].click()}>Upload</button>
                    )}
                  </div>
                  {uploaded.map(doc => (
                    <div key={doc.id} style={{display:'flex', gap:'8px'}}>
                      <button className="btn btn-secondary btn-xs" style={{borderRadius:'var(--radius-sm)'}} onClick={() => viewDoc(doc.storage_key)}>View</button>
                      <button className="btn btn-danger btn-xs" style={{borderRadius:'var(--radius-sm)'}} onClick={() => deleteDoc(doc.id)}>Delete</button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="flex-between" style={{marginBottom: '16px'}}>
          <div>
            <h3>Additional Documents</h3>
            <p className="text-sm" style={{marginTop:'2px'}}>Upload any supplementary business documents</p>
          </div>
          <label className="btn btn-secondary btn-sm" style={{borderRadius:'var(--radius-sm)', cursor:'pointer'}}>
            + Choose Files
            <input type="file" multiple hidden accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" onChange={handleExtraUpload} />
          </label>
        </div>

        <div className="drop-area" style={{ border:'2px dashed #b8cfdf', borderRadius:'var(--radius-md)', padding:'28px 20px', textAlign:'center', cursor:'pointer', background:'var(--card)' }} onClick={() => extraFileRef.current?.click()}>
          <div className="da-icon"><span className="material-symbols-outlined" style={{color: '#ffca28', fontSize: '32px'}}>folder</span></div>
          <div className="da-title" style={{fontWeight: 600, color: 'var(--navy)', fontSize: '14px'}}>Drag & drop files here</div>
          <div className="da-hint" style={{fontSize: '12px', color: 'var(--muted)'}}>or click to browse · PDF, JPG, PNG, WEBP, DOC, EXCEL · Max 10MB</div>
        </div>
        <input type="file" multiple hidden ref={extraFileRef} onChange={handleExtraUpload} />

        <div className="upload-track mt-12">
          {docs.filter(d => d.doc_type === "other").map(doc => (
            <div key={doc.id} className="upload-track-item" style={{display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', borderRadius:'var(--radius-sm)', background:'#f5f8fb', fontSize:'13px', marginBottom:'6px'}}>
              <span className="material-symbols-outlined" style={{color:'var(--green)', fontSize:'18px'}}>check_circle</span>
              <div className="uti-name" style={{flex:1}}>{doc.filename}</div>
              <button className="btn btn-secondary btn-sm" style={{padding:'4px'}} onClick={() => viewDoc(doc.storage_key)}>
                <span className="material-symbols-outlined" style={{fontSize:'16px'}}>visibility</span>
              </button>
              <button className="btn btn-danger btn-sm" style={{padding:'4px'}} onClick={() => deleteDoc(doc.id)}>
                <span className="material-symbols-outlined" style={{fontSize:'16px'}}>delete</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card mt-20" style={{marginTop: '20px'}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'16px'}}>
          <div>
            <h3 style={{marginBottom:'4px'}}>Finished Uploading?</h3>
            <p className="text-sm" style={{margin:0}}>Notify your accountant that your business documents are ready for review.</p>
          </div>
          <button className="btn btn-primary" onClick={notifyComplete}>
            <span className="material-symbols-outlined">send</span>
            Notify Admin: Uploads Complete
          </button>
        </div>
      </div>
    </div>
  );
}