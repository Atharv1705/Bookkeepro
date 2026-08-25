import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-left">
          <img src="/images/bookkeeppro-logo.webp" className="footer-logo" alt="BookKeepPro" width="190" height="64" />
          <p>Bookkeeping, payroll and tax preparation for growing businesses — kept precise, kept compliant.</p>
        </div>

        <div className="footer-links">
          <h3>Navigate</h3>
          <Link to="/">Home</Link>
          <Link to="/about-us">About Us</Link>
          <Link to="/services">Services</Link>
          <Link to="/contact">Contact Us</Link>
        </div>

        <div className="footer-contact">
          <h3>Reach us</h3>
          <p>USA · 2520 Indigo Dr, McKinney, TX 75072</p>
          <p>India · 508 White Square, Hinjewadi Road, Pune 411057</p>
          <p>atharvg.aiindia@gmail.com</p>
          <p>+91 8275367267</p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 Bookkeeping Business Solutions. All rights reserved.</p>
      </div>
    </footer>
  );
}
