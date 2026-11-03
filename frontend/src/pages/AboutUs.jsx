import { useNavigate } from 'react-router-dom';

export default function AboutUs() {
  const navigate = useNavigate();

  const milestones = [
    {
      year: '1998',
      title: 'Foundations of Accounting & Statutory Compliance',
      image: '/images/about-us-block-1.webp',
      desc: 'Our journey began as a Chartered Accountant practice built on strict principles of accounting integrity, statutory accuracy, and enduring client partnerships. Over two decades, we served hundreds of businesses through complex regulatory evolutions.'
    },
    {
      year: '2018',
      title: 'Institutional Scale & Cloud Modernization',
      image: '/images/services-2.webp',
      desc: 'Responding to rising demand for structured financial outsourcing, we expanded operations into Pune and Mumbai. We transitioned traditional accounting into scalable, cloud-first workflows leveraging QuickBooks, Xero, and structured standard operating procedures.'
    },
    {
      year: '2023',
      title: 'Dual US-India Cross-Border Expansion',
      image: '/images/young-business-people-using-computer-in-office.webp',
      desc: 'To support global founders, expat families, and multinational firms, we established our US presence in McKinney and Frisco, Texas. We engineered specialized advisory for international tax treaties, FBAR/FATCA filings, and dual-entity tax minimization.'
    },
    {
      year: 'Today',
      title: 'AI-Enabled Precision & Executive Advisory',
      image: '/images/services-block-3.webp',
      desc: 'We combine seasoned CPA and Chartered Accountant leadership with proprietary AI statement ingestion, transforming raw bank statements into reconciled, audit-ready financial statements in minutes while delivering strategic fractional CFO advisory.'
    }
  ];

  const credentials = [
    { title: '27+ Years of Practice', desc: 'Over a quarter-century of proven financial, audit, and tax compliance leadership.' },
    { title: 'Dual US & India Hubs', desc: 'Seamless cross-border coordination across Texas (US) and Pune (India).' },
    { title: 'AICPA Member Firm', desc: 'Adhering to the highest professional, ethical, and accounting industry benchmarks.' },
    { title: 'SOC-2 Aligned Security', desc: '256-bit encrypted document portals protecting your sensitive financial data.' }
  ];

  return (
    <div className="artha-about-page" style={{ background: 'var(--paper, #F6F9FC)', minHeight: '100vh', paddingBottom: '50px' }}>
      {/* Header Banner */}
      <section style={{ padding: '36px 0 24px', borderBottom: '1px solid rgba(10, 37, 64,0.07)' }}>
        <div style={{ width: 'min(1280px, 94%)', margin: '0 auto', textAlign: 'center' }}>
          <div className="artha-eyebrow-pill">
            <span className="dot"></span>
            OUR FIRM &amp; HERITAGE
          </div>
          <h1 style={{ fontFamily: "var(--font-display, 'Playfair Display', serif)", fontSize: 'clamp(23px, 2.3vw, 32px)', color: '#0A2540', fontWeight: 600, margin: '10px 0' }}>
            Rooted in Precision. Built for Global Scale.
          </h1>
          <p style={{ maxWidth: '580px', margin: '0 auto', color: '#425466', fontSize: '13.5px', lineHeight: 1.6 }}>
            For over 27 years, we have guided founders, growing businesses, and international families through complex tax codes, compliance mandates, and financial transformations.
          </p>
        </div>
      </section>

      {/* Main Heritage Card with Real Image */}
      <div className="reveal" style={{ width: 'min(1280px, 94%)', margin: '40px auto 0' }}>
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(10, 37, 64, 0.08)',
            borderRadius: '20px',
            padding: 'clamp(24px, 2.8vw, 38px)',
            boxShadow: '0 4px 20px -2px rgba(10, 37, 64, 0.04)',
            display: 'grid',
            gridTemplateColumns: '1.1fr 0.9fr',
            gap: '36px',
            alignItems: 'center'
          }}
        >
          <div>
            <span className="artha-service-pill-tag">WHO WE ARE</span>
            <h2 style={{ fontFamily: "var(--font-display, 'Playfair Display', serif)", fontSize: 'clamp(19px, 2vw, 25px)', color: '#0A2540', fontWeight: 600, margin: '8px 0 12px' }}>
              Your proactive partner in financial strategy
            </h2>
            <p style={{ color: '#425466', fontSize: '13.5px', lineHeight: 1.6, marginBottom: '12px' }}>
              Accounting shouldn&apos;t be an afterthought relegated to tax season. At ABC CPA &amp; Advisory, we act as an extension of your leadership team &mdash; analyzing entity efficiency, identifying immediate deductions, and untangling multi-jurisdiction liabilities before deals close.
            </p>
            <p style={{ color: '#425466', fontSize: '13.5px', lineHeight: 1.6, marginBottom: '20px' }}>
              With dedicated offices in Texas and India, our dual operating model delivers round-the-clock responsiveness, strict quality controls, and unmatched cross-border tax expertise.
            </p>

            <button className="artha-pill-btn artha-pill-primary" onClick={() => navigate('/contact')}>
              Schedule a Consultation
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                arrow_forward
              </span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ position: 'relative', width: '100%', height: '220px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 6px 20px rgba(10, 37, 64,0.08)' }}>
              <img
                src="/images/home-about.webp"
                alt="Our Accounting Practice Team"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                loading="lazy"
                width="800"
                height="533"
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(10, 37, 64, 0.12) 0%, rgba(10, 37, 64, 0.22) 100%)', pointerEvents: 'none' }} />
            </div>

            <div style={{ background: '#0A2540', borderRadius: '16px', padding: '18px 18px', color: '#FFFFFF' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#3B82F6' }}>
                CORE BELIEF
              </span>
              <blockquote style={{ fontFamily: "var(--font-display, 'Playfair Display', serif)", fontSize: '15px', fontStyle: 'italic', lineHeight: 1.4, margin: '6px 0 8px', color: '#FFFFFF' }}>
                &ldquo;The true measure of an accounting firm is not how fast they file forms, but how much value and peace of mind they generate before the filing occurs.&rdquo;
              </blockquote>
              <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                &mdash; ABC CPA &amp; Advisory Leadership Team
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Section with Visual Milestone Cards */}
      <section className="reveal" style={{ width: 'min(1280px, 94%)', margin: '48px auto 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="artha-eyebrow-pill">
            <span className="dot"></span>
            THE JOURNEY
          </div>
          <h2 style={{ fontFamily: "var(--font-display, 'Playfair Display', serif)", fontSize: 'clamp(20px, 2.1vw, 27px)', color: '#0A2540', fontWeight: 600 }}>
            Twenty-Seven Years in the Making
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '26px' }}>
          {milestones.map((m, idx) => (
            <div
              key={idx}
              className={`reveal-delay-${(idx % 4) + 1}`}
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(10, 37, 64, 0.08)',
                borderRadius: '22px',
                padding: '24px',
                boxShadow: '0 2px 14px -2px rgba(10, 37, 64, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease'
              }}
            >
              <div style={{ width: '100%', height: '160px', borderRadius: '14px', overflow: 'hidden', marginBottom: '16px' }}>
                <img
                  src={m.image}
                  alt={m.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                  width="600"
                  height="400"
                />
              </div>

              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '22px',
                  fontWeight: 600,
                  color: '#1D4ED8',
                  marginBottom: '6px'
                }}
              >
                {m.year}
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0A2540', marginBottom: '10px', lineHeight: 1.3 }}>
                {m.title}
              </h3>
              <p style={{ fontSize: '13.5px', color: '#425466', lineHeight: 1.6, margin: 0 }}>
                {m.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Pillars */}
      <section style={{ width: 'min(1280px, 94%)', margin: '48px auto 0' }}>
        <div style={{ background: '#F6F9FC', border: '1px solid rgba(10, 37, 64, 0.08)', borderRadius: '20px', padding: '30px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '28px' }}>
            {credentials.map((c, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ color: '#1D4ED8', fontSize: '28px' }}>
                  verified_user
                </span>
                <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#0A2540', margin: '4px 0 0 0' }}>
                  {c.title}
                </h4>
                <p style={{ fontSize: '13px', color: '#425466', margin: 0, lineHeight: 1.5 }}>
                  {c.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
