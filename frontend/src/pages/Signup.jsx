import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Signup() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Signup failed");
      }

      // Success, route to login with message
      navigate('/login', { state: { message: "Account created successfully. Please log in." }});
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
        <h2>Join BookKeepPro</h2>
        <p>Create your account to securely upload documents, track reviews, and stay on top of your filings.</p>
      </div>

      <div className="auth-form-side">
        <div className="auth-box">
          <Link to="/" className="fancy-link" style={{display: 'inline-block', marginBottom: '1.5rem', fontSize: '0.95rem', fontWeight: '500'}}>
            &larr; Back to Home
          </Link>
          <h1>Create Account</h1>
          <p className="auth-subtitle">It only takes a minute</p>

          {error && <div style={{color: 'var(--error)', marginBottom: '1rem', fontSize: '14px'}}>{error}</div>}

          <form onSubmit={handleSignup} autoComplete="off">
            <div className="form-group">
              <label className="form-label" htmlFor="name">Full Name</label>
              <input 
                id="name" 
                type="text" 
                className="input" 
                placeholder="Jane Smith" 
                required 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input 
                id="email" 
                type="email" 
                className="input" 
                placeholder="you@example.com" 
                required 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="phone">Phone Number <span style={{color:'var(--muted)', fontWeight:400}}>(optional)</span></label>
              <input 
                id="phone" 
                type="tel" 
                className="input" 
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="password-wrap">
                <input 
                  id="password" 
                  type={showPassword ? 'text' : 'password'} 
                  className="input" 
                  placeholder="At least 8 characters" 
                  required 
                  style={{paddingRight:'56px'}}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
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
              style={{borderRadius: 'var(--radius-sm)'}}
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
            <div className="auth-links">
              Already have an account? <Link to="/login" className="fancy-link">Sign In</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}