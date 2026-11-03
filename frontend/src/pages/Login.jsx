import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 403 && errData.detail === 'EMAIL_NOT_VERIFIED') {
          setError('EMAIL_NOT_VERIFIED');
          return;
        }
        let errorMsg = 'Invalid credentials';
        if (errData.detail) {
          if (typeof errData.detail === 'string') {
            errorMsg = errData.detail;
          } else if (Array.isArray(errData.detail)) {
            errorMsg = errData.detail.map((err) => err.msg).join(', ');
          } else {
            errorMsg = JSON.stringify(errData.detail);
          }
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      login(data.access_token);

      // Navigate to correct dashboard based on role
      if (data.role === 'admin' || data.role === 'super_admin') {
        navigate('/admin-dashboard');
      } else {
        navigate('/dashboard');
      }
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
          Secure client access for document uploads, real-time P&amp;L review, and tax filings.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'rgba(255,255,255,0.72)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#10B981' }}>lock</span>
            256-Bit SSL Encrypted Vault
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'rgba(255,255,255,0.72)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#10B981' }}>verified</span>
            AICPA Member Firm Standards
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="auth-form-side">
        <div className="auth-box">
          <Link
            to="/"
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
            Back to Home
          </Link>

          <h1>Client Sign In</h1>
          <p className="auth-subtitle">Enter your portal credentials to continue</p>

          {error && (
            <div style={{ color: 'var(--error, #DC2626)', marginBottom: '1rem', fontSize: '14px', background: 'rgba(220, 38, 38, 0.08)', padding: '10px 14px', borderRadius: '8px' }}>
              {error === 'EMAIL_NOT_VERIFIED' ? (
                <>
                  Your email is not verified. Please check your inbox or{' '}
                  <Link to="/resend-verification" style={{ color: '#1D4ED8', textDecoration: 'underline' }}>
                    resend the verification link
                  </Link>.
                </>
              ) : (
                error
              )}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" htmlFor="email" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#0A2540', marginBottom: '6px' }}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="artha-form-input"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" htmlFor="password" style={{ fontSize: '12.5px', fontWeight: 600, color: '#0A2540', margin: 0 }}>
                  Password
                </label>
                <Link to="/forgot-password" style={{ fontSize: '12px', color: '#1D4ED8', textDecoration: 'none' }}>
                  Forgot password?
                </Link>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="artha-form-input"
                  style={{ paddingRight: '60px', marginBottom: 0 }}
                  placeholder="Your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In to Portal'}
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>login</span>
            </button>
          </form>

          <div className="auth-links">
            Don&apos;t have an account?{' '}
            <Link to="/signup" style={{ color: '#1D4ED8', fontWeight: 600, textDecoration: 'underline' }}>
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}