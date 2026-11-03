import { Outlet, useLocation } from 'react-router-dom';

export default function PublicLayout() {
  const location = useLocation();
  return (
    <main>
      <div className="page-enter" key={location.pathname}>
        <Outlet />
      </div>
    </main>
  );
}