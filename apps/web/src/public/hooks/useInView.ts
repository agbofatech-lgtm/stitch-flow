/** Phase 12 — viewport-triggered reveal (IntersectionObserver, one-shot). */
import { useEffect, useRef, useState } from 'react';

export function useInView<T extends HTMLElement>(margin = '-12% 0px') {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            obs.disconnect();
          }
        }
      },
      { rootMargin: margin, threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [margin]);

  return { ref, inView } as const;
}
