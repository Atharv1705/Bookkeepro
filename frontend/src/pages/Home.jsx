import { Link } from 'react-router-dom';

const SERVICES = [
  {
    label: 'Bookkeeping',
    title: 'Monthly books, closed clean and on time',
    img: '/images/services-1.webp',
  },
  {
    label: 'Payroll',
    title: 'Payroll runs your team can set a clock by',
    img: '/images/services-2.webp',
  },
  {
    label: 'Tax',
    title: 'Tax planning and prep built around your entity',
    img: '/images/services-3.webp',
  },
];

export default function Home() {
  return (
    <>
      {/* ================= HERO ================= */}
      <div className="hero">
        <div className="hero-inner reveal in-view">
          <span className="hero-eyebrow">Bookkeeping · Payroll · Tax</span>
          <h1>Every entry accounted for. <em>Every deadline kept.</em></h1>
          <p className="hero-sub">
            BookKeepPro handles the books, the payroll and the filings for growing
            businesses across the US and India, so nothing slips between the cracks
            of a busy quarter.
          </p>
          <div className="hero-actions">
            <Link to="/contact"><button className="btn btn-primary">Get started</button></Link>
            <Link to="/services"><button className="btn btn-outline" style={{ borderColor: 'rgba(255,255,255,0.5)', color: '#fff' }}>See our services</button></Link>
          </div>
        </div>

        <div className="hero-stats">
          <div className="stat-block">
            <div className="stat-figure tnum">27</div>
            <div className="stat-caption">Years in accounting</div>
          </div>
          <div className="stat-block">
            <div className="stat-figure tnum">2</div>
            <div className="stat-caption">Countries operating</div>
          </div>
          <div className="stat-block">
            <div className="stat-figure tnum">100%</div>
            <div className="stat-caption">Filings on schedule</div>
          </div>
        </div>
      </div>

      {/* ================= ABOUT ================= */}
      <section className="section about-grid reveal">
        <div className="about-copy">
          <span className="eyebrow">Who we are</span>
          <h2 style={{ marginTop: '14px', marginBottom: '20px' }}>Twenty-seven years of getting the numbers right</h2>
          <p>
            Our journey began in 1998 as a Chartered Accountant firm in India, built
            on strong fundamentals of accounting, compliance, integrity, and
            long-term client relationships.
          </p>
          <p>
            In 2018, responding to growing demand, we expanded into Pune and
            Mumbai — evolving from a traditional CA practice into a structured,
            process-driven financial services organization.
          </p>
          <p className="note">— Our people are passionate about what we do</p>
        </div>
        <div className="about-media">
          <img src="/images/home-about.webp" alt="BookKeepPro team at work" width="800" height="533" loading="lazy" />
        </div>
      </section>

      {/* ================= SERVICES ================= */}
      <section className="section reveal">
        <div className="section-head">
          <span className="eyebrow">What we handle</span>
          <h2>The three ledgers every business runs on</h2>
        </div>
        <div className="services-grid stagger">
          {SERVICES.map((s) => (
            <div className="service-card fade-up" key={s.label}>
              <div className="service-media">
                <img src={s.img} alt={s.title} width="600" height="400" loading="lazy" />
              </div>
              <div className="service-body">
                <span className="service-label">{s.label}</span>
                <h3>{s.title}</h3>
                <Link to="/contact"><button className="btn btn-outline btn-sm w-full">Get consultation</button></Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= CTA ================= */}
      <div className="cta-band reveal">
        <span className="eyebrow" style={{ justifyContent: 'center', color: '#E4C98A' }}>Ready when you are</span>
        <h2 style={{ marginTop: '14px' }}>Hand us the receipts. We'll handle the rest.</h2>
        <p>Book a short call and we'll map out exactly what your books need this quarter.</p>
        <Link to="/contact"><button className="btn btn-primary">Talk to us</button></Link>
      </div>
    </>
  );
}
