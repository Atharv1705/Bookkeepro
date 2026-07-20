import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, authFetch } = useAuth();
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
          alert("New passwords do not match");
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
        throw new Error(data.detail || "Failed to update profile");
      }

      alert("Profile updated successfully. Please log in again if you changed your password.");
      if (payload.new_password) {
        window.location.href = '/login';
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div className="page-heading">
        <div>
          <h1>My Profile</h1>
          <p className="page-meta">Update your name, phone number, or password</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>Account Info</h3>
        <div className="form-group">
          <label className="form-label">Email Address <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(cannot be changed)</span></label>
          <input type="email" className="input" readOnly value={user?.email || ''} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" className="input" placeholder="Your full name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input type="tel" className="input" placeholder="+1 (555) 000-0000" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="flex-between" style={{ marginBottom: '4px', cursor: 'pointer' }} onClick={() => setShowPwSection(!showPwSection)}>
          <h3>Change Password</h3>
          <span style={{ color: 'var(--muted)', fontSize: '18px' }}>{showPwSection ? '▼' : '▶'}</span>
        </div>
        <p className="text-sm" style={{ marginBottom: 0 }}>Click to expand and update your password</p>

        {showPwSection && (
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input type="password" className="input" placeholder="Enter current password" value={pwData.currentPw} onChange={e => setPwData({ ...pwData, currentPw: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="password-wrap">
                <input type={showNewPw ? 'text' : 'password'} className="input" placeholder="At least 8 characters" style={{ paddingRight: '56px' }} value={pwData.newPw} onChange={e => setPwData({ ...pwData, newPw: e.target.value })} />
                <button type="button" className="password-toggle" onClick={() => setShowNewPw(!showNewPw)}>
                  {showNewPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input type="password" className="input" placeholder="Repeat new password" value={pwData.confirmPw} onChange={e => setPwData({ ...pwData, confirmPw: e.target.value })} />
            </div>
          </div>
        )}
      </div>

      <button className="btn btn-primary w-full" style={{ borderRadius: 'var(--radius-sm)' }} onClick={handleSave} disabled={loading}>
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}