import { useInView } from '../hooks/useInView';

/** Stage 11 · ACT II — the complexity. Real tailoring challenges the product
 *  actually addresses (measurements → garments → materials → production →
 *  payment); nothing exaggerated beyond the domain. */
export function NarrativeIntro() {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <section ref={ref} data-landing="complexity" aria-label="Why StitchFlow" className="bg-ink text-ivory">
      <div className={`mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 ${inView ? 'sf-rise-enter' : 'opacity-0'}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold-light">The complexity</p>
        <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight sm:text-4xl">
          Every measurement carries consequence.
        </h2>
        <p className="mt-6 text-base text-ivory/70">
          A measurement shapes a garment. A garment calls for material. Material becomes cutting,
          sewing, fittings. And somewhere beside all of it, an invoice waits to be settled.
        </p>
        <p className="mt-4 text-base text-ivory/70">
          When those facts live on paper, in sketchbooks and in memory, every step re-asks the last one.
          StitchFlow keeps them connected to the same garment journey — so nothing is re-measured,
          re-drawn or re-asked.
        </p>
      </div>
    </section>
  );
}
