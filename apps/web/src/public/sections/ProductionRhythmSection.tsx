import { useInView } from '../hooks/useInView';
import { CANONICAL_STAGES, STAGE_META } from '../../design-system/Status';
import { LandingImage } from '../components/LandingImage';
import { PRODUCTION_IMAGE } from '../components/landingAssets';

/** Stage 11 · ACT V — the production rhythm. The nine canonical stages come
 *  from the repository constant (design-system/Status.tsx CANONICAL_STAGES —
 *  identical to the backend state machine); no marketing-typed sequence. */
export function ProductionRhythmSection() {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <section ref={ref} data-landing="rhythm" aria-labelledby="rhythm-title" className="bg-charcoal text-ivory">
      <div className={`mx-auto max-w-6xl px-4 py-24 sm:px-6 ${inView ? 'sf-rise-enter' : 'opacity-0'}`}>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold-light">The rhythm</p>
          <h2 id="rhythm-title" className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            A garment is never just “in progress.”
          </h2>
          <p className="mt-5 text-base text-ivory/70">
            Every order moves through a disciplined lifecycle — nine named stages, each with its own
            record, so the whole workshop can see exactly where a garment stands and what it still needs.
          </p>
        </div>
        <ol aria-label="The nine canonical production stages" data-canonical-stages
          className="mx-auto mt-14 flex max-w-4xl flex-wrap items-start justify-center gap-x-2 gap-y-6 sm:gap-x-3">
          {CANONICAL_STAGES.map((code, i) => {
            const meta = STAGE_META[code];
            return (
              <li key={code} data-stage={code}
                className="flex w-1/3 flex-col items-center gap-2 text-center sm:w-auto sm:flex-1"
                style={{ transitionDelay: inView ? `${i * 70}ms` : '0ms', transitionProperty: 'opacity, transform', opacity: inView ? 1 : 0.15, transform: inView ? 'none' : 'translateY(6px)' }}>
                <span aria-hidden="true" className="grid size-11 place-items-center rounded-full border border-ivory/30 text-base text-gold-light">{meta.shape}</span>
                <span className="text-xs font-medium leading-tight text-ivory/85">{meta.label}</span>
                {i < CANONICAL_STAGES.length - 1 && (
                  <span aria-hidden="true" className="hidden text-gold/70 sm:absolute" />
                )}
              </li>
            );
          })}
        </ol>
        <div className="mx-auto mt-14 grid max-w-4xl items-center gap-8 md:grid-cols-[1fr_1.2fr]">
          <LandingImage asset={PRODUCTION_IMAGE} className="border-ivory/20 bg-transparent" />
          <div>
            <p className="text-sm leading-relaxed text-ivory/75">
              Stages can be started, completed, skipped with a reason, or reopened for rework — each
              move leaves a trail. Delivery is a production fact; payment is tracked in its own lane,
              beside the garment, never mistaken for it.
            </p>
            <p className="mt-4 border-l-2 border-gold pl-4 text-sm font-medium text-ivory/90">
              The board answers one question at a glance: what needs attention now?
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
