import { navigate } from '@shared/router';
import { Button } from '../../components/ui/Button';
import { WORKFLOW_STAGES } from '../workflow';
import { useInView } from '../hooks/useInView';

/** Phase 12 — the narrative conclusion: recap the pipeline, then act. */
export function FinalCTASection() {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <section ref={ref} aria-labelledby="final-cta-title" className="bg-charcoal text-ivory">
      <div className={`mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 ${inView ? 'sf-rise-enter' : 'opacity-0'}`}>
        <ol aria-label="The StitchFlow pipeline" className="mb-10 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ivory/70">
          {WORKFLOW_STAGES.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2">
              <span className="rounded-full border border-ivory/25 px-3 py-1">{s.title}</span>
              {i < WORKFLOW_STAGES.length - 1 && <span aria-hidden="true" className="text-gold">→</span>}
            </li>
          ))}
        </ol>
        <h2 id="final-cta-title" className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">
          Start with StitchFlow.
        </h2>
        <p className="mt-5 text-base text-ivory/70">
          Create your account and bring your studio’s workflow into one precise system.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button variant="gold" size="lg" onClick={() => navigate('/register')}>
            Create your account
          </Button>
          <Button
            size="lg"
            className="border border-ivory/30 bg-transparent text-ivory hover:bg-ivory/10"
            onClick={() => navigate('/login')}
          >
            Sign In
          </Button>
        </div>
      </div>
    </section>
  );
}
