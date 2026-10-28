import os

footer_path = 'src/components/Footer.jsx'
footer_content = '''import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-[var(--paper)] border-t border-[var(--border)] mt-auto relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--emerald)]/5 pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8">
          
          <div className="md:col-span-12 lg:col-span-5 flex flex-col items-start">
            <Link to="/" className="inline-block mb-6 transition-transform duration-200 hover:scale-[1.02]">
              <img src="/images/bookkeeppro-logo.webp" alt="BookKeepPro" width="190" height="64" className="h-14 w-auto object-contain" />
            </Link>
            <p className="text-[var(--ink-soft)] leading-relaxed text-[15px] max-w-sm font-medium">
              Bookkeeping, payroll and tax preparation for growing businesses - kept precise, kept compliant.
            </p>
          </div>

          <div className="md:col-span-5 lg:col-span-3 lg:col-start-7">
            <h3 className="font-display text-xl text-[var(--ink)] mb-6 tracking-wide">Navigate</h3>
            <div className="flex flex-col gap-4 text-[15px] font-medium">
              <Link to="/" className="text-[var(--ink-soft)] hover:text-[var(--emerald)] transition-colors hover:translate-x-1 duration-200 w-fit">Home</Link>
              <Link to="/about-us" className="text-[var(--ink-soft)] hover:text-[var(--emerald)] transition-colors hover:translate-x-1 duration-200 w-fit">About Us</Link>
              <Link to="/services" className="text-[var(--ink-soft)] hover:text-[var(--emerald)] transition-colors hover:translate-x-1 duration-200 w-fit">Services</Link>
              <Link to="/contact" className="text-[var(--ink-soft)] hover:text-[var(--emerald)] transition-colors hover:translate-x-1 duration-200 w-fit">Contact Us</Link>
            </div>
          </div>

          <div className="md:col-span-7 lg:col-span-3">
            <h3 className="font-display text-xl text-[var(--ink)] mb-6 tracking-wide">Reach us</h3>
            <div className="flex flex-col gap-5 text-[15px] text-[var(--ink-soft)] font-medium">
              <p className="flex items-start gap-3 group">
                <span className="material-symbols-outlined text-[var(--emerald)] text-[22px] group-hover:scale-110 transition-transform shrink-0">location_on</span>
                <span className="leading-snug">USA - 2520 Indigo Dr, McKinney, TX 75072</span>
              </p>
              <p className="flex items-start gap-3 group">
                <span className="material-symbols-outlined text-[var(--emerald)] text-[22px] group-hover:scale-110 transition-transform shrink-0">location_on</span>
                <span className="leading-snug">India - 508 White Square, Hinjewadi Road, Pune 411057</span>
              </p>
              <p className="flex items-center gap-3 group pt-1">
                <span className="material-symbols-outlined text-[var(--brass)] text-[22px] group-hover:scale-110 transition-transform shrink-0">mail</span>
                <a href="mailto:atharvg.aiindia@gmail.com" className="hover:text-[var(--emerald)] transition-colors">atharvg.aiindia@gmail.com</a>
              </p>
              <p className="flex items-center gap-3 group">
                <span className="material-symbols-outlined text-[var(--brass)] text-[22px] group-hover:scale-110 transition-transform shrink-0">phone</span>
                <a href="tel:+918275367267" className="hover:text-[var(--emerald)] transition-colors">+91 8275367267</a>
              </p>
            </div>
          </div>
          
        </div>
      </div>

      <div className="border-t border-[var(--border)] relative z-10 bg-[var(--paper)]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[var(--ink-soft)] font-medium">
            © {new Date().getFullYear()} Bookkeeping Business Solutions. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link to="/privacy" className="text-sm text-[var(--ink-soft)] hover:text-[var(--emerald)] transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-sm text-[var(--ink-soft)] hover:text-[var(--emerald)] transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
'''
with open(footer_path, 'w', encoding='utf-8') as f:
    f.write(footer_content)

print('Footer patched successfully.')
