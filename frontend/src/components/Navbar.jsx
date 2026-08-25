import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function Navbar({ solid = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className={`navbar ${solid ? 'navbar-solid' : ''}`}>
      <div className="nav-container">
        <Link to="/">
          <img id="logos" src="/images/bookkeeppro-logo.webp" alt="BookKeepPro" width="190" height="64" />
        </Link>

        <nav id="navMenu" className={`nav-menu ${isOpen ? 'active' : ''}`}>
          <Link to="/" onClick={() => setIsOpen(false)}>Home</Link>
          <Link to="/about-us" onClick={() => setIsOpen(false)}>About Us</Link>
          <Link to="/services" onClick={() => setIsOpen(false)}>Services</Link>
          <Link to="/contact" onClick={() => setIsOpen(false)}>Contact Us</Link>

          <button className="login-btn desktop-login" onClick={() => navigate('/login')}>
            Sign in
          </button>
          <button className="login-btn mobile-login" onClick={() => navigate('/login')}>
            Sign in
          </button>
        </nav>

        <div className="hamburger" onClick={() => setIsOpen(!isOpen)}>
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  );
}
