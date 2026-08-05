// Lightweight scroll-reveal: watches for elements with the `.reveal` class
// (added throughout the marketing pages) and adds `.in-view` once they enter
// the viewport. Re-scans on DOM mutation so it keeps working across route
// changes in the SPA without needing per-page wiring.
let observer;

function ensureObserver() {
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );
  return observer;
}

function scan() {
  const obs = ensureObserver();
  document.querySelectorAll('.reveal:not(.in-view)').forEach((el) => obs.observe(el));
}

export function initScrollReveal() {
  if (typeof window === 'undefined') return;
  scan();
  const mo = new MutationObserver(() => scan());
  mo.observe(document.getElementById('root') || document.body, {
    childList: true,
    subtree: true,
  });
}
