import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function MarketingLayout() {
  const location = useLocation();
  return (
    <>
      <Navbar />
      <main>
        <div className="page-enter" key={location.pathname}>
          <Outlet />
        </div>
      </main>
      <Footer />
    </>
  );
}
