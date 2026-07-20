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

        if (res.ok && (data.message === "verified" || data.message === "already_verified")) {
          setStatus('success');
          setMessage(data.message === "already_verified" ? "Already Verified" : "Email Verified!");
        } else {
          setStatus('failed');
          setMessage(data.detail || "This link is invalid or has expired.");
        }
      } catch (err) {
        setStatus('failed');
        setMessage("Could not connect to the server. Please try again later.");
      }
    };

    verify();
  }, [token]);

  return (
    <div className="auth-shell page-enter">
      <div className="auth-brand">
        <img className="brand-logo" src="/images/bookkeeppro-logo.webp" alt="BookKeepPro"/>
        <div className="brand-divider"></div>
        <h2>Almost There</h2>
        <p>We're verifying your email address right now.</p>
      </div>

      <div className="auth-form-side">
        <div className="auth-box text-center">
          
          {status === 'verifying' && (
            <>
              <div style={{fontSize:'48px', marginBottom:'16px'}}>
                <span className="material-symbols-outlined">pending</span>
              </div>
              <h2>Verifying your email...</h2>
              <p className="auth-subtitle">Please wait a moment.</p>
            </>
          )}

          {status === 'invalid' && (
            <>
              <div style={{fontSize:'48px', marginBottom:'16px'}}>
                <span className="material-symbols-outlined">cancel</span>
              </div>
              <h2>Invalid Link</h2>
              <p className="auth-subtitle">This verification link is missing a token.<br/>Please use the link from your email.</p>
              <Link to="/login" className="btn btn-primary" style={{borderRadius:'var(--radius-sm)', marginTop:'24px', display:'inline-flex'}}>
                Go to Sign In
              </Link>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={{fontSize:'48px', marginBottom:'16px', color:'var(--green)'}}>
                <span className="material-symbols-outlined">check_circle</span>
              </div>
              <h2>{message}</h2>
              <p className="auth-subtitle">
                {message === "Already Verified"
                  ? "Your email is already verified. You can sign in below."
                  : "Your email has been verified. You can now sign in to your account."}
              </p>
              <Link to="/login" className="btn btn-primary" style={{borderRadius:'var(--radius-sm)', marginTop:'24px', display:'inline-flex'}}>
                Sign In
              </Link>
            </>
          )}

          {status === 'failed' && (
            <>
              <div style={{fontSize:'48px', marginBottom:'16px', color:'var(--error)'}}>
                <span className="material-symbols-outlined">cancel</span>
              </div>
              <h2>Verification Failed</h2>
              <p className="auth-subtitle">{message}</p>
              <Link to="/resend-verification" className="btn btn-primary" style={{borderRadius:'var(--radius-sm)', marginTop:'24px', display:'inline-flex'}}>
                Request New Link
              </Link>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
