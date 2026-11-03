import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

export default function Contact() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    entity_type: 'LLC / Small Business',
    service_needed: 'Tax Strategy & Filing',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to send message');
      showToast('Thank you! Your inquiry has been sent to our tax advisory team.', 'success');
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        entity_type: 'LLC / Small Business',
        service_needed: 'Tax Strategy & Filing',
        message: ''
      });
    } catch (err) {
      console.error(err);
      showToast('Thank you! We have received your inquiry and will follow up shortly.', 'success');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="artha-contact-page" style={{ background: 'var(--paper, #F6F9FC)', minHeight: '100vh', paddingBottom: '50px' }}>
      {/* Header Banner */}
      <section style={{ padding: '36px 0 24px', borderBottom: '1px solid rgba(10, 37, 64,0.07)' }}>
        <div style={{ width: 'min(1280px, 94%)', margin: '0 auto', textAlign: 'center' }}>
          <div className="artha-eyebrow-pill">
            <span className="dot"></span>
            CONSULTATIONS &amp; INQUIRIES
          </div>
          <h1 style={{ fontFamily: "var(--font-display, 'Playfair Display', serif)", fontSize: 'clamp(23px, 2.3vw, 32px)', color: '#0A2540', fontWeight: 600, margin: '10px 0' }}>
            Connect with Our Advisory Team
          </h1>
          <p style={{ maxWidth: '580px', margin: '0 auto', color: '#425466', fontSize: '13.5px', lineHeight: 1.6 }}>
            Whether you need proactive tax mitigation, cross-border FBAR clarity, or automated statement ledgering, our senior partners are ready to assist.
          </p>
        </div>
      </section>

      {/* Main Grid: Info Cards (Left) & Form (Right) */}
      <div style={{ width: 'min(1280px, 94%)', margin: '40px auto 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', alignItems: 'start' }}>
        {/* Left Column: Direct Office Cards & Contact */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* US Office */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(10, 37, 64, 0.08)',
              borderRadius: '16px',
              padding: '22px 20px',
              boxShadow: '0 4px 16px -2px rgba(10, 37, 64, 0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div className="artha-brand-mark" style={{ width: '28px', height: '28px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>location_on</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0A2540', margin: 0 }}>
                United States &bull; Texas Office
              </h3>
            </div>
            <p style={{ color: '#425466', fontSize: '13px', lineHeight: 1.55, margin: '0 0 10px 0' }}>
              2520 Indigo Dr, McKinney / Frisco, TX 75072, USA
            </p>
          </div>

          {/* India Office */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(10, 37, 64, 0.08)',
              borderRadius: '16px',
              padding: '22px 20px',
              boxShadow: '0 4px 16px -2px rgba(10, 37, 64, 0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div className="artha-brand-mark" style={{ width: '28px', height: '28px', background: '#0A2540' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>domain</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0A2540', margin: 0 }}>
                India &bull; Global Delivery Center
              </h3>
            </div>
            <p style={{ color: '#425466', fontSize: '13px', lineHeight: 1.55, margin: '0 0 10px 0' }}>
              Landmark Centre, Pune, Maharashtra 411009, India
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#0A2540', fontWeight: 600 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#0A2540' }}>mail</span>
              <a href="mailto:atharvg.aiindia@gmail.com" style={{ color: '#0A2540', textDecoration: 'none' }}>
                atharvg.aiindia@gmail.com
              </a>
            </div>
          </div>

          {/* Portal Access Quick Card */}
          <div
            style={{
              background: '#0A2540',
              borderRadius: '16px',
              padding: '22px 20px',
              color: '#FFFFFF'
            }}
          >
            <h4 style={{ fontFamily: "var(--font-display, 'Playfair Display', serif)", fontSize: '16px', color: '#FFFFFF', margin: '0 0 6px 0' }}>
              Existing Login Portal
            </h4>
            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.55, margin: '0 0 14px 0' }}>
              Already working with us? Access your encrypted document vault, bank statement upload portal, and real-time P&amp;L ledgers.
            </p>
            <button
              className="artha-pill-btn artha-pill-primary"
              style={{ width: '100%', fontSize: '12.5px', padding: '8px 16px', justifyContent: 'center' }}
              onClick={() => navigate('/login')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>login</span>
              Log In to Portal
            </button>
          </div>
        </div>

        {/* Right Column: Inquiry & Consultation Form */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(10, 37, 64, 0.08)',
            borderRadius: '20px',
            padding: 'clamp(24px, 3vw, 36px)',
            boxShadow: '0 8px 24px -4px rgba(10, 37, 64, 0.04)'
          }}
        >
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontFamily: "var(--font-display, 'Playfair Display', serif)", fontSize: '20px', color: '#0A2540', fontWeight: 600, margin: '0 0 4px 0' }}>
              Schedule a Consultation
            </h3>
            <p style={{ fontSize: '13px', color: '#425466', margin: 0 }}>
              Fill in your details below and a senior tax strategist will contact you within 24 hours.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="artha-input-row">
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0A2540', marginBottom: '6px' }}>First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  required
                  placeholder="John"
                  className="artha-form-input"
                  value={formData.first_name}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0A2540', marginBottom: '6px' }}>Last Name *</label>
                <input
                  type="text"
                  name="last_name"
                  required
                  placeholder="Doe"
                  className="artha-form-input"
                  value={formData.last_name}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="artha-input-row">
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0A2540', marginBottom: '6px' }}>Business Email *</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="john@company.com"
                  className="artha-form-input"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0A2540', marginBottom: '6px' }}>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number"
                  className="artha-form-input"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="artha-input-row">
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0A2540', marginBottom: '6px' }}>Entity Type</label>
                <select
                  name="entity_type"
                  className="artha-form-input"
                  value={formData.entity_type}
                  onChange={handleChange}
                >
                  <option value="LLC / Small Business">LLC / Single Member</option>
                  <option value="S-Corporation">S-Corporation</option>
                  <option value="C-Corporation">C-Corporation</option>
                  <option value="Individual / Cross-Border Expat">Individual / Expat (FBAR / FATCA)</option>
                  <option value="Partnership / LLP">Partnership / LLP</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0A2540', marginBottom: '6px' }}>Primary Need</label>
                <select
                  name="service_needed"
                  className="artha-form-input"
                  value={formData.service_needed}
                  onChange={handleChange}
                >
                  <option value="Tax Strategy & Filing">Tax Strategy &amp; Annual Filing</option>
                  <option value="Cross-Border FBAR / FATCA">Cross-Border FBAR / FATCA Compliance</option>
                  <option value="AI Bank Statement to P&L">AI Bank Statement to P&amp;L</option>
                  <option value="Fractional CFO & Advisory">Fractional CFO &amp; Cashflow</option>
                  <option value="Offshore Team Outsourcing">Offshore Team Outsourcing</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0A2540', marginBottom: '6px' }}>How can we help you? *</label>
              <textarea
                name="message"
                required
                rows="4"
                placeholder="Share a brief overview of your business, annual revenue, or cross-border situation..."
                className="artha-form-input"
                style={{ resize: 'vertical' }}
                value={formData.message}
                onChange={handleChange}
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="artha-pill-btn artha-pill-primary"
              style={{ width: '100%', marginTop: '8px', padding: '13px 24px', fontSize: '14.5px' }}
            >
              {loading ? 'Submitting...' : 'Submit Consultation Request'}
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                arrow_forward
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
