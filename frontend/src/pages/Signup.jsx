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
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json();
        let errorMsg = 'Signup failed';
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

      // Success, route to login with message
      navigate('/login', { state: { message: 'Account created successfully. Please log in.' } });
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
          Create your client account to upload bank statements, review corporate ledgers, and collaborate directly with our CPAs.
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

          <h1>Create Account</h1>
          <p className="auth-subtitle">It only takes a minute to set up your portal</p>

          {error && (
            <div style={{ color: 'var(--error, #DC2626)', marginBottom: '1rem', fontSize: '14px', background: 'rgba(220, 38, 38, 0.08)', padding: '10px 14px', borderRadius: '8px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} autoComplete="off">
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" htmlFor="name" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#0A2540', marginBottom: '6px' }}>
                Full Name *
              </label>
              <input
                id="name"
                type="text"
                className="artha-form-input"
                placeholder="Jane Smith"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" htmlFor="email" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#0A2540', marginBottom: '6px' }}>
                Email Address *
              </label>
              <input
                id="email"
                type="email"
                className="artha-form-input"
                placeholder="you@example.com"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" htmlFor="phone" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#0A2540', marginBottom: '6px' }}>
                Phone Number <span style={{ color: '#8C9BA5', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                id="phone"
                type="tel"
                className="artha-form-input"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '22px' }}>
              <label className="form-label" htmlFor="password" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#0A2540', marginBottom: '6px' }}>
                Password *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="artha-form-input"
                  style={{ paddingRight: '60px', marginBottom: 0 }}
                  placeholder="Create a strong password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
              {loading ? 'Creating Account...' : 'Create Client Account'}
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
            </button>
          </form>

          <div className="auth-links">
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#1D4ED8', fontWeight: 600, textDecoration: 'underline' }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}