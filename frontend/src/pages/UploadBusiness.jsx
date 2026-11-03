import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

export default function UploadBusiness() {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false, title: "", message: "", confirmText: "OK", isDestructive: false, onConfirm: () => {}
  });
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [docs, setDocs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRefs = useRef({});
  const extraFileRef = useRef(null);

  const fetchTemplatesAndDocs = useCallback(async () => {
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
  }, [authFetch, taxYear]);

  useEffect(() => {
    fetchTemplatesAndDocs();
  }, [taxYear, fetchTemplatesAndDocs]);

  const uploadFile = async (file, docType, skipFetch = false) => {
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
        if (!skipFetch) fetchTemplatesAndDocs();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.detail || "Upload failed", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Upload failed due to network error", "error");
    }
  };

  const deleteDoc = async (id) => {
    setConfirmConfig({
      isOpen: true,
      title: "Delete Document",
      message: "Are you sure you want to delete this business document?\nThis action cannot be undone.",
      isDestructive: true,
      confirmText: "Delete",
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await authFetch(`/api/upload/business-documents/${id}`, { method: "DELETE" });
          if (res.ok) {
            showToast("Document deleted", "success");
            fetchTemplatesAndDocs();
          } else {
            showToast("Delete failed", "error");
          }
        } catch (err) {
          console.error(err);
          showToast("Delete failed", "error");
        }
      }
    });
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

  const handleExtraUpload = async (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];
    for (let file of files) {
      if (file.size > 10 * 1024 * 1024) {
        showToast(`File ${file.name} exceeds 10MB limit`, "error");
        continue;
      }
      validFiles.push(file);
    }
    
    if (validFiles.length > 0) {
      await Promise.all(validFiles.map((file, idx) => 
        uploadFile(file, `other_${Date.now()}_${idx}`, true)
      ));
      fetchTemplatesAndDocs();
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
        showToast("Business ledgers & statements transmitted to CPA squad", "success");
      } else {
        showToast("Failed to transmit for approval", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error sending for approval", "error");
    }
  };

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <div>
      <ConfirmModal 
        {...confirmConfig} 
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} 
      />

      {/* Top Breadcrumb & Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <Link
          to="/dashboard"
          className="artha-pill-btn artha-pill-outline"
          style={{ padding: '6px 14px', fontSize: '12.5px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
          Return to Dashboard
        </Link>

        {/* Tax Year Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0A2540' }}>Tax Filing Year:</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {years.map(y => (
              <button
                key={y}
                type="button"
                className={`artha-pill-btn ${taxYear === y ? 'artha-pill-primary' : 'artha-pill-outline'}`}
                style={{ padding: '6px 14px', fontSize: '12px' }}
                onClick={() => setTaxYear(y)}
              >
                TY {y}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="artha-portal-hero" style={{ padding: '24px 30px' }}>
        <div className="artha-portal-hero-left">
          <div className="artha-eyebrow-pill" style={{ marginBottom: '8px' }}>
            <span className="dot"></span>
            CORPORATE &amp; STATUTORY LEDGERS
          </div>
          <h1 style={{ fontSize: '26px' }}>Business Documents &amp; Statement Ingestion</h1>
          <p style={{ fontSize: '14px' }}>
            Upload raw bank statements, Form 1120-S / 1065 schedules, payroll summaries, and asset ledgers for Tax Year {taxYear}.
          </p>
        </div>

        <div className="artha-portal-hero-badges">
          <div className="artha-portal-badge green">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>smart_toy</span>
            <span>AI Statement to P&amp;L Enabled</span>
          </div>
          <div className="artha-portal-badge gold">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>verified</span>
            <span>{docs.length} File{docs.length === 1 ? '' : 's'} on Record</span>
          </div>
        </div>
      </div>

      {/* Required Documents Section */}
      <div className="artha-portal-card">
        <div className="artha-portal-card-header">
          <div>
            <h3 className="artha-portal-card-title">
              <span className="material-symbols-outlined" style={{ color: '#1D4ED8' }}>account_balance</span>
              Required Business Schedules &amp; Ledgers
            </h3>
            <p style={{ fontSize: '13.5px', color: '#425466', margin: '4px 0 0' }}>
              Standard corporate returns and verification documentation for Form 1120, 1120-S, and 1065 partnerships.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#425466' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '28px', animation: 'spin 1s infinite' }}>sync</span>
              <p style={{ marginTop: '8px', fontSize: '13.5px' }}>Loading business requirements for TY {taxYear}...</p>
            </div>
          ) : templates.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#425466', background: '#F6F9FC', borderRadius: '14px' }}>
              No statutory templates assigned for this business tax year yet. You can upload custom ledgers in the section below.
            </div>
          ) : templates.map((dt, i) => {
            const uploaded = docs.filter(d => d.doc_type === dt.name);
            const latestDoc = uploaded[0] || null;
            const isRejected = latestDoc?.review_status === 'rejected';
            const isApproved = latestDoc?.review_status === 'approved';
            const isFiled = latestDoc?.review_status === 'filed';

            return (
              <div
                key={i}
                style={{
                  background: isRejected ? '#FFF9F9' : '#FFFFFF',
                  border: isRejected ? '1px solid rgba(220,38,38,0.3)' : '1px solid rgba(10,37,64,0.08)',
                  borderLeft: isRejected ? '4px solid #DC2626' : isApproved || isFiled ? '4px solid #047857' : '4px solid rgba(10,37,64,0.15)',
                  borderRadius: '14px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                  transition: 'all 0.2s ease'
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    if (!uploaded.length || isRejected) {
                      uploadFile(e.dataTransfer.files[0], dt.name);
                    } else {
                      showToast("Document already uploaded for this type and year.", "error");
                    }
                  }
                }}
              >
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14.5px', fontWeight: 600, color: '#0A2540' }}>
                      {i + 1}. {dt.name}
                    </span>
                  </div>

                  <div style={{ marginTop: '6px' }}>
                    {isRejected ? (
                      <div>
                        <span className="artha-status-pill artha-status-rejected">
                          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>cancel</span>
                          Rejected by CPA
                        </span>
                        {latestDoc.review_note && (
                          <div style={{ fontSize: '12px', color: '#DC2626', marginTop: '4px', fontStyle: 'italic' }}>
                            Reason: &ldquo;{latestDoc.review_note}&rdquo;
                          </div>
                        )}
                      </div>
                    ) : isApproved ? (
                      <span className="artha-status-pill artha-status-approved">
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>check_circle</span>
                        Verified &amp; Approved
                      </span>
                    ) : isFiled ? (
                      <span className="artha-status-pill artha-status-approved">
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>inventory_2</span>
                        Filed with IRS
                      </span>
                    ) : uploaded.length ? (
                      <span className="artha-status-pill artha-status-pending">
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>hourglass_top</span>
                        Under CPA Review
                      </span>
                    ) : dt.download ? (
                      <a
                        href={dt.download}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '12.5px', color: '#1D4ED8', textDecoration: 'underline', fontWeight: 500 }}
                      >
                        Download Blank Template &rarr;
                      </a>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#425466' }}>Pending business upload</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.zip"
                    ref={el => fileInputRefs.current[dt.name] = el}
                    onChange={(e) => {
                      if (e.target.files[0]) {
                        uploadFile(e.target.files[0], dt.name);
                        e.target.value = null;
                      }
                    }}
                  />

                  {dt.download && (
                    <a
                      href={dt.download}
                      target="_blank"
                      rel="noreferrer"
                      className="artha-pill-btn artha-pill-outline"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>download</span>
                      Template
                    </a>
                  )}

                  {(!uploaded.length || isRejected) && (
                    <button
                      className="artha-pill-btn artha-pill-primary"
                      style={{ padding: '6px 14px', fontSize: '12px' }}
                      onClick={() => fileInputRefs.current[dt.name].click()}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>upload</span>
                      {isRejected ? 'Re-upload Schedule' : 'Upload Schedule'}
                    </button>
                  )}

                  {uploaded.map(doc => (
                    <div key={doc.id} style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="artha-pill-btn artha-pill-outline"
                        style={{ padding: '5px 10px', fontSize: '11.5px' }}
                        onClick={() => viewDoc(doc.storage_key)}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>visibility</span>
                        View
                      </button>
                      {!isApproved && !isFiled && (
                        <button
                          className="artha-pill-btn artha-pill-outline"
                          style={{ padding: '5px 10px', fontSize: '11.5px', color: '#DC2626', borderColor: 'rgba(220,38,38,0.3)' }}
                          onClick={() => deleteDoc(doc.id)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Additional Business Documents & Bank Statements Dropzone */}
      <div className="artha-portal-card">
        <div className="artha-portal-card-header">
          <div>
            <h3 className="artha-portal-card-title">
              <span className="material-symbols-outlined" style={{ color: '#1D4ED8' }}>receipt_long</span>
              Bank Statements, Ledgers &amp; Receipts Vault
            </h3>
            <p style={{ fontSize: '13.5px', color: '#425466', margin: '4px 0 0' }}>
              Upload raw PDF checking statements, credit card logs, or payroll reports for automated reconciliation.
            </p>
          </div>

          <label
            className="artha-pill-btn artha-pill-primary"
            style={{ padding: '7px 16px', fontSize: '12.5px', cursor: 'pointer' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
            Browse &amp; Add Ledgers
            <input
              type="file"
              multiple
              hidden
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.zip"
              onChange={handleExtraUpload}
            />
          </label>
        </div>

        {/* Drag Area */}
        <div
          className={`artha-dropzone ${isDragOver ? 'is-dragover' : ''}`}
          onClick={() => extraFileRef.current?.click()}
          onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              const fakeEvent = { target: { files: e.dataTransfer.files } };
              handleExtraUpload(fakeEvent);
            }
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'rgba(29, 78, 216, 0.08)',
              color: '#1D4ED8',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>cloud_upload</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#0A2540', marginBottom: '4px' }}>
            Drag and drop business ledgers &amp; bank statements here
          </div>
          <div style={{ fontSize: '12.5px', color: '#425466' }}>
            PDF, Excel (XLS/XLSX), CSV, PNG, JPG, ZIP &bull; Max 10MB per file
          </div>
        </div>
        <input type="file" multiple hidden ref={extraFileRef} onChange={handleExtraUpload} />

        {/* Uploaded Extra Documents Tracker */}
        {docs.filter(d => d.doc_type.startsWith("other")).length > 0 && (
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h5 style={{ fontSize: '12.5px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#425466', margin: '0 0 6px' }}>
              Uploaded Supplementary Ledgers ({docs.filter(d => d.doc_type.startsWith("other")).length}):
            </h5>
            {docs.filter(d => d.doc_type.startsWith("other")).map(doc => (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  background: '#F6F9FC',
                  border: '1px solid rgba(10, 37, 64, 0.07)',
                  fontSize: '13px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  <span className="material-symbols-outlined" style={{ color: '#047857', fontSize: '18px' }}>check_circle</span>
                  <span style={{ fontWeight: 500, color: '#0A2540', wordBreak: 'break-all' }}>{doc.filename}</span>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="artha-pill-btn artha-pill-outline"
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                    onClick={() => viewDoc(doc.storage_key)}
                  >
                    View
                  </button>
                  <button
                    className="artha-pill-btn artha-pill-outline"
                    style={{ padding: '4px 10px', fontSize: '11px', color: '#DC2626', borderColor: 'rgba(220,38,38,0.25)' }}
                    onClick={() => deleteDoc(doc.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completion & Submit Banner */}
      <div
        className="artha-portal-card"
        style={{
          background: '#0A2540',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '18px'
        }}
      >
        <div>
          <h3 style={{ fontSize: '18px', color: '#FFFFFF', margin: '0 0 4px', fontFamily: 'var(--font-display)' }}>
            Finished Uploading Business Records?
          </h3>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
            Notify your advisory team that all corporate schedules and bank statements have been uploaded for TY {taxYear}.
          </p>
        </div>

        <button
          className="artha-pill-btn artha-pill-primary"
          style={{ background: '#1D4ED8', borderColor: '#1D4ED8', padding: '10px 22px' }}
          onClick={notifyComplete}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
          Transmit for CPA Processing
        </button>
      </div>
    </div>
  );
}
