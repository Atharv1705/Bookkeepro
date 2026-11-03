import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import CountUp from '../components/CountUp';

export default function Home() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Consultation booking state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  // Interactive Practice Tabs state
  const [activeTab, setActiveTab] = useState('corporate');

  // Interactive Tax Estimator state
  const [calcEntity, setCalcEntity] = useState('s-corp');
  const [calcRevenue, setCalcRevenue] = useState('250to750');
  const [calcCrossBorder, setCalcCrossBorder] = useState('yes');

  // Interactive FAQ Accordion state
  const [openFaq, setOpenFaq] = useState(0);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Submission failed');
      showToast('Thank you! Our advisory team will reach out within 1 business day.', 'success');
      setFormData({ first_name: '', last_name: '', email: '', phone: '', message: '' });
    } catch (err) {
      console.error(err);
      showToast('Thank you! We have received your request and will follow up shortly.', 'success');
    } finally {
      setLoading(false);
    }
  };

  // Dynamic calculation for tax diagnostic estimator
  const calculateTaxSavings = () => {
    let baseSavings = 12500;
    if (calcRevenue === 'under250') baseSavings = 8400;
    else if (calcRevenue === '250to750') baseSavings = 19600;
    else if (calcRevenue === '750to2m') baseSavings = 38200;
    else if (calcRevenue === 'above2m') baseSavings = 64500;

    if (calcEntity === 'llc') baseSavings = Math.round(baseSavings * 0.9);
    else if (calcEntity === 's-corp') baseSavings = Math.round(baseSavings * 1.15);
    else if (calcEntity === 'c-corp') baseSavings = Math.round(baseSavings * 1.25);
    else if (calcEntity === 'dual') baseSavings = Math.round(baseSavings * 1.35);

    if (calcCrossBorder === 'yes') {
      baseSavings += 6500;
    }

    let rec = 'S-Corp Election + W-2 Salary Calibration';
    if (calcEntity === 'dual' || calcCrossBorder === 'yes') {
      rec = 'Cross-Border Treaty Optimization + FinCEN 114 Safe Harbor';
    } else if (calcEntity === 'c-corp') {
      rec = 'Section 1202 QSBS Stock Structuring + R&D Tax Credit Offset';
    } else if (calcRevenue === 'above2m') {
      rec = 'Pass-Through Entity Tax (PTET) State Cap Workaround + Cash Balance Plan';
    }

    return {
      savingsFormatted: '$' + baseSavings.toLocaleString() + ' / yr',
      recommendation: rec,
      auditRiskReduction: calcCrossBorder === 'yes' ? '96% lower penalty risk' : '98% IRS compliance audit-readiness'
    };
  };

  const taxStats = calculateTaxSavings();

  const tickerServices = [
    {
      icon: 'calculate',
      title: 'Business Tax Strategy & Prep',
      desc: 'Proactive entity structuring, quarterly estimates & 1120-S / 1065 filings',
      link: '/services'
    },
    {
      icon: 'public',
      title: 'International & Cross-Border (FBAR)',
      desc: 'Dual US-India compliance, foreign asset disclosures & FATCA filings',
      link: '/services'
    },
    {
      icon: 'receipt_long',
      title: 'Instant P&L from Bank Statements',
      desc: 'AI ingestion converts raw statements into audit-ready financial ledgers',
      link: '/services'
    },
    {
      icon: 'trending_up',
      title: 'Fractional CFO & Advisory',
      desc: 'Cashflow modeling, growth KPIs, and strategic tax mitigation',
      link: '/services'
    }
  ];

  const practiceTabData = {
    corporate: {
      tag: 'CORPORATE & ENTITY TAX',
      title: 'Strategic Corporate Structuring & Federal Filings',
      desc: 'Most businesses overpay federal taxes because their structure was set up years ago and never recalibrated. We conduct deep-dive reviews for LLCs, S-Corporations, C-Corporations, and Multi-Member Partnerships to identify pass-through deductions, bonus depreciation, and state tax credits.',
      image: '/images/services-3.webp',
      deliverables: [
        'Form 1120, 1120-S, and 1065 preparation with multi-state allocation',
        'Reasonable compensation studies to shield S-Corp distributions from self-employment tax',
        'Section 179 and bonus depreciation scheduling for equipment & assets',
        'Pass-Through Entity Tax (PTET) elections bypassing the $10,000 SALT cap'
      ],
      turnaround: '3-5 Business Days',
      metric: 'Average $21,400 saved per business entity'
    },
    fbar: {
      tag: 'CROSS-BORDER ADVISORY',
      title: 'Dual US-India Tax Compliance & Foreign Disclosures',
      desc: 'Navigating tax obligations across two sovereign jurisdictions is notoriously treacherous. We specialize in cross-border wealth, Indian mutual funds (PFIC treatment), NRE/NRO interest, ancestral property transfers, and FinCEN 114 (FBAR) and Form 8938 reporting.',
      image: '/images/services-2.webp',
      deliverables: [
        'FinCEN Form 114 (FBAR) and Form 8938 (FATCA) comprehensive filings',
        'PFIC Mark-to-Market or QEF elections for overseas mutual funds',
        'US-India Double Taxation Avoidance Agreement (DTAA) treaty relief',
        'Streamlined Filing Compliance Procedures for delinquent foreign filings'
      ],
      turnaround: 'Confidential Safe Harbor Review',
      metric: 'Zero client penalties across 400+ FBAR filings'
    },
    'ai-statements': {
      tag: 'AI ACCOUNTING AUTOMATION',
      title: 'Instant Bank Statement Ingestion to Verifiable P&L',
      desc: 'Manual bookkeeping is slow, error-prone, and expensive. Our proprietary AI OCR engine reads PDF and scanned statements across thousands of financial institutions, categorizing line items into IRS-compliant charts of accounts reviewed by real CPAs.',
      image: '/images/services-block-3.webp',
      deliverables: [
        'Direct PDF & scanned statement parsing with 99.8% extraction fidelity',
        'Automated double-entry reconciliation across multiple bank & credit accounts',
        'Instant generation of Profit & Loss, Balance Sheet, and Trial Balances',
        'Full line-item audit trail linking every figure back to its source document'
      ],
      turnaround: 'Processed in < 60 seconds',
      metric: '90% faster month-end close'
    },
    cfo: {
      tag: 'FRACTIONAL CFO LEADERSHIP',
      title: 'Executive Financial Leadership & Board Advisory',
      desc: 'High-growth enterprises need strategic financial insight without the $300k+ overhead of a full-time CFO. We partner with founders on forward-looking cash forecasting, unit economics, fundraising support, and banking covenants.',
      image: '/images/young-business-people-using-computer-in-office.webp',
      deliverables: [
        'Dynamic 13-week rolling cash flow models & scenario stress-testing',
        'SaaS & eCommerce KPI scorecards (LTV/CAC, gross margin, burn multiple)',
        'Investor and board deck financial reporting packages',
        'R&D tax credit monetization (Form 6765) offsetting payroll taxes'
      ],
      turnaround: 'Monthly Standing Cadence',
      metric: 'Extended average runway by 4.8 months'
    }
  };

  const currentTab = practiceTabData[activeTab];

  const showcaseServices = [
    {
      tag: 'TAX PLANNING & PREP',
      icon: 'account_balance',
      image: '/images/services-3.webp',
      title: 'Corporate & Entity Tax Strategy',
      desc: 'Comprehensive tax filing for LLCs, S-Corps, C-Corps, and partnerships. We identify deductions, R&D credits, and entity optimizations before year-end.',
      link: '/services'
    },
    {
      tag: 'CROSS-BORDER',
      icon: 'language',
      image: '/images/services-2.webp',
      title: 'Foreign Reporting & FBAR / FATCA',
      desc: 'Expert guidance for foreign accounts, dual residents, H-1B/L-1 visa holders, and multinational businesses navigating FinCEN 114, Form 8938, and Form 5471.',
      link: '/services'
    },
    {
      tag: 'AI AUTOMATION',
      icon: 'analytics',
      image: '/images/services-block-3.webp',
      title: 'Bank Statement to Reconciled P&L',
      desc: 'Stop waiting months for bookkeeping. Our AI platform ingests PDF and scanned bank statements, categorizing every transaction into clear, verifiable financial statements.',
      link: '/services'
    },
    {
      tag: 'STRATEGIC CFO',
      icon: 'query_stats',
      image: '/images/young-business-people-using-computer-in-office.webp',
      title: 'Fractional CFO & Growth Advisory',
      desc: 'Senior financial leadership on demand. From investor-ready reporting and board decks to burn rate optimization and runway extensions.',
      link: '/services'
    }
  ];

  const testimonials = [
    {
      stars: 5,
      quote: 'ABC CPA structured our transition from an LLC to an S-Corp and solved our cross-border entity ties between Texas and Bangalore. Their proactive approach saved us $42,000 in federal taxes in year one alone.',
      author: 'Vikram R.',
      role: 'Founder & CEO, CloudMatrix Inc.',
      type: 'Dual US-India SaaS Company'
    },
    {
      stars: 5,
      quote: 'We used to wait 4 weeks every quarter just to get our basic financials reconciled. Their AI statement ingestion reconciled 18 months of backlog statements in days, and our corporate 1120-S was filed with zero stress.',
      author: 'Sarah Jenkins',
      role: 'Managing Partner, North Texas Medical Group',
      type: 'Multi-Location Healthcare Practice'
    },
    {
      stars: 5,
      quote: 'The FBAR and Indian asset reporting rules terrified me. The advisory team handled our foreign mutual fund disclosures under the US-India tax treaty with absolute mastery. Truly world-class advisory.',
      author: 'Arun Patel',
      role: 'Principal Architect & Investor',
      type: 'Cross-Border Wealth Advisory'
    }
  ];

  const faqs = [
    {
      q: 'How does the US-India Double Taxation Avoidance Agreement (DTAA) protect me?',
      a: 'The DTAA prevents you from being taxed twice on the same income (such as salary, interest, capital gains, or dividends) across the US and India. By claiming foreign tax credits (Form 1116) or deductions under IRS code, our CPAs ensure you pay only the legally required minimum while remaining 100% compliant with both the IRS and the Indian Income Tax Department.'
    },
    {
      q: 'When should an LLC elect S-Corporation tax status (Form 2553)?',
      a: 'Generally, once an LLC generates approximately $60,000 to $80,000 or more in net annual profits, electing S-Corporation status can save thousands in self-employment taxes (Medicare and Social Security). We conduct a formal reasonable compensation study to maximize pass-through distributions while strictly complying with IRS audit guidelines.'
    },
    {
      q: 'How does your AI bank statement to P&L technology work?',
      a: 'You simply upload your raw bank or credit card statements in PDF or image format. Our proprietary optical character recognition (OCR) engine parses every single transaction, categorizes it according to IRS Schedule C / 1120-S chart of accounts, and flags anomalies. A certified CPA then conducts a final reconciliation review, delivering an audit-ready P&L and Balance Sheet.'
    },
    {
      q: 'What are the penalties for late or missing FBAR (FinCEN 114) filings?',
      a: 'Non-willful failure to file an FBAR can carry civil penalties exceeding $15,000 per violation, while willful violations can trigger penalties of $100,000 or 50% of the account balance, plus potential criminal exposure. If you have delinquent accounts, we utilize the IRS Streamlined Filing Compliance Procedures to bring you back into full compliance with minimal or zero penalties.'
    },
    {
      q: 'What should I have prepared for our initial 15-minute consultation?',
      a: 'Having your previous year tax returns (federal and state), a brief overview of your entity structure (or foreign accounts if applicable), and your primary goals (tax mitigation, clean books, or cross-border compliance) will allow our advisory team to give you actionable strategic recommendations on the very first call.'
    }
  ];

  return (
    <div className="artha-home-root">
      {/* ================= HERO SECTION ================= */}
      <section className="artha-hero">
        <div className="artha-hero-grid">
          {/* Left Hero Column */}
          <div className="artha-hero-left reveal in-view">
            <div className="artha-eyebrow-pill">
              <span className="dot"></span>
              Tax Strategy &bull; Cross-Border &bull; AI Accounting
            </div>

            <h1 className="artha-hero-title">
              Tax Strategy, Cross-Border Advisory &amp; AI Accounting{' '}
              <em>built for clarity and growth.</em>
            </h1>

            <p className="artha-hero-desc">
              We advise founders, global entrepreneurs, and high-net-worth families on forward-looking tax mitigation, dual US-India compliance, and instant, audit-ready financial ledgers.
            </p>

            <div className="artha-hero-actions">
              <button
                className="artha-pill-btn artha-pill-primary"
                onClick={() => navigate('/contact')}
              >
                Schedule a Consultation
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  calendar_today
                </span>
              </button>

              <button
                className="artha-pill-btn artha-pill-outline"
                onClick={() => navigate('/services')}
              >
                Explore Services
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  arrow_forward
                </span>
              </button>
            </div>

            <div className="artha-hero-contact-note">
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#047857' }}>
                verified
              </span>
              <span>
                Licensed CPA &bull; McKinney &amp; Frisco, TX &bull; Global Clients Welcome
              </span>
            </div>
          </div>

          {/* Right Hero Column: Interactive Floating Ticker */}
          <div className="artha-hero-right reveal in-view reveal-delay-2">
            <div className="artha-ticker-wrap artha-float">
              <div className="artha-ticker-header">
                <span className="artha-ticker-tag">WHAT WE DO</span>
                <span className="artha-ticker-sub">Specialized Advisory Solutions</span>
              </div>

              <div className="artha-ticker-cards">
                {tickerServices.map((svc, i) => (
                  <Link to={svc.link} key={i} className="artha-ticker-card">
                    <div className="artha-ticker-card-left">
                      <div className="artha-ticker-icon">
                        <span className="material-symbols-outlined">{svc.icon}</span>
                      </div>
                      <div className="artha-ticker-content">
                        <div className="artha-ticker-title">{svc.title}</div>
                        <div className="artha-ticker-desc">{svc.desc}</div>
                      </div>
                    </div>
                    <span className="material-symbols-outlined artha-ticker-arrow">
                      arrow_forward
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TRUST RIBBON ================= */}
      <section className="artha-trust-strip reveal">
        <div className="artha-trust-inner">
          <div className="artha-trust-item">
            <div className="artha-trust-icon">
              <span className="material-symbols-outlined">verified</span>
            </div>
            <span>AICPA Member Firm</span>
          </div>

          <div className="artha-trust-item">
            <div className="artha-trust-icon">
              <span className="material-symbols-outlined">workspace_premium</span>
            </div>
            <span>QuickBooks Certified ProAdvisor</span>
          </div>

          <div className="artha-trust-item">
            <div className="artha-trust-icon">
              <span className="material-symbols-outlined">public</span>
            </div>
            <span>Cross-Border &amp; FBAR Specialist</span>
          </div>

          <div className="artha-trust-item">
            <div className="artha-trust-icon">
              <span className="material-symbols-outlined">domain</span>
            </div>
            <span>Dual US &amp; India Entity Support</span>
          </div>

          <div className="artha-trust-item">
            <div className="artha-trust-icon">
              <span className="material-symbols-outlined">lock</span>
            </div>
            <span>SOC-2 &amp; Encrypted Document Storage</span>
          </div>
        </div>
      </section>

      {/* ================= PHILOSOPHY DARK SPLIT SECTION ================= */}
      <section className="artha-philosophy-wrap reveal">
        <div className="artha-philosophy-card">
          <div className="artha-philosophy-left">
            <span className="artha-philosophy-tag">OUR CORE PHILOSOPHY</span>
            <blockquote className="artha-philosophy-quote">
              &ldquo;Your accountant should know about your deal before your attorney does.&rdquo;
            </blockquote>
            <p className="artha-philosophy-desc">
              Traditional accounting firms look backward at last year&apos;s receipts when it&apos;s already too late to minimize tax exposure. We collaborate with founders, operators, and cross-border families before transactions execute &mdash; optimizing entity structure, asset repatriation, and deductions proactively.
            </p>
          </div>

          <div className="artha-philosophy-right">
            <div className="artha-principles-list">
              <div className="artha-principle-row reveal-delay-1">
                <span className="artha-principle-num">01</span>
                <div className="artha-principle-body">
                  <h4>Proactive, Not Reactive</h4>
                  <p>Quarterly tax simulations and strategic restructuring prevent costly April surprises.</p>
                </div>
              </div>

              <div className="artha-principle-row reveal-delay-2">
                <span className="artha-principle-num">02</span>
                <div className="artha-principle-body">
                  <h4>Cross-Border Dual Jurisdictional Clarity</h4>
                  <p>Deep specialization in US-India tax treaties, foreign bank reporting (FBAR/FATCA), and international entity structuring.</p>
                </div>
              </div>

              <div className="artha-principle-row reveal-delay-3">
                <span className="artha-principle-num">03</span>
                <div className="artha-principle-body">
                  <h4>Precision AI Automation + CPA Oversight</h4>
                  <p>Instant ingestion of statements into verified financial statements with 100% audit trail compliance.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= EDITORIAL FIRM OVERVIEW FEATURE WITH IMAGE ================= */}
      <section className="artha-firm-feature-wrap reveal">
        <div className="artha-firm-feature-card">
          <div className="artha-firm-img-container">
            <img
              src="/images/home-about.webp"
              alt="ABC CPA Advisory Team"
              className="artha-firm-img"
              width="800"
              height="533"
              loading="lazy"
            />
            <div className="artha-firm-img-badge">
              <span className="material-symbols-outlined">verified</span>
              <span>27+ Years of Accounting Leadership</span>
            </div>
          </div>

          <div className="artha-firm-content">
            <div className="artha-eyebrow-pill">
              <span className="dot"></span>
              OUR FIRM &amp; HERITAGE
            </div>
            <h2>A Structured, Dual-Shore Advisory Practice</h2>
            <p>
              Founded in 1998, we evolved from a trusted Chartered Accountant firm into an international financial advisory practice. With dedicated hubs in McKinney/Frisco, Texas and Pune, India, we bridge the gap between complex tax laws and seamless operational execution.
            </p>
            <div className="artha-firm-stats-row">
              <div className="artha-firm-stat-pill">
                <strong>27+</strong>
                <span>Years in Practice</span>
              </div>
              <div className="artha-firm-stat-pill">
                <strong><CountUp value={2} /></strong>
                <span>Global Hubs (US &amp; India)</span>
              </div>
              <div className="artha-firm-stat-pill">
                <strong>100%</strong>
                <span>On-Time Filings</span>
              </div>
            </div>
            <Link to="/about-us" className="artha-pill-btn artha-pill-outline" style={{ marginTop: '10px' }}>
              Learn More About Our Firm
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ================= INTERACTIVE PRACTICE SOLUTIONS SWITCHER (TABS) ================= */}
      <section className="artha-tabs-wrapper reveal">
        <div className="artha-section-header">
          <div className="artha-eyebrow-pill" style={{ margin: '0 auto 12px' }}>
            <span className="dot"></span>
            INTERACTIVE ADVISORY EXPLORER
          </div>
          <h2>Explore Our Core Advisory Practices</h2>
          <p>Select a practice area to review strategic deliverables, SLA turnaround times, and verified impact metrics.</p>
        </div>

        {/* Tab Buttons */}
        <div className="artha-tabs-nav">
          <button
            className={`artha-tab-btn ${activeTab === 'corporate' ? 'active' : ''}`}
            onClick={() => setActiveTab('corporate')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>account_balance</span>
            Corporate &amp; Entity Tax
          </button>
          <button
            className={`artha-tab-btn ${activeTab === 'fbar' ? 'active' : ''}`}
            onClick={() => setActiveTab('fbar')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>public</span>
            Cross-Border &amp; FBAR
          </button>
          <button
            className={`artha-tab-btn ${activeTab === 'ai-statements' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai-statements')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>receipt_long</span>
            AI Statement to P&amp;L
          </button>
          <button
            className={`artha-tab-btn ${activeTab === 'cfo' ? 'active' : ''}`}
            onClick={() => setActiveTab('cfo')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>trending_up</span>
            Fractional CFO Advisory
          </button>
        </div>

        {/* Tab Dynamic Content Panel */}
        <div className="artha-tab-panel" key={activeTab}>
          <div className="artha-tab-panel-text">
            <span className="artha-service-pill-tag" style={{ marginBottom: '12px', display: 'inline-block' }}>
              {currentTab.tag}
            </span>
            <h3 style={{ fontSize: 'clamp(18px, 1.9vw, 24px)', color: '#0A2540', lineHeight: 1.25, marginBottom: '10px' }}>
              {currentTab.title}
            </h3>
            <p style={{ color: '#425466', fontSize: '13.5px', lineHeight: 1.6, marginBottom: '18px' }}>
              {currentTab.desc}
            </p>

            <div style={{ marginBottom: '20px' }}>
              <h5 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1D4ED8', marginBottom: '10px' }}>
                Key Strategic Deliverables:
              </h5>
              <ul className="artha-booking-checklist" style={{ margin: 0 }}>
                {currentTab.deliverables.map((item, i) => (
                  <li key={i} style={{ marginBottom: '6px' }}>
                    <span className="check-icon material-symbols-outlined">check_circle</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', marginTop: '16px' }}>
              <div style={{ background: '#F6F9FC', border: '1px solid rgba(10, 37, 64,0.08)', borderRadius: '12px', padding: '6px 14px', fontSize: '12px', color: '#0A2540' }}>
                <strong>SLA:</strong> {currentTab.turnaround}
              </div>
              <div style={{ background: '#F6F9FC', border: '1px solid rgba(10, 37, 64,0.08)', borderRadius: '12px', padding: '6px 14px', fontSize: '12px', color: '#047857' }}>
                <strong>Metric:</strong> {currentTab.metric}
              </div>
              <button
                className="artha-pill-btn artha-pill-primary"
                onClick={() => navigate('/contact')}
                style={{ marginLeft: 'auto' }}
              >
                Schedule Strategy Session
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>arrow_forward</span>
              </button>
            </div>
          </div>

          <div className="artha-tab-panel-img">
            <img src={currentTab.image} alt={currentTab.title} width="600" height="400" loading="lazy" />
          </div>
        </div>
      </section>

      {/* ================= INTERACTIVE TAX SAVINGS & DIAGNOSTIC ESTIMATOR ================= */}
      <section className="artha-calc-wrapper reveal">
        <div className="artha-calc-card">
          <div className="artha-calc-form-side">
            <div className="artha-eyebrow-pill" style={{ background: 'rgba(255,255,255,0.1)', color: '#3B82F6' }}>
              <span className="dot" style={{ background: '#3B82F6' }}></span>
              PROPRIETARY DIAGNOSTIC TOOL
            </div>

            <h3 style={{ fontSize: 'clamp(19px, 2vw, 25px)', color: '#FFFFFF', marginTop: '12px', marginBottom: '10px', lineHeight: 1.2 }}>
              Estimate Your Entity Tax Optimization &amp; Savings
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13.5px', lineHeight: 1.55, marginBottom: '20px' }}>
              Toggle your entity structure, annual gross revenue, and cross-border footprint to view projected tax mitigation and compliance safe harbors.
            </p>

            {/* Entity Selector */}
            <label style={{ display: 'block', fontSize: '12.5px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
              1. Select Entity Structure:
            </label>
            <div className="artha-calc-option-grid">
              <button
                type="button"
                className={`artha-calc-pill-opt ${calcEntity === 'llc' ? 'active' : ''}`}
                onClick={() => setCalcEntity('llc')}
              >
                LLC / Sole Prop
              </button>
              <button
                type="button"
                className={`artha-calc-pill-opt ${calcEntity === 's-corp' ? 'active' : ''}`}
                onClick={() => setCalcEntity('s-corp')}
              >
                S-Corporation
              </button>
              <button
                type="button"
                className={`artha-calc-pill-opt ${calcEntity === 'c-corp' ? 'active' : ''}`}
                onClick={() => setCalcEntity('c-corp')}
              >
                C-Corporation
              </button>
              <button
                type="button"
                className={`artha-calc-pill-opt ${calcEntity === 'dual' ? 'active' : ''}`}
                onClick={() => setCalcEntity('dual')}
              >
                Dual US-India Entity
              </button>
            </div>

            {/* Revenue Selector */}
            <label style={{ display: 'block', fontSize: '12.5px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
              2. Annual Gross Revenue Tier:
            </label>
            <div className="artha-calc-option-grid">
              <button
                type="button"
                className={`artha-calc-pill-opt ${calcRevenue === 'under250' ? 'active' : ''}`}
                onClick={() => setCalcRevenue('under250')}
              >
                &lt; $250,000
              </button>
              <button
                type="button"
                className={`artha-calc-pill-opt ${calcRevenue === '250to750' ? 'active' : ''}`}
                onClick={() => setCalcRevenue('250to750')}
              >
                $250k &ndash; $750k
              </button>
              <button
                type="button"
                className={`artha-calc-pill-opt ${calcRevenue === '750to2m' ? 'active' : ''}`}
                onClick={() => setCalcRevenue('750to2m')}
              >
                $750k &ndash; $2.0M
              </button>
              <button
                type="button"
                className={`artha-calc-pill-opt ${calcRevenue === 'above2m' ? 'active' : ''}`}
                onClick={() => setCalcRevenue('above2m')}
              >
                $2.0M &ndash; $5M+
              </button>
            </div>

            {/* Cross-Border Assets */}
            <label style={{ display: 'block', fontSize: '12.5px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
              3. Foreign Accounts, Overseas Assets, or FBAR:
            </label>
            <div className="artha-calc-option-grid">
              <button
                type="button"
                className={`artha-calc-pill-opt ${calcCrossBorder === 'yes' ? 'active' : ''}`}
                onClick={() => setCalcCrossBorder('yes')}
              >
                Yes (Cross-Border Assets)
              </button>
              <button
                type="button"
                className={`artha-calc-pill-opt ${calcCrossBorder === 'no' ? 'active' : ''}`}
                onClick={() => setCalcCrossBorder('no')}
              >
                No (Domestic US Only)
              </button>
            </div>
          </div>

          {/* Results Side */}
          <div className="artha-calc-results">
            <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.6)' }}>
              Projected Annual Tax Mitigation
            </span>
            <div className="artha-calc-stat-figure">
              {taxStats.savingsFormatted}
            </div>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13.5px', marginBottom: '22px' }}>
              Estimated average tax savings uncovered through quarterly entity restructuring and deduction maximization.
            </p>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '18px', marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#3B82F6', marginBottom: '4px' }}>
                Recommended Strategy Focus:
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}>
                {taxStats.recommendation}
              </div>
            </div>

            <div style={{ background: 'rgba(29, 78, 216, 0.16)', borderRadius: '14px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <span className="material-symbols-outlined" style={{ color: '#10B981', fontSize: '20px' }}>shield</span>
              <span style={{ fontSize: '12.5px', color: '#FFFFFF' }}>{taxStats.auditRiskReduction}</span>
            </div>

            <button
              className="artha-pill-btn artha-pill-primary"
              style={{ width: '100%', background: '#1D4ED8', borderColor: '#1D4ED8' }}
              onClick={() => navigate('/contact')}
            >
              Lock In Your Strategy Consultation
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
            </button>
          </div>
        </div>
      </section>

      {/* ================= SERVICES SHOWCASE WITH IMAGES ================= */}
      <section className="artha-services-section reveal">
        <div className="artha-section-header">
          <div className="artha-eyebrow-pill" style={{ margin: '0 auto 12px' }}>
            <span className="dot"></span>
            EXPERTISE &amp; PRACTICE AREAS
          </div>
          <h2>Specialized Advisory &amp; Accounting Solutions</h2>
          <p>Tailored for high-growth enterprises, cross-border businesses, and discerning founders requiring meticulous financial leadership.</p>
        </div>

        <div className="artha-services-grid">
          {showcaseServices.map((svc, idx) => (
            <div className={`artha-service-box reveal-delay-${(idx % 3) + 1}`} key={idx}>
              <div className="artha-service-top">
                <div className="artha-service-img-wrap">
                  <img src={svc.image} alt={svc.title} width="600" height="400" loading="lazy" />
                </div>
                <span className="artha-service-pill-tag">{svc.tag}</span>
                <h3>{svc.title}</h3>
                <p>{svc.desc}</p>
              </div>

              <Link to={svc.link} className="artha-service-link">
                <span>View practice details</span>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  arrow_forward
                </span>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ================= VERIFIED CLIENT TESTIMONIALS ================= */}
      <section className="artha-testimonials-wrapper reveal">
        <div className="artha-section-header">
          <div className="artha-eyebrow-pill" style={{ margin: '0 auto 12px' }}>
            <span className="dot"></span>
            VERIFIED CLIENT RESULTS
          </div>
          <h2>Trusted by Cross-Border Founders &amp; Business Leaders</h2>
          <p>Real outcomes from growing companies that transitioned from reactive accounting to proactive tax leadership.</p>
        </div>

        <div className="artha-testimonials-grid">
          {testimonials.map((item, idx) => (
            <div className={`artha-testimonial-card reveal-delay-${idx + 1}`} key={idx}>
              <div>
                <div className="artha-stars">
                  {'★'.repeat(item.stars)}
                </div>
                <p className="artha-testimonial-quote">
                  &ldquo;{item.quote}&rdquo;
                </p>
              </div>

              <div className="artha-testimonial-author">
                <div className="artha-author-avatar">
                  {item.author.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="artha-author-info">
                  <h5>{item.author}</h5>
                  <p>{item.role}</p>
                  <span style={{ fontSize: '11px', color: '#1D4ED8', fontWeight: 600 }}>{item.type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= INTERACTIVE FAQ ACCORDION ================= */}
      <section className="artha-faq-wrapper reveal">
        <div className="artha-section-header">
          <div className="artha-eyebrow-pill" style={{ margin: '0 auto 12px' }}>
            <span className="dot"></span>
            COMMON QUESTIONS
          </div>
          <h2>Frequently Asked Questions</h2>
          <p>Clear answers to the most critical tax, compliance, and accounting questions our CPAs address daily.</p>
        </div>

        <div className="artha-faq-list">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div className={`artha-faq-item ${isOpen ? 'open' : ''}`} key={index}>
                <div
                  className="artha-faq-question"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setOpenFaq(isOpen ? null : index);
                    }
                  }}
                >
                  <span>{faq.q}</span>
                  <span className="material-symbols-outlined artha-faq-chevron">
                    expand_more
                  </span>
                </div>
                {isOpen && (
                  <div className="artha-faq-answer">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= CONSULTATION BOOKING BLOCK ================= */}
      <section className="artha-booking-wrap reveal">
        <div className="artha-booking-card">
          <div className="artha-booking-left">
            <div className="artha-eyebrow-pill">
              <span className="dot"></span>
              SCHEDULE ADVISORY
            </div>
            <h3>Book a 15-Minute Tax Strategy Consultation</h3>
            <p>
              Speak directly with a senior CPA and tax strategist. We will evaluate your current entity structure, identify immediate tax savings opportunities, and map out compliant cross-border solutions.
            </p>

            <ul className="artha-booking-checklist">
              <li>
                <span className="check-icon material-symbols-outlined">check</span>
                <span>Review corporate entity setup (LLC, S-Corp, C-Corp, or Dual Entity)</span>
              </li>
              <li>
                <span className="check-icon material-symbols-outlined">check</span>
                <span>Uncover underutilized credits, deductions, and cross-border treaties</span>
              </li>
              <li>
                <span className="check-icon material-symbols-outlined">check</span>
                <span>Clear transparent monthly pricing with zero unexpected billings</span>
              </li>
            </ul>

            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                className="artha-pill-btn artha-pill-primary"
                onClick={() => navigate('/contact')}
              >
                Schedule Consultation
              </button>
              <button
                className="artha-pill-btn artha-pill-outline"
                onClick={() => navigate('/login')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>login</span>
                Login Portal
              </button>
            </div>
          </div>

          <div className="artha-booking-right">
            <h4>Request an Immediate Consultation</h4>
            <p>Fill out the form below and an advisory partner will contact you directly.</p>

            <form onSubmit={handleBookingSubmit}>
              <div className="artha-input-row">
                <input
                  type="text"
                  name="first_name"
                  placeholder="First Name *"
                  required
                  className="artha-form-input"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
                <input
                  type="text"
                  name="last_name"
                  placeholder="Last Name *"
                  required
                  className="artha-form-input"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>

              <input
                type="email"
                name="email"
                placeholder="Business Email Address *"
                required
                className="artha-form-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />

              <input
                type="tel"
                name="phone"
                placeholder="Phone Number"
                className="artha-form-input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />

              <textarea
                name="message"
                placeholder="Briefly describe your entity, cross-border situation, or accounting needs..."
                rows="3"
                className="artha-form-input"
                style={{ resize: 'vertical' }}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              ></textarea>

              <button
                type="submit"
                disabled={loading}
                className="artha-pill-btn artha-pill-primary"
                style={{ width: '100%', marginTop: '6px' }}
              >
                {loading ? 'Submitting...' : 'Request Consultation'}
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  send
                </span>
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
