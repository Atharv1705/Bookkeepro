export default function Services() {
  return (
    <>
      <div className="page-hero" style={{ '--hero-img': 'url("/images/Services-background-image.webp")' }}>
        <div className="page-hero-inner">
          <span className="eyebrow">What we do</span>
          <h1>Professional services for firms and businesses</h1>
        </div>
      </div>

      <div className="services-wrapper">
        <div className="service-block reveal">
          <div className="service-text">
            <span className="eyebrow">Offshore delivery</span>
            <h2>For accounting firms and businesses</h2>
            <p>
              BookKeepPro India specialises in its offshore delivery model and
              consists of a strong team of qualified accountants, cost
              accountants, tax consultants and payroll experts to ease the
              bookkeeping for accounting firms and businesses, globally.
            </p>
            <br />
            <p>
              Our India-based offshore bookkeeping services offer several
              benefits to global accounting firms and businesses.
            </p>
          </div>
          <img className="service-img" src="/images/services-3.webp" alt="Accounting Outsourcing" width="600" height="400" loading="lazy" />
        </div>

        <div className="service-block reverse reveal">
          <div className="service-text">
            <span className="eyebrow">Accounting outsourcing</span>
            <h2>Scale your business with outsourcing</h2>
            <p>
              Managing finances and accounting can be a complex and
              time-consuming task, often diverting your focus away from what
              truly matters — growing your business.
            </p>
            <br />
            <p>
              That's where we come in: a bookkeeping team that runs in the
              background so yours doesn't have to.
            </p>
          </div>
          <img className="service-img-bl-3" src="/images/services-2.webp" alt="Outsourced Accounting Team" width="600" height="400" loading="lazy" />
        </div>

        <div className="service-block reveal">
          <div className="service-text">
            <span className="eyebrow">Tax planning</span>
            <h2>Tax planning and preparation</h2>
            <p>
              We help individuals and businesses optimize tax strategy and get
              returns prepared right and on time. Whether your business is an
              LLC, S-Corp, or C-Corp, we'll help you:
            </p>
            <ol className="list-items">
              <li>Comply with and leverage changing federal tax law</li>
              <li>Minimize overall tax liability through strategic planning</li>
              <li>Determine taxation of owner-provided benefits</li>
              <li>Leverage year-end tax opportunities</li>
              <li>Manage multi-state tax exposure based on nexus</li>
            </ol>
            <br />
            <p>
              By minimizing your tax liability, you maximize your after-tax
              cash flow — the foundation of a proactive, confident tax plan.
            </p>
          </div>
          <img className="service-img" src="/images/services-1.webp" alt="Tax Services" width="600" height="400" loading="lazy" />
        </div>
      </div>
    </>
  );
}
