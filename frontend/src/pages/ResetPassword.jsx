import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid or expired reset token. Please request a new link.');
    }
  }, [token]);

  const handleReset = async (e) => {
    e.preventDefault();
    if (!password || !token) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password })
      });
      const data = await res.json();

      if (!res.ok) {
        let errorMsg = 'Password reset failed';
        if (data.detail) {
          if (typeof data.detail === 'string') {
            errorMsg = data.detail;
          } else if (Array.isArray(data.detail)) {
            errorMsg = data.detail.map((err) => err.msg).join(', ');
          } else {
            errorMsg = JSON.stringify(data.detail);
          }
        }
        throw new Error(errorMsg);
      }

      setMessage('Password successfully updated! Redirecting to sign in...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell page-enter">
      {/* Brand Side */}
      <div className="auth-brand">

        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img
            src="/images/brand-logo-mark.webp"
            alt="ABC CPA & Advisory"
            style={{
              width: '58px',
              height: '58px',
              borderRadius: '14px',
              marginBottom: '16px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.14)'
            }}
            width="58"
            height="58"
          />
          <h2 style={{ fontFamily: "var(--font-display, 'Playfair Display', serif)", fontSize: '24px', fontWeight: 600, color: '#FFFFFF', margin: 0 }}>
            ABC CPA &amp; Advisory
          </h2>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#60A5FA', marginTop: '6px' }}>
            Tax Advisory &amp; Accounting Services
          </div>
        </div>

        <div className="brand-divider"></div>

        <p>
          Choose a robust password to ensure the continued security of your financial and tax documents.
        </p>
      </div>

      {/* Form Side */}
      <div className="auth-form-side">
        <div className="auth-box">
          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '1.5rem',
              fontSize: '13px',
              fontWeight: 600,
              color: '#1D4ED8',
              textDecoration: 'none'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
            Back to Sign In
          </Link>

          <h1>Create New Password</h1>
          <p className="auth-subtitle">Enter your new credentials below</p>

          {error && (
            <div style={{ color: 'var(--error, #DC2626)', marginBottom: '1rem', fontSize: '14px', background: 'rgba(220, 38, 38, 0.08)', padding: '10px 14px', borderRadius: '8px' }}>
              {error}
            </div>
          )}
          {message && (
            <div style={{ padding: '12px 16px', background: '#ECFDF5', color: '#047857', border: '1px solid rgba(4, 120, 87, 0.2)', borderRadius: '10px', marginBottom: '20px', fontSize: '13.5px' }}>
              {message}
            </div>
          )}

          <form onSubmit={handleReset}>
            <div className="form-group" style={{ marginBottom: '22px' }}>
              <label className="form-label" htmlFor="password" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#0A2540', marginBottom: '6px' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="artha-form-input"
                  style={{ paddingRight: '60px', marginBottom: 0 }}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#425466',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="artha-pill-btn artha-pill-primary"
              style={{ width: '100%', padding: '12px 20px', fontSize: '14.5px' }}
              disabled={loading || !token}
            >
              {loading ? 'Resetting...' : 'Save New Password'}
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>lock_reset</span>
            </button>
          </form>

          <div className="auth-links">
            <Link to="/login" style={{ color: '#1D4ED8', fontWeight: 600, textDecoration: 'underline' }}>
              Return to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
