import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-body">
      <header className="app-header">
        <Link to={(user?.role === 'admin' || user?.role === 'super_admin') ? '/admin-dashboard' : '/dashboard'}>
          <img className="logo" src="/images/bookkeeppro-logo.webp" alt="BookKeepPro" width="190" height="64" />
        </Link>
        <div className="header-actions">
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