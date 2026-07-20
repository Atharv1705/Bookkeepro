export default function Services() {
  return (
    <>
      {/* HERO */}
      <div className="page-hero" style={{
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url("/images/Services-background-image.webp")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        color: '#fff'
      }}>
        <h1>Professional Services for Firms & Businesses</h1>
      </div>

      {/* SERVICE CONTENT */}
      <div className="services-wrapper">
        {/* Block 1 */}
        <div className="service-block">
          <div className="service-text">
            <h2>For Accounting Firms and Businesses</h2>
            <p>
              Bookkeepro India specialises in its offshore delivery model and consists of a strong team of qualified
              accountants, cost accountants, tax consultants and payroll experts to ease the bookkeeping for Accounting
              Firms and Businesses, globally.
            </p>
            <br />
            <p>
              Bookkeepro’s India based offshore bookkeeping services offer several benefits
              to global accounting firms and businesses.
            </p>
          </div>
          <img className="service-img" src="/images/services-3.jpg" alt="Accounting Outsourcing" style={{ borderRadius: '14px', objectFit: 'cover' }} />
        </div>

        {/* Block 2 */}
        <div className="service-block reverse">
          <div className="service-text">
            <h2>Scale Your Business with Accounting Outsourcing</h2>
            <p>
              Are you ready to supercharge your business and take it to new heights?
              We understand that managing finances and accounting can be a complex and
              time-consuming task, often diverting your focus away from what truly matters —
              growing your business.
            </p>
            <br />
            <p>
              That’s where we come in. Allow us to present the game-changing solution:
              Accounting Outsourcing.
            </p>
          </div>
          <img className="service-img-bl-3" src="/images/services-2.jpg" alt="Outsourced Accounting Team" style={{ borderRadius: '14px', objectFit: 'cover' }} />
        </div>

        {/* Block 3 */}
        <div className="service-block">
          <div className="service-text">
            <h2>Tax Planning And Preparation</h2>
            <p>
              We help individuals and businesses optimize tax strategy and get returns prepared right and on time.
              Whether your business is an LLC, S-Corp, or C-Corp, we’ll help you:
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
              By minimizing your tax liability, you maximize your after-tax cash flow,
              which helps create financial security. We want you confident in knowing you
              have the right proactive tax plan in place.
            </p>
          </div>
          <img className="service-img" src="/images/services-1.jpg" alt="Tax Services" style={{ borderRadius: '14px', objectFit: 'cover' }} />
        </div>
      </div>
    </>
  );
}
