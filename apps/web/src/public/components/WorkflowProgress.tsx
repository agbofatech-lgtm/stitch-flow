import { useEffect, useState } from 'react';
import { WORKFLOW_STAGES } from '../workflow';

/** Phase 12 — lightweight scroll-progress rail (native scroll, IO-driven). */
export function WorkflowProgress() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id.replace('stage-', ''));
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    for (const s of WORKFLOW_STAGES) {
      const el = document.getElementById(`stage-${s.id}`);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, []);

  return (
    <nav aria-label="Workflow progress" className="fixed right-5 top-1/2 z-sticky hidden -translate-y-1/2 lg:block">
      <ol className="flex flex-col items-center gap-3">
        {WORKFLOW_STAGES.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              aria-label={`Go to ${s.title} section`}
              aria-current={active === s.id ? 'true' : undefined}
              onClick={() => document.getElementById(`stage-${s.id}`)?.scrollIntoView({ block: 'start' })}
              className={`block h-3 w-3 rounded-full transition-all duration-micro ease-standard focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                active === s.id ? 'scale-125 bg-gold' : 'bg-grey hover:bg-gold-light'
              }`}
            />
          </li>
        ))}
      </ol>
    </nav>
  );
}
