import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname } = location;

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <div className="app-body dash-page-wash" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Advisory Strip */}
      <div className="artha-top-alert" style={{ padding: '6px 16px', fontSize: '11.5px' }}>
        <div className="artha-top-alert-inner" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="dash-top-badge" style={{ fontSize: '9.5px', padding: '2px 8px' }}>
              {isAdmin ? 'ADMINISTRATOR CONSOLE' : 'SECURE CLIENT VAULT'}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.85)' }}>
              2026 Tax Season &bull; SOC-2 &amp; 256-Bit SSL Encrypted
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#10B981' }}>verified_user</span>
            <span>256-Bit SSL Encrypted Session</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header
        className="app-header dash-header"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 200,
          padding: '12px clamp(16px, 4vw, 36px)',
          height: 'auto'
        }}
      >
        <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            {/* Brand Identity */}
            <Link
              to={isAdmin ? '/admin-dashboard' : '/dashboard'}
              style={{ textDecoration: 'none' }}
            >
              <div className="artha-brand-wrap">
                <img
                  src="/images/brand-logo-mark.webp"
                  alt="ABC CPA & Advisory"
                  className="dash-brand-logo-img"
                  width="36"
                  height="36"
                />
                <div className="artha-brand-text">
                  <span className="artha-brand-title" style={{ fontSize: '18px' }}>ABC CPA</span>
                  <span className="artha-brand-sub" style={{ fontSize: '10px' }}>
                    {isAdmin ? 'Partner & Staff Portal' : 'Secure Client Vault'}
                  </span>
                </div>
              </div>
            </Link>

            {/* User Profile Pill & Actions */}
            <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#FFFFFF',
                  border: '1px solid rgba(10, 37, 64, 0.1)',
                  borderRadius: '9999px',
                  padding: '4px 12px 4px 6px',
                  cursor: 'pointer'
                }}
                onClick={() => navigate('/profile')}
                title="View & Edit Profile"
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#1D4ED8',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700
                  }}
                >
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0A2540' }}>
                    {user?.name || user?.email?.split('@')[0]}
                  </span>
                  <span style={{ fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1D4ED8', fontWeight: 700 }}>
                    {user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'admin' ? 'Staff CPA' : 'Client'}
                  </span>
                </div>
              </div>

              <button
                className="artha-pill-btn artha-pill-dark"
                style={{ padding: '7px 14px', fontSize: '12.5px' }}
                onClick={logout}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>logout</span>
                Logout
              </button>
            </div>
          </div>

          {/* Subnavigation Bar */}
          <nav className="dash-subnav-group" style={{ marginTop: '12px', flexWrap: 'wrap' }}>
            {!isAdmin ? (
              <>
                <Link
                  to="/dashboard"
                  className={`dash-subnav-link ${pathname === '/dashboard' ? 'active' : ''}`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>dashboard</span>
                  Client Overview
                </Link>
                <Link
                  to="/upload-personal"
                  className={`dash-subnav-link ${pathname === '/upload-personal' ? 'active' : ''}`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>person</span>
                  Personal Documents (1040/W-2)
                </Link>
                <Link
                  to="/upload-business"
                  className={`dash-subnav-link ${pathname === '/upload-business' ? 'active' : ''}`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>business</span>
                  Business Ledgers (1120-S/P&amp;L)
                </Link>
                <Link
                  to="/profile"
                  className={`dash-subnav-link ${pathname === '/profile' ? 'active' : ''}`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>manage_accounts</span>
                  Profile &amp; Security
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/admin-dashboard"
                  className={`dash-subnav-link ${pathname.startsWith('/admin') ? 'active' : ''}`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>group</span>
                  Client Management &amp; Reviews
                </Link>
                <Link
                  to="/profile"
                  className={`dash-subnav-link ${pathname === '/profile' ? 'active' : ''}`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>manage_accounts</span>
                  Staff Account
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          width: 'min(1400px, 94%)',
          margin: '16px auto 48px'
        }}
      >
        <div className="page-enter" key={location.pathname}>
          <Outlet />
        </div>
      </main>

      {/* Portal Executive Footer */}
      <footer
        style={{
          borderTop: '1px solid rgba(10, 37, 64, 0.08)',
          background: 'rgba(246, 249, 252, 0.8)',
          padding: '20px clamp(16px, 4vw, 36px)',
          marginTop: 'auto'
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '12.5px',
            color: '#425466'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#047857' }}>lock</span>
            <span>ABC CPA &bull; Secure Client Document Vault &bull; SOC-2 Aligned</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>AICPA Member Firm</span>
            <span>&bull;</span>
            <span>McKinney &amp; Frisco, Texas</span>
          </div>
        </div>
      </footer>
    </div>
  );
}