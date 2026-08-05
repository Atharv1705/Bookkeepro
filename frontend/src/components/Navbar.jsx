import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function Navbar({ solid = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={`navbar ${solid ? 'navbar-solid' : ''}`}>
      <div className="nav-container">
        <Link to="/">
          <img id="logos" src="/images/bookkeeppro-logo.webp" alt="BookKeepPro" />
        </Link>

        <nav id="navMenu" className={`nav-menu ${isOpen ? 'active' : ''}`}>
          <Link to="/" onClick={() => setIsOpen(false)}>Home</Link>
          <Link to="/about-us" onClick={() => setIsOpen(false)}>About Us</Link>
          <Link to="/services" onClick={() => setIsOpen(false)}>Services</Link>
          <Link to="/contact" onClick={() => setIsOpen(false)}>Contact Us</Link>

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}
            aria-label="Toggle Theme"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

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
