import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleReset = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      setMessage('If that email exists in our records, a secure reset link has been dispatched.');
      setEmail('');
    } catch (err) {
      console.error(err);
      setMessage('Network error. Please try again.');
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
          Need portal access? We&apos;ll send an encrypted reset link directly to your verified email address.
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

          <h1>Reset Password</h1>
          <p className="auth-subtitle">Enter your email and we&apos;ll send an authorized reset link</p>

          {message && (
            <div style={{ padding: '12px 16px', background: '#ECFDF5', color: '#047857', border: '1px solid rgba(4, 120, 87, 0.2)', borderRadius: '10px', marginBottom: '20px', fontSize: '13.5px' }}>
              {message}
            </div>
          )}

          <form onSubmit={handleReset}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" htmlFor="email" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#0A2540', marginBottom: '6px' }}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="artha-form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="artha-pill-btn artha-pill-primary"
              style={{ width: '100%', padding: '12px 20px', fontSize: '14.5px' }}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Password Reset Link'}
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
            </button>
          </form>

          <div className="auth-links">
            Remembered your credentials?{' '}
            <Link to="/login" style={{ color: '#1D4ED8', fontWeight: 600, textDecoration: 'underline' }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
