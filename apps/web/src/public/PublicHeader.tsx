import stitchflowLogo from '@shared/assets/stitchflow-logo.png';
import { BRAND } from '../config/brand';
import { navigate } from '@shared/router';
import { Button } from '../components/ui/Button';

/** Phase 12 — public header: brand + entry CTAs. Presentation only. */
export function PublicHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-sticky border-b border-line/70 bg-ivory/90 backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-toast focus:rounded-btn focus:bg-charcoal focus:px-4 focus:py-2 focus:text-sm focus:text-ivory"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'auto' })}
          className="flex items-center gap-3 rounded-btn focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          aria-label={`${BRAND.productName} — back to top`}
        >
          <img src={stitchflowLogo} alt={`${BRAND.productName} logo`} className="h-9 w-auto" width={36} height={36} />
          <span className="font-display text-lg font-semibold tracking-tight text-ink">{BRAND.productName}</span>
        </button>

        <nav aria-label="Public">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="md" onClick={() => navigate('/login')}>
              Sign In
            </Button>
            <Button variant="primary" size="md" className="hidden sm:inline-flex" onClick={() => navigate('/register')}>
              Start with StitchFlow
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
