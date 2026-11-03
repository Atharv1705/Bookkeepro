import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

export default function Profile() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [pwData, setPwData] = useState({ currentPw: '', newPw: '', confirmPw: '' });
  const [showPwSection, setShowPwSection] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name || '', phone: user.phone || '' });
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = { ...formData };
      if (showPwSection && pwData.newPw) {
        if (pwData.newPw !== pwData.confirmPw) {
          showToast("New passwords do not match", "error");
          setLoading(false);
          return;
        }
        payload.current_password = pwData.currentPw;
        payload.new_password = pwData.newPw;
      }

      const res = await authFetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        let errorMsg = "Failed to update profile";
        if (data.detail) {
          if (typeof data.detail === 'string') {
            errorMsg = data.detail;
          } else if (Array.isArray(data.detail)) {
            errorMsg = data.detail.map(err => err.msg).join(", ");
          } else {
            errorMsg = JSON.stringify(data.detail);
          }
        }
        throw new Error(errorMsg);
      }

      showToast("Profile updated successfully. Please log in again if you changed your password.", "success");
      if (payload.new_password) {
        window.location.href = '/login';
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      {/* Back Button */}
      <div style={{ marginBottom: '20px' }}>
        <button
          className="artha-pill-btn artha-pill-outline"
          style={{ padding: '6px 14px', fontSize: '12.5px' }}
          onClick={() => navigate(isAdmin ? '/admin-dashboard' : '/dashboard')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
          Return to {isAdmin ? 'Admin Portal' : 'Client Overview'}
        </button>
      </div>

      {/* Hero Card */}
      <div className="artha-portal-hero" style={{ padding: '24px 28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1D4ED8 0%, #14B8A6 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              fontWeight: 700,
              flexShrink: 0
            }}
          >
            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="artha-eyebrow-pill" style={{ marginBottom: '4px' }}>
              <span className="dot"></span>
              ACCOUNT SETTINGS
            </div>
            <h1 style={{ fontSize: '24px', margin: '2px 0 0' }}>{user?.name || 'Account Profile'}</h1>
            <p style={{ fontSize: '13px', margin: '2px 0 0', color: '#425466' }}>{user?.email}</p>
          </div>
        </div>

        <span className={`artha-status-pill ${isAdmin ? 'artha-status-rejected' : 'artha-status-approved'}`}>
          {user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'admin' ? 'Staff CPA' : 'Verified Client'}
        </span>
      </div>

      {/* Account Info Form Card */}
      <div className="artha-portal-card">
        <div className="artha-portal-card-header">
          <h3 className="artha-portal-card-title">
            <span className="material-symbols-outlined" style={{ color: '#1D4ED8' }}>badge</span>
            Contact &amp; Identity Information
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#0A2540', marginBottom: '6px' }}>
              Email Address <span style={{ color: '#425466', fontWeight: 400 }}>(Permanent identifier)</span>
            </label>
            <input
              type="email"
              readOnly
              value={user?.email || ''}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '12px',
                border: '1px solid rgba(10, 37, 64,0.1)',
                background: '#F6F9FC',
                color: '#425466',
                fontSize: '13.5px',
                outline: 'none',
                cursor: 'not-allowed'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#0A2540', marginBottom: '6px' }}>
                Full Legal Name
              </label>
              <input
                type="text"
                placeholder="First and Last Name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="artha-form-input"
                style={{ width: '100%', padding: '11px 14px', fontSize: '13.5px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#0A2540', marginBottom: '6px' }}>
                Primary Phone Number
              </label>
              <input
                type="tel"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="artha-form-input"
                style={{ width: '100%', padding: '11px 14px', fontSize: '13.5px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Security & Password Accordion */}
      <div className="artha-portal-card">
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          onClick={() => setShowPwSection(!showPwSection)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined" style={{ color: '#1D4ED8' }}>password</span>
            <div>
              <h4 style={{ fontSize: '16px', color: '#0A2540', margin: 0, fontWeight: 600 }}>Security &amp; Password</h4>
              <p style={{ fontSize: '12.5px', color: '#425466', margin: '2px 0 0' }}>
                Update your account password or review login credentials
              </p>
            </div>
          </div>
          <span className="material-symbols-outlined" style={{ color: '#425466', transition: 'transform 0.2s', transform: showPwSection ? 'rotate(180deg)' : 'none' }}>
            expand_more
          </span>
        </div>

        {showPwSection && (
          <div style={{ marginTop: '18px', paddingTop: '18px', borderTop: '1px solid rgba(10, 37, 64,0.08)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0A2540', marginBottom: '4px' }}>
                Current Password
              </label>
              <input
                type="password"
                placeholder="Enter current password"
                value={pwData.currentPw}
                onChange={e => setPwData({ ...pwData, currentPw: e.target.value })}
                className="artha-form-input"
                style={{ width: '100%', padding: '10px 14px', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0A2540', marginBottom: '4px' }}>
                New Password (minimum 8 characters)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPw ? 'text' : 'password'}
                  placeholder="New secure password"
                  value={pwData.newPw}
                  onChange={e => setPwData({ ...pwData, newPw: e.target.value })}
                  className="artha-form-input"
                  style={{ width: '100%', padding: '10px 50px 10px 14px', fontSize: '13px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#425466', fontSize: '12px', cursor: 'pointer' }}
                >
                  {showNewPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0A2540', marginBottom: '4px' }}>
                Confirm New Password
              </label>
              <input
                type="password"
                placeholder="Repeat new password"
                value={pwData.confirmPw}
                onChange={e => setPwData({ ...pwData, confirmPw: e.target.value })}
                className="artha-form-input"
                style={{ width: '100%', padding: '10px 14px', fontSize: '13px' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <button
        className="artha-pill-btn artha-pill-primary"
        style={{ width: '100%', padding: '12px 24px', fontSize: '14px', justifyContent: 'center' }}
        onClick={handleSave}
        disabled={loading}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
        {loading ? 'Saving Profile...' : 'Save Profile Changes'}
      </button>
    </div>
  );
}