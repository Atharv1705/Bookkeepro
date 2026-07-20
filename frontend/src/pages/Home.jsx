import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <>
      {/* ================= HERO ================= */}
      <div className="home-hero" style={{
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url("/images/home-background.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '600px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        color: '#fff',
        padding: '20px'
      }}>
        <div style={{ maxWidth: '800px' }}>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: '700', marginBottom: '20px', color: '#fff' }}>PRECISION | COMPLIANCE | FINANCIAL GROWTH</h1>
          <p style={{ fontSize: 'clamp(18px, 2vw, 24px)', marginBottom: '30px', color: '#e2eaf2' }}>Your Trusted Bookkeeping & Financial Operations Partner for Growing Businesses</p>
          <Link to="/contact">
            <button className="btn btn-primary" style={{ padding: '12px 32px', fontSize: '18px', borderRadius: '30px' }}>Get Started</button>
          </Link>
        </div>
      </div>

      {/* ================= ABOUT ================= */}
      <section className="about-section" style={{ display: 'flex', gap: '40px', padding: '80px 20px', maxWidth: '1200px', margin: '0 auto', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="text" style={{ flex: '1 1 500px' }}>
          <h2 style={{ fontSize: '36px', marginBottom: '24px' }}>
            We are <span style={{ color: '#0077C8' }}>BOOK</span><span style={{ color: '#FF7F11' }}>KEEPRO</span>
          </h2>
          <p style={{ fontSize: '16px', lineHeight: '1.8', marginBottom: '16px' }}>
            Our journey began in 1998 as a Chartered Accountant firm in India, built on strong fundamentals of accounting, compliance, integrity, and long-term client relationships. Over the years, we earned the trust of businesses by delivering accurate, compliant, and dependable financial services.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.8', marginBottom: '24px' }}>
            In 2018, responding to growing demand and an expanding client base, we strengthened our presence by establishing operations in Pune and Mumbai, two of India’s major business hubs. This phase marked our evolution from a traditional CA practice into a more structured, process-driven financial services organization.
          </p>
          <p className="note" style={{ fontStyle: 'italic', color: 'var(--muted)', fontWeight: '500' }}>-- Our People Are Passionate About What We Do</p>
        </div>
        <div style={{ flex: '1 1 400px' }}>
          <img src="/images/home-about.jpg" alt="About BookKeepPro" style={{ width: '100%', borderRadius: '20px', boxShadow: 'var(--shadow-lg)', objectFit: 'cover' }} />
        </div>
      </section>

      {/* ================= SERVICES ================= */}
      <section className="services-section">
        <h2>OUR SERVICES</h2>
        <div className="services-grid">
          <div className="service-card" style={{ flex: '1 1 300px' }}>
            <img src="/images/services-1.jpg" alt="Bookkeeping" style={{ width: '100%', height: '220px', objectFit: 'cover', borderTopLeftRadius: '15px', borderTopRightRadius: '15px' }} />
            <div style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>Professional Bookkeeping for Firms & Businesses</h3>
              <Link to="/contact"><button className="btn btn-outline" style={{ width: '100%' }}>Get Consultation</button></Link>
            </div>
          </div>
          <div className="service-card" style={{ flex: '1 1 300px' }}>
            <img src="/images/services-2.jpg" alt="Payroll" style={{ width: '100%', height: '220px', objectFit: 'cover', borderTopLeftRadius: '15px', borderTopRightRadius: '15px' }} />
            <div style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>Professional & Globally Trusted Payroll Solutions</h3>
              <Link to="/contact"><button className="btn btn-outline" style={{ width: '100%' }}>Get Consultation</button></Link>
            </div>
          </div>
          <div className="service-card" style={{ flex: '1 1 300px' }}>
            <img src="/images/services-3.jpg" alt="Tax Planning" style={{ width: '100%', height: '220px', objectFit: 'cover', borderTopLeftRadius: '15px', borderTopRightRadius: '15px' }} />
            <div style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>Professional Tax Planning & Preparation</h3>
              <Link to="/contact"><button className="btn btn-outline" style={{ width: '100%' }}>Get Consultation</button></Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
