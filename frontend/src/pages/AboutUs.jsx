export default function AboutUs() {
  return (
    <>
      <div className="page-hero" style={{ '--hero-img': 'url("/images/About-us-background-image.webp")' }}>
        <div className="page-hero-inner">
          <span className="eyebrow">About BookKeepPro</span>
          <h1>Our people are passionate about what we do</h1>
          <p>Twenty-seven years of accounting, compliance and long-term client relationships.</p>
        </div>
      </div>

      <div className="about-wrapper">
        <div className="about-block reveal">
          <div className="about-text">
            <span className="eyebrow">1998 — where it started</span>
            <h2 style={{ margin: '14px 0' }}>Who we are</h2>
            <p>
              Our journey began in 1998 as a Chartered Accountant firm in India,
              built on strong fundamentals of accounting, compliance, integrity,
              and long-term client relationships.
            </p>
            <br />
            <p>
              In 2018, we strengthened our presence in Pune and Mumbai —
              transitioning from a traditional CA practice into a scalable
              financial services organization.
            </p>
          </div>
          <img className="about-img" src="/images/about-us-block-1.webp" alt="BookKeepPro Team" />
        </div>

        <div className="about-block reverse reveal">
          <div className="about-text">
            <span className="eyebrow">2023 — going global</span>
            <h2 style={{ margin: '14px 0' }}>About BookKeepPro</h2>
            <p>
              As our client base expanded globally — especially across the US —
              we aligned our operating model to support international growth.
            </p>
            <br />
            <p>
              In 2023, we launched:<br /><br />
              <b>Bookkeeping Business Solutions Pvt Ltd</b> (India)<br />
              <b>Bookkeeping Business Solutions LLC</b> (USA)
            </p>
            <br />
            <p>
              Today, BookKeepPro serves global businesses, startups and
              enterprises with scalable, compliant bookkeeping and financial
              operations support.
            </p>
          </div>
          <img className="about-img" src="/images/young-business-people-using-computer-in-office.webp" alt="About BookKeepPro" width="800" height="533" loading="lazy" />
        </div>
      </div>

      <section className="section reveal" style={{ marginTop: 0, marginBottom: '90px' }}>
        <div className="section-head" style={{ textAlign: 'center', margin: '0 auto 32px', maxWidth: '640px' }}>
          <span className="eyebrow" style={{ justifyContent: 'center' }}>Where we stand today</span>
          <h2>Who we are today</h2>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
          {[
            '27+ years of accounting & compliance expertise',
            'Operations across India and the USA',
            'Secure, process-driven financial workflows',
            'Strong confidentiality & data protection practices',
          ].map((item) => (
            <p key={item} className="badge badge-blue" style={{ padding: '12px 22px', fontSize: '13.5px', fontWeight: 500, letterSpacing: 0 }}>
              {item}
            </p>
          ))}
        </div>
      </section>
    </>
  );
}
