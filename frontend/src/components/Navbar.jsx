import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function Navbar({ solid = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className={`artha-navbar ${solid ? 'artha-navbar-solid' : ''}`}>
      {/* Top Advisory Announcement Bar */}
      <div className="artha-top-alert">
        <div className="artha-top-alert-inner">
          <span className="artha-alert-badge">2026 TAX SEASON</span>
          <span>Now scheduling corporate tax structuring &amp; cross-border FBAR advisory sessions.</span>
          <Link to="/contact" className="artha-top-alert-link">
            Book Consultation &rarr;
          </Link>
        </div>
      </div>

      <div className="artha-nav-container">
        {/* Brand Left: Monogram / Logo + 2-line title */}
        <Link to="/" className="artha-brand-wrap">
          <img
            src="/images/brand-logo-mark.webp"
            alt="ABC CPA & Advisory"
            className="artha-brand-logo-img"
            width="38"
            height="38"
          />
          <div className="artha-brand-text">
            <span className="artha-brand-title">ABC CPA &amp; Advisory</span>
            <span className="artha-brand-sub">Tax Advisory &amp; Accounting Services</span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className={`artha-nav-links ${isOpen ? 'active' : ''}`}>
          <Link to="/" onClick={() => setIsOpen(false)}>Home</Link>
          <Link to="/services" onClick={() => setIsOpen(false)}>Services</Link>
          <Link to="/about-us" onClick={() => setIsOpen(false)}>About</Link>
          <Link to="/contact" onClick={() => setIsOpen(false)}>Contact</Link>

          {/* Mobile only actions */}
          <div className="artha-mobile-actions">
            <button className="artha-pill-btn artha-pill-outline" onClick={() => { setIsOpen(false); navigate('/login'); }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>login</span>
              Login Portal
            </button>
            <button className="artha-pill-btn artha-pill-primary" onClick={() => { setIsOpen(false); navigate('/contact'); }}>
              Schedule a Call
            </button>
          </div>
        </nav>

        {/* Right Actions Desktop Cluster */}
        <div className="artha-nav-actions">
          <button className="artha-pill-btn artha-pill-outline" onClick={() => navigate('/login')}>
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>login</span>
            Login Portal
          </button>
          <button className="artha-pill-btn artha-pill-primary" onClick={() => navigate('/contact')}>
            Schedule a Call
          </button>
        </div>

        {/* Hamburger Mobile Toggle */}
        <button 
          className={`artha-hamburger ${isOpen ? 'open' : ''}`} 
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Navigation Menu"
        >
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>
  );
}
