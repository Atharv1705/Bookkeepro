// Dynamic-UI runtime (tiny, dependency-free, CSP-safe: only classList + CSSOM property writes).
//  - html.motion        : opts in to scroll-reveal hiding (never set for reduced-motion users)
//  - html[data-scrolled]: navbar / header react after 24px of scroll
//  - --scroll           : 0..1 page progress, drives the brass progress rule
//  - --mx / --my        : pointer position inside cards, drives the hover spotlight
const SPOT = '.stat-card, .user-card, .service-card, .card, .artha-portal-card, .artha-vault-card, .artha-ticker-card';

export function initMotion() {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) root.classList.add('motion');

  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  let ticking = false;
  const update = () => {
    const max = root.scrollHeight - root.clientHeight;
    const y = window.scrollY || root.scrollTop || 0;
    root.style.setProperty('--scroll', max > 0 ? (y / max).toFixed(4) : '0');
    root.toggleAttribute('data-scrolled', y > 24);
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();

  if (!reduce && window.matchMedia('(hover: hover)').matches) {
    let raf = 0;
    document.addEventListener('pointermove', (e) => {
      const el = e.target instanceof Element ? e.target.closest(SPOT) : null;
      if (!el) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    }, { passive: true });
  }
}
