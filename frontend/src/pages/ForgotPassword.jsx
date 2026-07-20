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
      await fetch("/api/auth/forgot-password", {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      setMessage("If that email exists, a reset link has been sent.");
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
        <h2>Reset Your Password</h2>
        <p>We'll send a secure link to your registered email address.</p>
      </div>

      <div className="auth-form-side">
        <div className="auth-box">
          <div style={{fontSize:'40px', marginBottom:'12px'}}>🔑</div>
          <h1>Forgot Password?</h1>
          <p className="auth-subtitle">Enter your email and we'll send a reset link</p>

          {message && <div style={{padding: '10px', background: 'var(--blue-light)', color: 'var(--blue)', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '14px'}}>{message}</div>}

          <form onSubmit={handleReset}>
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
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <div className="auth-links"><Link to="/login" className="fancy-link">← Back to Sign In</Link></div>
        </div>
      </div>
    </div>
  );
}
