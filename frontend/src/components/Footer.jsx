import { Link, useNavigate } from 'react-router-dom';

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="artha-footer">
      <div className="artha-footer-inner">
        {/* Col 1: Brand & Office */}
        <div className="artha-footer-col artha-footer-brand">
          <div className="artha-footer-logo-row" style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
            <img
              src="/images/brand-logo-mark.webp"
              alt="ABC CPA & Advisory"
              className="artha-brand-logo-img"
              style={{ width: '42px', height: '42px', borderRadius: '10px' }}
              width="42"
              height="42"
            />
            <div>
              <div className="artha-footer-title">ABC CPA &amp; Advisory</div>
              <div className="artha-footer-subtitle">Tax Advisory &amp; Accounting Services</div>
            </div>
          </div>
          <p className="artha-footer-desc">
            Proactive financial strategy, international taxation, and AI-enabled accounting for founders, growth businesses, and non-residents worldwide.
          </p>
          <div className="artha-footer-contact-info">
            <p><strong>US Office:</strong> 2520 Indigo Dr, McKinney / Frisco, TX 75072</p>
            <p><strong>India Office:</strong> Landmark Centre, Pune, MH 411009</p>
            <p><strong>Email:</strong> <a href="mailto:atharvg.aiindia@gmail.com">atharvg.aiindia@gmail.com</a></p>
          </div>
        </div>

        {/* Col 2: Services */}
        <div className="artha-footer-col">
          <div className="artha-footer-heading">Services</div>
          <ul className="artha-footer-links">
            <li><Link to="/services">Tax Strategy & Preparation</Link></li>
            <li><Link to="/services">International & Cross-Border (FBAR/FATCA)</Link></li>
            <li><Link to="/services">Instant P&L from Bank Statements</Link></li>
            <li><Link to="/services">Fractional CFO & Advisory</Link></li>
            <li><Link to="/services">Full-Cycle Bookkeeping & Payroll</Link></li>
          </ul>
        </div>

        {/* Col 3: Firm */}
        <div className="artha-footer-col">
          <div className="artha-footer-heading">Firm</div>
          <ul className="artha-footer-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about-us">About Us</Link></li>
            <li><Link to="/services">Services</Link></li>
            <li><Link to="/contact">Contact & Consultations</Link></li>
            <li><Link to="/login">Login Portal</Link></li>
          </ul>
        </div>

        {/* Col 4: Action & Hours */}
        <div className="artha-footer-col artha-footer-action-col">
          <button 
            className="artha-pill-btn artha-pill-primary artha-footer-cta-btn" 
            onClick={() => navigate('/login')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>login</span>
            Access Login Portal
          </button>
          <div className="artha-footer-hours">
            <p className="artha-hours-email">atharvg.aiindia@gmail.com</p>
            <p className="artha-hours-timing">Mon &ndash; Fri, 9:00 AM &ndash; 6:00 PM CT</p>
          </div>
        </div>
      </div>

      <div className="artha-footer-bottom">
        <div className="artha-footer-bottom-inner">
          <p>&copy; {new Date().getFullYear()} ABC CPA & Advisory. All rights reserved.</p>
          <div className="artha-footer-bottom-links">
            <span>AICPA Member Firm</span>
            <span>&bull;</span>
            <span>QuickBooks ProAdvisor</span>
            <span>&bull;</span>
            <span>SOC-2 &amp; Encrypted Document Storage</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
