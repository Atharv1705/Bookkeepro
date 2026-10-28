import os

base_path = 'src/components'

# 1. Button.jsx
button_path = os.path.join(base_path, 'Button.jsx')
button_content = '''import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  type = 'button', 
  loading = false,
  disabled = false,
  icon,
  ...props 
}) {
  const baseClass = "btn relative inline-flex items-center justify-center transition-all duration-200 active:translate-y-[1px] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--emerald)]";
  const variantClass = `btn-${variant}`;
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'xs' ? 'btn-xs px-2 py-1 text-xs' : '';
  
  return (
    <button 
      type={type} 
      className={`${baseClass} ${variantClass} ${sizeClass} ${className}`.trim()} 
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {!loading && icon && <span className="mr-2 flex items-center">{icon}</span>}
      <span className={loading ? 'opacity-0' : ''}>{children}</span>
    </button>
  );
}
'''
with open(button_path, 'w', encoding='utf-8') as f:
    f.write(button_content)

# 2. StatusChip.jsx
status_path = os.path.join(base_path, 'StatusChip.jsx')
status_content = '''import React from 'react';

export default function StatusChip({ status, note }) {
  const s = (status || 'pending').toLowerCase();
  
  let badgeClass = 'badge-yellow';
  if (s === 'approved' || s === 'filed' || s === 'verified') badgeClass = 'badge-green';
  if (s === 'rejected' || s === 'error') badgeClass = 'badge-red';
  if (s === 'sent_for_approval') badgeClass = 'badge-blue';

  const statusText = s.replace(/_/g, ' ').toUpperCase();

  return (
    <div className="flex flex-col items-start gap-1">
      <span className={`badge ${badgeClass} shadow-sm border border-black/5`}>{statusText}</span>
      {note && (
        <div className="text-xs text-[var(--error)] italic mt-1 font-medium bg-[var(--error-bg)] px-2 py-1 rounded-sm border border-[var(--error)]/20">
          Rejection Note: {note}
        </div>
      )}
    </div>
  );
}
'''
with open(status_path, 'w', encoding='utf-8') as f:
    f.write(status_content)

# 3. ConfirmModal.jsx
modal_path = os.path.join(base_path, 'ConfirmModal.jsx')
modal_content = '''import React, { useEffect } from "react";
import Button from "./Button";

function ConfirmModal({ isOpen, title, message, confirmText, cancelText, onConfirm, onCancel, isDestructive }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={onCancel}
      ></div>
      
      <div className="relative bg-[var(--card)] rounded-xl shadow-2xl border border-[var(--border)] max-w-md w-full p-6 sm:p-8 animate-fade-up" onClick={e => e.stopPropagation()}>
        {title && <h3 className="font-display text-xl text-[var(--ink)] mb-3">{title}</h3>}
        {message && (
          <div className="text-[var(--muted)] mb-8 leading-relaxed">
            {message.split('\\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                <br />
              </React.Fragment>
            ))}
          </div>
        )}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
          <Button variant="ghost" onClick={onCancel} className="w-full sm:w-auto">
            {cancelText || "Cancel"}
          </Button>
          <Button 
            variant={isDestructive ? "danger" : "primary"} 
            onClick={onConfirm}
            className="w-full sm:w-auto"
          >
            {confirmText || "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
'''
with open(modal_path, 'w', encoding='utf-8') as f:
    f.write(modal_content)

# 4. ResponsiveTable.jsx
table_path = os.path.join(base_path, 'ResponsiveTable.jsx')
table_content = '''import React from 'react';

export default function ResponsiveTable({ columns, data, keyField = 'id', renderCard }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-[var(--border)] rounded-lg bg-[var(--paper)] text-center animate-fade-up">
        <span className="material-symbols-outlined text-4xl text-[var(--muted)] mb-3 opacity-50">inventory_2</span>
        <h3 className="text-lg font-medium text-[var(--ink)] mb-1">No records found</h3>
        <p className="text-sm text-[var(--muted)]">Try adjusting your filters or upload a new document.</p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden md:block overflow-x-auto rounded-lg border border-[var(--border)] shadow-sm bg-[var(--card)] animate-fade-up">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--paper)] border-b-2 border-[var(--border)]">
              {columns.map((col, idx) => (
                <th key={idx} className="px-5 py-4 text-[13px] font-bold text-[var(--ink-soft)] uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {data.map(row => (
              <tr key={row[keyField]} className="interactive-row group">
                {columns.map((col, idx) => (
                  <td key={idx} className="px-5 py-4 text-sm text-[var(--ink)]">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden flex flex-col gap-4">
        {data.map(row => (
          <div key={row[keyField]} className="interactive-card p-5 border border-[var(--border)] rounded-xl bg-[var(--card)] animate-fade-up">
            {renderCard ? renderCard(row) : (
              <div className="flex flex-col gap-3">
                {columns.map((col, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-4 text-sm">
                    <span className="text-[var(--muted)] font-medium shrink-0">{col.label}:</span>
                    <span className="text-right font-medium text-[var(--ink)] break-words">{col.render ? col.render(row) : row[col.key]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
'''
with open(table_path, 'w', encoding='utf-8') as f:
    f.write(table_content)

