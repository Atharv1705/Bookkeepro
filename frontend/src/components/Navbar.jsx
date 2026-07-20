import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function Navbar({ transparent = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={`navbar ${transparent ? 'navbar-transparent' : ''}`}>
      <div className="nav-container">
        <Link to="/">
          <img id="logos" src="/images/bookkeeppro-logo.webp" alt="Bookkeeping Logo" />
        </Link>

        <nav id="navMenu" className={`nav-menu ${isOpen ? 'active' : ''}`}>
          <Link to="/">Home</Link>
          <Link to="/about-us">About Us</Link>
          <Link to="/services">Services</Link>
          <Link to="/contact">Contact Us</Link>

          <button 
            className="theme-toggle" 
            onClick={toggleTheme} 
            style={{background:'none', border:'none', color:'inherit', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:'8px'}}
            aria-label="Toggle Theme"
          >
            <span className="material-symbols-outlined theme-toggle-icon" style={{fontSize: '24px'}}>
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
