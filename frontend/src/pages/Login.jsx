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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        throw new Error("Invalid credentials");
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
      <div className="auth-brand">
        <img className="brand-logo" src="/images/bookkeeppro-logo.webp" alt="BookKeepPro" />
        <div className="brand-divider"></div>
        <h2>Welcome Back</h2>
        <p>Secure access to your bookkeeping portal. Upload documents, track filings, and stay organised.</p>
      </div>

      <div className="auth-form-side">
        <div className="auth-box">
          <Link to="/" className="fancy-link" style={{display: 'inline-block', marginBottom: '1.5rem', fontSize: '0.95rem', fontWeight: '500'}}>
            &larr; Back to Home
          </Link>
          <h1>Sign In</h1>
          <p className="auth-subtitle">Enter your credentials to continue</p>

          {error && <div style={{color: 'var(--error)', marginBottom: '1rem', fontSize: '14px'}}>{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input 
                id="email" 
                type="email" 
                className="input" 
                placeholder="you@example.com" 
                required 
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="password-wrap">
                <input 
                  id="password" 
                  type={showPassword ? 'text' : 'password'} 
                  className="input" 
                  placeholder="Your password" 
                  required 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button 
                  type="button" 
                  className="password-toggle" 
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-full" 
              style={{borderRadius: 'var(--radius-sm)', marginTop: '4px'}}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-links">
            <Link to="/forgot-password" className="fancy-link">Forgot password?</Link><br/>
            Don't have an account? <Link to="/signup" className="fancy-link">Sign Up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}