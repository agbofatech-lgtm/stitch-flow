import { useInView } from '../hooks/useInView';
import { LandingImage } from '../components/LandingImage';
import { CRAFT_IMAGES } from '../components/landingAssets';

/** Stage 11 · ACT I — the craft. Emotional context before any software:
 *  tailoring as material, measurement and preparation. */
export function CraftSection() {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <section ref={ref} data-landing="craft" aria-labelledby="craft-title" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <div className={`mx-auto max-w-2xl text-center ${inView ? 'sf-rise-enter' : 'opacity-0'}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold-dark">The craft</p>
        <h2 id="craft-title" className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Tailoring begins before the first stitch.
        </h2>
        <p className="mt-5 text-base text-ink-soft">
          A tape held steady. A line chalked on cloth. A fitting where the garment answers back.
          The work is physical, patient and precise — and every piece of it produces information.
        </p>
      </div>
      <div className="mt-14 grid gap-6 sm:grid-cols-3">
        {CRAFT_IMAGES.map((img) => (
          <figure key={img.base} className="flex flex-col gap-3">
            <LandingImage asset={img} />
            <figcaption className="text-center text-xs font-medium uppercase tracking-[0.14em] text-ink-mute">{img.caption}</figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-8 text-center text-[11px] text-ink-mute/80">Reference imagery — style illustration, not a documented workshop.</p>
    </section>
  );
}
