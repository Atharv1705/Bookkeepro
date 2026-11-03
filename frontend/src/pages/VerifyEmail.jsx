import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('verifying'); // verifying, success, failed, invalid
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (res.ok && (data.message === 'verified' || data.message === 'already_verified')) {
          setStatus('success');
          setMessage(data.message === 'already_verified' ? 'Already Verified' : 'Email Verified!');
        } else {
          setStatus('failed');
          setMessage(data.detail || 'This link is invalid or has expired.');
        }
      } catch (err) {
        console.error(err);
        setStatus('failed');
        setMessage('Could not connect to the server. Please try again later.');
      }
    };

    verify();
  }, [token]);

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
          Verifying your secure portal identity to protect client confidentiality and tax documents.
        </p>
      </div>

      {/* Form Side */}
      <div className="auth-form-side">
        <div className="auth-box" style={{ textAlign: 'center' }}>
          {status === 'verifying' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px', color: '#047857' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>pending</span>
              </div>
              <h1>Verifying your email...</h1>
              <p className="auth-subtitle">Please wait a moment while we authorize your credentials.</p>
            </>
          )}

          {status === 'invalid' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px', color: 'var(--error, #DC2626)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>cancel</span>
              </div>
              <h1>Invalid Link</h1>
              <p className="auth-subtitle">
                This verification link is missing a token.<br />Please use the link from your registration email.
              </p>
              <Link to="/login" className="artha-pill-btn artha-pill-primary" style={{ marginTop: '20px' }}>
                Go to Sign In
              </Link>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px', color: '#047857' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>check_circle</span>
              </div>
              <h1>{message}</h1>
              <p className="auth-subtitle">
                {message === 'Already Verified'
                  ? 'Your email is already verified. You can sign in below.'
                  : 'Your email has been verified. You can now access your login portal.'}
              </p>
              <Link to="/login" className="artha-pill-btn artha-pill-primary" style={{ marginTop: '20px' }}>
                Sign In to Portal
              </Link>
            </>
          )}

          {status === 'failed' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px', color: 'var(--error, #DC2626)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>cancel</span>
              </div>
              <h1>Verification Failed</h1>
              <p className="auth-subtitle">{message}</p>
              <Link to="/resend-verification" className="artha-pill-btn artha-pill-primary" style={{ marginTop: '20px' }}>
                Request New Link
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
