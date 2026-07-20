export default function AboutUs() {
  return (
    <>
      {/* HERO */}
      <div className="page-hero" style={{
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url("/images/About-us-background-image.webp")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        color: '#fff'
      }}>
        <div>
          <h1>About Us</h1>
          <p>Our People Are Passionate About What We Do</p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="about-wrapper">
        <div className="about-block">
          <div className="about-text">
            <h2>Who We Are</h2>
            <p>
              Our journey began in 1998 as a Chartered Accountant firm in India,
              built on strong fundamentals of accounting, compliance, integrity,
              and long-term client relationships.
            </p>
            <br />
            <p>
              In 2018, we strengthened our presence in Pune & Mumbai — transitioning
              from a traditional CA practice into a scalable financial services
              organization.
            </p>
          </div>
          <img className="about-img" src="/images/about-us-block-1.webp" alt="Bookkeepro Team" style={{ objectFit: 'cover' }} />
        </div>

        <div className="about-block reverse">
          <div className="about-text">
            <h2>About Bookkeepro</h2>
            <p>
              As our client base expanded globally — especially across the US — we aligned
              our operating model to support international growth.
            </p>
            <br />
            <p>
              In 2023, we launched:<br /><br />
              <b>• Bookkeeping Business Solutions Pvt Ltd (India)</b><br />
              <b>• Bookkeeping Business Solutions LLC (USA)</b>
            </p>
            <br />
            <p>
              Today, Bookkeepro serves global businesses, startups & enterprises with
              scalable, compliant bookkeeping and financial operations support.
            </p>
          </div>
          <img className="about-img" src="/images/young-business-people-using-computer-in-office.jpg" alt="About Bookkeepro" style={{ objectFit: 'cover' }} />
        </div>
      </div>

      <div className="about-block" style={{ width: 'min(1200px, 92%)', margin: 'auto', marginBottom: '80px', padding: '40px', justifyContent: 'center', textAlign: 'center', flexWrap: 'wrap' }}>
        <div className="about-text" style={{ flex: '1 1 100%' }}>
          <h2 style={{ marginBottom: '24px' }}>Who We Are Today</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
            <p style={{ background: 'var(--blue-light)', color: 'var(--navy)', padding: '12px 24px', borderRadius: '30px', fontWeight: '500' }}>✔️ 25+ years of accounting & compliance expertise</p>
            <p style={{ background: 'var(--blue-light)', color: 'var(--navy)', padding: '12px 24px', borderRadius: '30px', fontWeight: '500' }}>✔️ Operations across India & USA</p>
            <p style={{ background: 'var(--blue-light)', color: 'var(--navy)', padding: '12px 24px', borderRadius: '30px', fontWeight: '500' }}>✔️ Secure, process-driven financial workflows</p>
            <p style={{ background: 'var(--blue-light)', color: 'var(--navy)', padding: '12px 24px', borderRadius: '30px', fontWeight: '500' }}>✔️ Strong confidentiality & data protection practices</p>
          </div>
        </div>
      </div>
    </>
  );
}
