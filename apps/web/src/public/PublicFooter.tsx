import { BRAND } from '../config/brand';
import { navigate } from '@shared/router';

/** Phase 12 — public footer: quiet brand close. */
export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-charcoal text-ivory">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-10 sm:flex-row sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <picture>
            <source srcSet="/images/public/brand/stitchflow-logo-128.webp" type="image/webp" />
            <img src="/images/public/brand/stitchflow-logo-128.png" alt={`${BRAND.productName} logo`} className="h-8 w-auto rounded-btn bg-ivory p-1" width={32} height={32} loading="lazy" decoding="async" />
          </picture>
          <div>
            <p className="font-display text-sm font-semibold">{BRAND.productName}</p>
            <p className="text-xs text-ivory/60">by {BRAND.parentName}</p>
          </div>
        </div>
        <nav aria-label="Footer">
          <div className="flex items-center gap-6 text-sm">
            <button type="button" onClick={() => navigate('/login')} className="rounded px-1 py-3 text-ivory/80 transition-colors duration-micro hover:text-gold-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
              Sign In
            </button>
            <button type="button" onClick={() => navigate('/register')} className="rounded px-1 py-3 text-ivory/80 transition-colors duration-micro hover:text-gold-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
              Create account
            </button>
          </div>
        </nav>
        <p className="text-xs text-ivory/50">Precision tailoring. Simplified.</p>
      </div>
    </footer>
  );
}
