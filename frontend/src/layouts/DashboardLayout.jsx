import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-body">
      <header className="app-header">
        <Link to="/dashboard">
          <img className="logo" src="/images/bookkeeppro-logo.webp" alt="BookKeepPro" />
        </Link>
        <div className="header-actions">
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
          
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/profile')}>
            My Profile
          </button>
          <button className="btn btn-primary btn-sm" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <main className="page-main page-enter">
        <Outlet />
      </main>
    </div>
  );
}