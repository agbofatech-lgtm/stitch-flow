import { useInView } from '../hooks/useInView';

/** Phase 12 — the problem the pipeline solves; leads into Measure. */
export function NarrativeIntro() {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <section ref={ref} aria-label="Why StitchFlow" className="bg-charcoal text-ivory">
      <div className={`mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 ${inView ? 'sf-rise-enter' : 'opacity-0'}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold-light">The craft is whole. The workflow isn’t.</p>
        <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight sm:text-4xl">
          Measurements live on paper. Designs live in sketches. Patterns live in one notebook.
          Orders live in a phone call.
        </h2>
        <p className="mt-6 text-base text-ivory/70">
          StitchFlow connects the five stages of a tailoring studio into one continuous,
          precise flow — so nothing is re-measured, re-drawn or re-asked.
        </p>
      </div>
    </section>
  );
}
