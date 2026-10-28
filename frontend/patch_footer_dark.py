import os

footer_path = 'src/components/Footer.jsx'
footer_content = '''import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-[var(--ink)] border-t border-[var(--ink-soft)] mt-auto relative overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10 flex flex-col lg:flex-row justify-between gap-12 lg:gap-8">
        
        {/* Brand Section */}
        <div className="flex flex-col items-start max-w-sm">
          <Link to="/" className="inline-block mb-6 transition-transform duration-200 hover:scale-[1.02] bg-white p-2 rounded-lg shadow-sm">
            <img src="/images/bookkeeppro-logo.webp" alt="BookKeepPro" width="190" height="64" className="h-12 w-auto object-contain" />
          </Link>
          <p className="text-white/70 leading-relaxed text-[15px] font-medium">
            Bookkeeping, payroll and tax preparation for growing businesses - kept precise, kept compliant.
          </p>
        </div>

        {/* Links Section */}
        <div className="flex flex-col sm:flex-row gap-12 sm:gap-24">
          
          <div className="flex flex-col min-w-[140px]">
            <h3 className="font-display text-xl text-white mb-6 tracking-wide">Navigate</h3>
            <div className="flex flex-col gap-4 text-[15px] font-medium">
              <Link to="/" className="text-white/70 hover:text-[var(--emerald)] transition-colors hover:translate-x-1 duration-200 w-fit">Home</Link>
              <Link to="/about-us" className="text-white/70 hover:text-[var(--emerald)] transition-colors hover:translate-x-1 duration-200 w-fit">About Us</Link>
              <Link to="/services" className="text-white/70 hover:text-[var(--emerald)] transition-colors hover:translate-x-1 duration-200 w-fit">Services</Link>
              <Link to="/contact" className="text-white/70 hover:text-[var(--emerald)] transition-colors hover:translate-x-1 duration-200 w-fit">Contact Us</Link>
            </div>
          </div>

          <div className="flex flex-col max-w-sm">
            <h3 className="font-display text-xl text-white mb-6 tracking-wide">Reach us</h3>
            <div className="flex flex-col gap-5 text-[15px] text-white/70 font-medium">
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

      <div className="border-t border-white/10 relative z-10 bg-[var(--ink-soft)]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/50 font-medium">
            © {new Date().getFullYear()} Bookkeeping Business Solutions. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-sm text-white/50 hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-sm text-white/50 hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
'''
with open(footer_path, 'w', encoding='utf-8') as f:
    f.write(footer_content)

print('Footer fully updated to premium dark layout.')