# 5. Navbar.jsx
navbar_path = os.path.join(base_path, 'Navbar.jsx')
navbar_content = '''import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function Navbar({ solid = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About Us', path: '/about-us' },
    { name: 'Services', path: '/services' },
    { name: 'Contact Us', path: '/contact' }
  ];

  return (
    <div className={`navbar ${solid ? 'navbar-solid' : ''} border-b border-[var(--border)] shadow-sm bg-[var(--paper)]/95 backdrop-blur-md sticky top-0 z-40 transition-colors duration-300`}>
      <div className="nav-container max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
        <Link to="/" className="flex-shrink-0 transition-transform duration-200 hover:scale-[1.02]">
          <img id="logos" src="/images/bookkeeppro-logo.webp" alt="BookKeepPro" width="190" height="64" className="h-10 sm:h-12 w-auto" />
        </Link>

        <nav id="navMenu" className={`nav-menu ${isOpen ? 'active' : ''} md:flex items-center gap-8`}>
          {navLinks.map((link) => (
            <Link 
              key={link.path}
              to={link.path} 
              onClick={() => setIsOpen(false)}
              className={`text-[15px] font-medium transition-all duration-200 ${isActive(link.path) ? 'text-[var(--emerald)] border-b-2 border-[var(--emerald)] pb-1' : 'text-[var(--ink-soft)] hover:text-[var(--emerald)] hover:-translate-y-[1px] pb-1 border-b-2 border-transparent'}`}
            >
              {link.name}
            </Link>
          ))}

          <button className="btn btn-primary px-5 py-2 mt-4 md:mt-0 shadow-sm md:ml-4" onClick={() => navigate('/login')}>
            Sign in
          </button>
        </nav>

        <div className="hamburger md:hidden cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  );
}
'''
with open(navbar_path, 'w', encoding='utf-8') as f:
    f.write(navbar_content)

# 6. Footer.jsx
footer_path = os.path.join(base_path, 'Footer.jsx')
footer_content = '''import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-[var(--paper)] border-t border-[var(--border)] mt-auto relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--emerald)]/5 pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8">
          <div className="md:col-span-5 lg:col-span-4">
            <Link to="/" className="inline-block mb-6 transition-transform duration-200 hover:scale-[1.02]">
              <img src="/images/bookkeeppro-logo.webp" alt="BookKeepPro" width="190" height="64" className="h-12 w-auto" />
            </Link>
            <p className="text-[var(--muted)] leading-relaxed text-sm max-w-sm">
              Bookkeeping, payroll and tax preparation for growing businesses - kept precise, kept compliant.
            </p>
          </div>

          <div className="md:col-span-3 lg:col-span-2 lg:col-start-7">
            <h3 className="font-display text-lg text-[var(--ink)] mb-4 tracking-wide">Navigate</h3>
            <div className="flex flex-col gap-3 text-sm">
              <Link to="/" className="text-[var(--muted)] hover:text-[var(--emerald)] transition-colors hover:translate-x-1 duration-200">Home</Link>
              <Link to="/about-us" className="text-[var(--muted)] hover:text-[var(--emerald)] transition-colors hover:translate-x-1 duration-200">About Us</Link>
              <Link to="/services" className="text-[var(--muted)] hover:text-[var(--emerald)] transition-colors hover:translate-x-1 duration-200">Services</Link>
              <Link to="/contact" className="text-[var(--muted)] hover:text-[var(--emerald)] transition-colors hover:translate-x-1 duration-200">Contact Us</Link>
            </div>
          </div>

          <div className="md:col-span-4 lg:col-span-4">
            <h3 className="font-display text-lg text-[var(--ink)] mb-4 tracking-wide">Reach us</h3>
            <div className="flex flex-col gap-4 text-sm text-[var(--muted)]">
              <p className="flex items-start gap-3 group">
                <span className="material-symbols-outlined text-[var(--emerald)] text-[20px] group-hover:scale-110 transition-transform">location_on</span>
                <span className="leading-snug">USA - 2520 Indigo Dr, McKinney, TX 75072</span>
              </p>
              <p className="flex items-start gap-3 group">
                <span className="material-symbols-outlined text-[var(--emerald)] text-[20px] group-hover:scale-110 transition-transform">location_on</span>
                <span className="leading-snug">India - 508 White Square, Hinjewadi Road, Pune 411057</span>
              </p>
              <p className="flex items-center gap-3 mt-1 group">
                <span className="material-symbols-outlined text-[var(--brass)] text-[20px] group-hover:scale-110 transition-transform">mail</span>
                <a href="mailto:atharvg.aiindia@gmail.com" className="hover:text-[var(--emerald)] transition-colors">atharvg.aiindia@gmail.com</a>
              </p>
              <p className="flex items-center gap-3 group">
                <span className="material-symbols-outlined text-[var(--brass)] text-[20px] group-hover:scale-110 transition-transform">phone</span>
                <a href="tel:+918275367267" className="hover:text-[var(--emerald)] transition-colors">+91 8275367267</a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--border)] relative z-10 bg-[var(--paper)]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-[var(--muted)]">
            © {new Date().getFullYear()} Bookkeeping Business Solutions. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
'''
with open(footer_path, 'w', encoding='utf-8') as f:
    f.write(footer_content)

print('Phase 4 rewritten safely.')
