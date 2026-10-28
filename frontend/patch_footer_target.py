import os

footer_path = 'src/components/Footer.jsx'
footer_content = '''import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-[var(--ink)] pt-16 pb-8 border-t-[4px] border-[var(--brass)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between gap-12">
        
        {/* Left: Brand */}
        <div className="flex flex-col max-w-[280px]">
          <Link to="/" className="mb-4 inline-block">
            <img src="/images/bookkeeppro-logo.webp" alt="BookKeepPro" className="w-[190px] h-auto opacity-90" />
          </Link>
          <p className="text-white/60 text-[14px] leading-relaxed">
            Bookkeeping, payroll and tax preparation for growing businesses - kept precise, kept compliant.
          </p>
        </div>

        {/* Right: Links */}
        <div className="flex flex-col sm:flex-row gap-16 md:gap-24">
          
          <div className="flex flex-col gap-3">
            <h3 className="text-[var(--brass)] font-mono text-[12.5px] uppercase tracking-[0.1em] font-semibold mb-2">Navigate</h3>
            <Link to="/" className="text-white/75 hover:text-white transition-colors text-[14.5px]">Home</Link>
            <Link to="/about-us" className="text-white/75 hover:text-white transition-colors text-[14.5px]">About Us</Link>
            <Link to="/services" className="text-white/75 hover:text-white transition-colors text-[14.5px]">Services</Link>
            <Link to="/contact" className="text-white/75 hover:text-white transition-colors text-[14.5px]">Contact Us</Link>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-[var(--brass)] font-mono text-[12.5px] uppercase tracking-[0.1em] font-semibold mb-2">Reach Us</h3>
            <p className="text-white/75 text-[14px]">USA - 2520 Indigo Dr, McKinney, TX 75072</p>
            <p className="text-white/75 text-[14px]">India - 508 White Square, Hinjewadi Road, Pune 411057</p>
            <a href="mailto:atharvg.aiindia@gmail.com" className="text-white/75 hover:text-white transition-colors text-[14.5px]">atharvg.aiindia@gmail.com</a>
            <a href="tel:+918275367267" className="text-white/75 hover:text-white transition-colors text-[14.5px]">+91 8275367267</a>
          </div>

        </div>
      </div>
    </footer>
  );
}
'''
with open(footer_path, 'w', encoding='utf-8') as f:
    f.write(footer_content)

print('Footer patched exactly to image.')
