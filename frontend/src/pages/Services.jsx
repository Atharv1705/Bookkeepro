import { useNavigate } from 'react-router-dom';

export default function Services() {
  const navigate = useNavigate();

  const servicesList = [
    {
      id: 'tax-strategy',
      category: 'TAX COMPLIANCE & STRATEGY',
      title: 'Corporate & Individual Tax Strategy',
      subtitle: 'Proactive entity planning, deductions, and audit-proof filings.',
      image: '/images/services-1.webp',
      description:
        'Managing tax liability requires forward-looking advisory rather than retrospective filing. We analyze your corporate structure (LLC, S-Corp, C-Corp, or Partnership) to uncover qualified business deductions, R&D tax credits, and optimal owner distributions.',
      bullets: [
        'Federal & multi-state corporate tax preparation (Forms 1120, 1120-S, 1065)',
        'Quarterly estimated tax calculations and proactive safe-harbor planning',
        'State tax nexus audits (economic nexus, sales tax, franchise taxes)',
        'Depreciation acceleration (Section 179 and bonus depreciation strategies)',
        'Owner-executive compensation and health/retirement benefit structuring'
      ],
      icon: 'calculate'
    },
    {
      id: 'cross-border',
      category: 'INTERNATIONAL & CROSS-BORDER',
      title: 'Cross-Border, Expat & FBAR / FATCA Advisory',
      subtitle: 'Dual-jurisdiction compliance across US and India tax frameworks.',
      image: '/images/services-2.webp',
      description:
        'International transactions and foreign asset holdings trigger severe IRS disclosure penalties if mishandled. We specialize in cross-border wealth, Indian investments, repatriation of capital, and dual-status tax residency under the US-India Double Tax Avoidance Agreement (DTAA).',
      bullets: [
        'FBAR (FinCEN Form 114) for foreign bank, mutual fund, and NRE/NRO accounts',
        'FATCA (Form 8938) reporting of specified foreign financial assets',
        'Form 5471 & Form 5472 disclosures for foreign-owned or overseas corporations',
        'Foreign Tax Credit (Form 1116) and Foreign Earned Income Exclusion (Form 2555)',
        'Repatriation of funds, Indian real estate sales, and capital gains advisory'
      ],
      icon: 'public'
    },
    {
      id: 'ai-bookkeeping',
      category: 'INTELLIGENT ACCOUNTING',
      title: 'Instant P&L from Bank Statements & Bookkeeping',
      subtitle: 'AI-driven statement ingestion paired with senior CPA oversight.',
      image: '/images/services-block-3.webp',
      description:
        'Say goodbye to month-long turnaround times and messy spreadsheets. Our AI ingestion engine parses bank statements directly into categorized, reconciled general ledgers. Every entry is cross-checked by experienced accountants for pristine, audit-ready books.',
      bullets: [
        'Automated ingestion of bank statements (PDF, scanned, and digital feeds)',
        'Continuous reconciliation of checking, savings, merchant (Stripe/PayPal), and credit cards',
        'Accrual and cash-basis financial statements (P&L, Balance Sheet, Cash Flow)',
        'QuickBooks Online & Xero cloud sync with custom chart of accounts',
        'Audit-ready documentation and digital receipt attachment'
      ],
      icon: 'receipt_long'
    },
    {
      id: 'fractional-cfo',
      category: 'EXECUTIVE ADVISORY',
      title: 'Fractional CFO & Cashflow Advisory',
      subtitle: 'High-level financial leadership to scale revenue and protect margins.',
      image: '/images/young-business-people-using-computer-in-office.webp',
      description:
        'Growth-stage enterprises and founders require senior strategic insights without the overhead of a full-time executive. We guide capital allocation, cashflow forecasting, burn-rate management, and investor reporting so you navigate transitions with confidence.',
      bullets: [
        'Dynamic 13-week cash flow projections and scenario modeling',
        'Burn rate analysis, runway extensions, and working capital optimization',
        'KPI benchmarking, gross margin analysis, and unit economics',
        'Board deck preparation and investor-facing financial presentations',
        'M&A transaction readiness and pre-deal due diligence'
      ],
      icon: 'trending_up'
    },
    {
      id: 'offshore-delivery',
      category: 'FIRM CAPACITY',
      title: 'Global Delivery & Offshore Accounting Teams',
      subtitle: 'Dedicated accounting back-office for US CPA firms and enterprises.',
      image: '/images/services-3.webp',
      description:
        'Address staffing shortages and scale firm capacity seamlessly. Our India offshore center provides qualified Chartered Accountants, cost accountants, and QuickBooks ProAdvisors working in tight synchronization with your onshore workflows.',
      bullets: [
        'Dedicated remote bookkeeping, payroll, and tax preparation squads',
        'Standardized SOPs, dual-tier quality reviews, and strict SLAs',
        'SOC-2 aligned security protocols and encrypted data transmission',
        'Timezone advantage allowing overnight processing and faster turnaround',
        'Flexible engagement models from project-based to full-time dedicated staff'
      ],
      icon: 'hub'
    }
  ];

  return (
    <div className="artha-services-page" style={{ background: 'var(--paper, #F6F9FC)', minHeight: '100vh', paddingBottom: '50px' }}>
      {/* Header Banner */}
      <section style={{ padding: '36px 0 24px', borderBottom: '1px solid rgba(10, 37, 64,0.07)' }}>
        <div style={{ width: 'min(1280px, 94%)', margin: '0 auto', textAlign: 'center' }}>
          <div className="artha-eyebrow-pill">
            <span className="dot"></span>
            PRACTICE AREAS &amp; ADVISORY
          </div>
          <h1 style={{ fontFamily: "var(--font-display, 'Playfair Display', serif)", fontSize: 'clamp(23px, 2.3vw, 32px)', color: '#0A2540', fontWeight: 600, margin: '10px 0' }}>
            Comprehensive Tax &amp; Accounting Services
          </h1>
          <p style={{ maxWidth: '580px', margin: '0 auto', color: '#425466', fontSize: '13.5px', lineHeight: 1.6 }}>
            Designed for founders, cross-border families, and modern enterprises seeking rigorous precision, strategic tax reduction, and audit-ready financials.
          </p>
        </div>
      </section>

      {/* Services List Blocks with Images */}
      <div style={{ width: 'min(1280px, 94%)', margin: '40px auto 0', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {servicesList.map((svc, idx) => (
          <div
            key={svc.id}
            id={svc.id}
            className={`reveal reveal-delay-${(idx % 3) + 1}`}
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(10, 37, 64, 0.08)',
              borderRadius: '20px',
              padding: 'clamp(22px, 2.6vw, 34px)',
              boxShadow: '0 4px 20px -2px rgba(10, 37, 64, 0.04)',
              display: 'grid',
              gridTemplateColumns: idx % 2 === 0 ? '1.15fr 0.85fr' : '0.85fr 1.15fr',
              gap: '34px',
              alignItems: 'center',
              transition: 'transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease'
            }}
          >
            {/* Main Content Column */}
            <div style={{ order: idx % 2 === 0 ? 1 : 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span className="artha-service-pill-tag" style={{ margin: 0 }}>
                  {svc.category}
                </span>
              </div>
              <h2 style={{ fontFamily: "var(--font-display, 'Playfair Display', serif)", fontSize: 'clamp(18px, 1.9vw, 24px)', color: '#0A2540', fontWeight: 600, marginBottom: '6px' }}>
                {svc.title}
              </h2>
              <p style={{ fontStyle: 'italic', color: '#1D4ED8', fontSize: '13.5px', fontWeight: 500, marginBottom: '12px' }}>
                {svc.subtitle}
              </p>
              <p style={{ color: '#425466', fontSize: '13px', lineHeight: 1.6, marginBottom: '18px' }}>
                {svc.description}
              </p>

              <button
                className="artha-pill-btn artha-pill-primary"
                onClick={() => navigate('/contact')}
              >
                Inquire About This Service
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  arrow_forward
                </span>
              </button>
            </div>

            {/* Visual & Checklist Column */}
            <div
              style={{
                order: idx % 2 === 0 ? 2 : 1,
                background: '#F6F9FC',
                border: '1px solid rgba(10, 37, 64, 0.08)',
                borderRadius: '20px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px'
              }}
            >
              {/* Service Visual Thumbnail */}
              <div style={{ width: '100%', height: '200px', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(10, 37, 64,0.06)' }}>
                <img
                  src={svc.image}
                  alt={svc.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                  width="600"
                  height="400"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="artha-ticker-icon" style={{ width: '32px', height: '32px', margin: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{svc.icon}</span>
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0A2540', margin: 0 }}>
                  Key Practice Capabilities
                </h3>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {svc.bullets.map((b, bIdx) => (
                  <li key={bIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#0A2540', lineHeight: 1.45 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#047857', flexShrink: 0, marginTop: '2px' }}>
                      check_circle
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Consultation CTA */}
      <div className="reveal" style={{ width: 'min(1280px, 94%)', margin: '48px auto 0', textAlign: 'center', background: '#0A2540', borderRadius: '20px', padding: '36px 20px', color: '#FFFFFF' }}>
        <h2 style={{ fontFamily: "var(--font-display, 'Playfair Display', serif)", fontSize: 'clamp(20px, 2.1vw, 27px)', color: '#FFFFFF', marginBottom: '10px' }}>
          Need a Custom Advisory Engagement?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.75)', maxWidth: '520px', margin: '0 auto 22px', fontSize: '13.5px', lineHeight: 1.6 }}>
          Schedule a direct 15-minute consultation to review your corporate or cross-border structure with a senior tax strategist.
        </p>
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="artha-pill-btn artha-pill-primary" onClick={() => navigate('/contact')}>
            Schedule Strategy Call
          </button>
          <button
            className="artha-pill-btn artha-pill-outline"
            style={{ background: 'transparent', color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.3)' }}
            onClick={() => navigate('/login')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>login</span>
            Login Portal
          </button>
        </div>
      </div>
    </div>
  );
}
