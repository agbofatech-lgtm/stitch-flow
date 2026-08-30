import { useInView } from '../hooks/useInView';

/** Stage 11 · ACT III — the intelligence, told honestly: deterministic systems
 *  hold trusted facts, contextual intelligence advises, the tailor decides.
 *  (Public expression of the Stage 9 advisory boundary — no autonomy claims.) */
const PILLARS = [
  { title: 'Trusted facts', body: 'Measurements, requirements and order snapshots live in one exact system of record. The same numbers, every time, for every garment.' },
  { title: 'Contextual advisory', body: 'Readiness checks and fit-risk notes read each order — what is measured, what is missing, what changed — and say so plainly.' },
  { title: 'Your decision', body: 'Advisory explains and recommends. It never changes a measurement, a fabric or a stage for you. Every move is yours to make.' },
];

export function IntelligenceSection() {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <section ref={ref} data-landing="intelligence" aria-labelledby="intelligence-title" className="border-y border-line bg-surface/60">
      <div className={`mx-auto max-w-4xl px-4 py-24 sm:px-6 ${inView ? 'sf-rise-enter' : 'opacity-0'}`}>
        <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-gold-dark">The intelligence</p>
        <h2 id="intelligence-title" className="mt-4 text-center font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Intelligence that knows when not to decide for you.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-center text-base text-ink-soft">
          StitchFlow keeps the two kinds of intelligence apart on purpose: exact systems that hold
          the truth, and advisory intelligence that helps you read it.
        </p>
        <p aria-label="Craft plus measurement plus trusted systems plus contextual advisory lead to confident decisions"
          className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
          <span>Craft</span><span aria-hidden="true" className="text-gold">+</span>
          <span>Measurement</span><span aria-hidden="true" className="text-gold">+</span>
          <span>Trusted systems</span><span aria-hidden="true" className="text-gold">+</span>
          <span>Contextual advisory</span>
          <span aria-hidden="true" className="text-gold">→</span>
          <span className="rounded-full border border-gold/60 px-3 py-1 text-ink">Confident decisions</span>
        </p>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.title} className="border-t-2 border-gold/70 pt-4">
              <h3 className="font-display text-base font-semibold text-ink">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
