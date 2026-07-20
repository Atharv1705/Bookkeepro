import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-left">
          <img src="/images/bookkeeppro-logo.webp" className="footer-logo" alt="Bookkeepro" />
          <p>Your Globally Trusted Bookkeeping Partner.</p>
        </div>

        <div className="footer-links">
          <h4>Quick Links</h4>
          <Link to="/">Home</Link>
          <Link to="/about-us">About Us</Link>
          <Link to="/services">Services</Link>
          <Link to="/contact">Contact Us</Link>
        </div>

        <div className="footer-contact">
          <h4>Contact</h4>
          <p>📍 USA: McKinney, TX</p>
          <p>📍 India: Pune, Maharashtra</p>
          <p>📧 vedant.aiindia@gmail.com</p>
          <p>📞 +918275367267</p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 Bookkeeping Business Solutions. All rights reserved.</p>
      </div>
    </footer>
  );
}
