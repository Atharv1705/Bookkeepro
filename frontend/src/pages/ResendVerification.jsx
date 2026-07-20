import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ResendVerification() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      setMessage("If that email is registered and unverified, a new link has been sent. Check your inbox.");
      setEmail("");
    } catch (err) {
      console.error(err);
      setMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell page-enter">
      <div className="auth-brand">
        <img className="brand-logo" src="/images/bookkeeppro-logo.webp" alt="BookKeepPro"/>
        <div className="brand-divider"></div>
        <h2>Verify Your Email</h2>
        <p>Check your inbox for the verification link. It expires in 24 hours.</p>
      </div>

      <div className="auth-form-side">
        <div className="auth-box">
          <div style={{fontSize:'40px', marginBottom:'12px'}}>📧</div>
          <h1>Resend Verification</h1>
          <p className="auth-subtitle">We'll send a new link to your registered email</p>

          {message && <div style={{padding: '10px', background: 'var(--blue-light)', color: 'var(--blue)', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '14px'}}>{message}</div>}

          <form onSubmit={handleResend}>
            <div className="form-group" style={{marginTop:'24px'}}>
              <label className="form-label" htmlFor="email">Email Address</label>
              <input 
                id="email" 
                type="email" 
                className="input" 
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{borderRadius:'var(--radius-sm)'}}>
              {loading ? "Sending..." : "Send Verification Link"}
            </button>
          </form>

          <div className="auth-links"><Link to="/login" className="fancy-link">Back to Sign In</Link></div>
        </div>
      </div>
    </div>
  );
}
