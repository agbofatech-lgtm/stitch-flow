import { BRAND } from '../../config/brand';
import { navigate } from '@shared/router';
import { Button } from '../../components/ui/Button';
import { useInView } from '../hooks/useInView';

/** Phase 12 — hero: one statement, one visual breath, two CTAs. */
export function HeroSection() {
  const { ref, inView } = useInView<HTMLElement>('0px');
  return (
    <section ref={ref} aria-labelledby="hero-title" className="relative overflow-hidden">
      {/* ambient technical grid — local SVG data, no network */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #E4E1DA 1px, transparent 1px), linear-gradient(to bottom, #E4E1DA 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, black 30%, transparent 75%)',
        }}
      />
      <div className={`relative mx-auto flex min-h-[88svh] max-w-4xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6 ${inView ? 'sf-rise-enter' : 'opacity-0'}`}>
        <picture className="sf-logo-reveal mb-8 inline-block">
          <source srcSet="/images/public/brand/stitchflow-logo-256.webp" type="image/webp" />
          <img src="/images/public/brand/stitchflow-logo-256.png" alt={`${BRAND.productName} logo`} className="h-16 w-auto" width={64} height={64} decoding="async" />
        </picture>
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-gold-dark">
          Measure · Design · Pattern · Produce · Manage
        </p>
        <h1 id="hero-title" className="font-display text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          Precision tailoring.
          <br />
          Simplified.
        </h1>
        <p className="mt-6 max-w-2xl text-base text-ink-soft sm:text-lg">
          From measurement to production, StitchFlow brings your tailoring workflow into one
          precise digital system.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" size="lg" onClick={() => navigate('/register')}>
            Start with StitchFlow
          </Button>
          <Button variant="secondary" size="lg" onClick={() => navigate('/login')}>
            Sign In
          </Button>
        </div>
        <div aria-hidden="true" className="mt-16 h-14 w-px bg-gradient-to-b from-gold to-transparent" />
      </div>
    </section>
  );
}
