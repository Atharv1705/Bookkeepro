import { useEffect, useRef, useState } from 'react';

// Ledger-style ticking counter. Counts from the previous value to the new one
// once visible; reduced-motion users get the final number immediately. The
// animated text is aria-hidden and the final value is exposed to screen readers.
export default function CountUp({ value, duration = 1100, prefix = '', suffix = '' }) {
  const target = Number(value);
  const valid = Number.isFinite(target);
  const [shown, setShown] = useState(0);
  const ref = useRef(null);
  const from = useRef(0);

  useEffect(() => {
    if (!valid) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || target === from.current) { setShown(target); from.current = target; return undefined; }
    let raf = 0;
    let started = false;
    const run = () => {
      started = true;
      const start = performance.now();
      const a = from.current;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 4);               // easeOutQuart
        setShown(Math.round(a + (target - a) * eased));
        if (t < 1) raf = requestAnimationFrame(tick); else from.current = target;
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting && !started) { io.disconnect(); run(); } }, { threshold: 0.3 });
    if (ref.current) io.observe(ref.current);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [target, valid, duration]);

  if (!valid) return <span>{value}</span>;
  return (
    <span ref={ref}>
      <span aria-hidden="true">{prefix}{shown.toLocaleString('en-US')}{suffix}</span>
      <span className="sr-only">{prefix}{target.toLocaleString('en-US')}{suffix}</span>
    </span>
  );
}
