import { useInView } from '../hooks/useInView';
import { LandingImage } from '../components/LandingImage';
import { MATERIAL_IMAGES } from '../components/landingAssets';

/** Stage 11 · ACT VI — material character. Fabric imagery communicates texture,
 *  drape and behaviour only: a reference image is never inventory data, and
 *  exact requirements stay a calculation, not a picture (Stage 9 rule kept). */
export function MaterialSection() {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <section ref={ref} data-landing="material" aria-labelledby="material-title" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <div className={`mx-auto max-w-2xl text-center ${inView ? 'sf-rise-enter' : 'opacity-0'}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold-dark">Material character</p>
        <h2 id="material-title" className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Fabric behaves. Planning should know.
        </h2>
        <p className="mt-5 text-base text-ink-soft">
          Woven structure, print repeat, drape and direction change how cloth should be cut — and how
          much of it a garment truly needs. StitchFlow keeps fabric behaviour part of the conversation
          when an order is planned, and leaves the exact requirement to the calculation, not the picture.
        </p>
      </div>
      <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
        {MATERIAL_IMAGES.map((img) => (
          <figure key={img.base} className="flex flex-col gap-3">
            <LandingImage asset={img} />
            <figcaption className="text-center text-xs font-medium uppercase tracking-[0.14em] text-ink-mute">{img.label}</figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-8 text-center text-[11px] text-ink-mute/80">Reference imagery — material character only, never stock or inventory records.</p>
    </section>
  );
}
