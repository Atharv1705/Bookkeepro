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
      setError("Invalid or missing reset link. Request a new one.");
    }
  }, [token]);

  const handleReset = async (e) => {
    e.preventDefault();
    if (!password || !token) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || "Password reset failed");
      }
      
      setMessage("Password reset! Redirecting to sign in...");
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell page-enter">
      <div className="auth-brand">
        <img className="brand-logo" src="/images/bookkeeppro-logo.webp" alt="BookKeepPro"/>
        <div className="brand-divider"></div>
        <h2>Choose a New Password</h2>
        <p>Pick something strong — at least 8 characters with a mix of letters, numbers, and symbols.</p>
      </div>

      <div className="auth-form-side">
        <div className="auth-box">
          <div style={{fontSize:'40px', marginBottom:'12px'}}>🔒</div>
          <h1>Reset Password</h1>
          <p className="auth-subtitle">Enter your new password below</p>

          {error && <div style={{color: 'var(--error)', marginBottom: '1rem', fontSize: '14px'}}>{error}</div>}
          {message && <div style={{color: 'var(--green)', marginBottom: '1rem', fontSize: '14px'}}>{message}</div>}

          <form onSubmit={handleReset}>
            <div className="form-group" style={{marginTop:'24px'}}>
              <label className="form-label" htmlFor="password">New Password</label>
              <div className="password-wrap">
                <input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  className="input" 
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={loading || !token} style={{borderRadius:'var(--radius-sm)'}}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          <div className="auth-links"><Link to="/login" className="fancy-link">Back to Sign In</Link></div>
        </div>
      </div>
    </div>
  );
}
