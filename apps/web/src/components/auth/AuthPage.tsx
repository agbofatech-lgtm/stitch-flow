import type { ReactNode } from 'react';
import stitchflowLogo from '@shared/assets/stitchflow-logo.png';
import { BRAND } from '../../config/brand';
import { navigate } from '@shared/router';
import { ArrowLeft } from 'lucide-react';

/**
 * Phase 9 — shared shell for the public authentication pages.
 * Phase 11 — premium atelier treatment on the design-token system:
 * ivory canvas, charcoal ink, gold focus, display headings, restrained
 * elevation. Bundle isolation preserved (no app modules imported here).
 * The cinematic public experience (later phase) builds on this, not replaces it.
 */
export function AuthPage({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-ivory bg-gradient-to-br from-ivory via-surface to-grey-light p-4">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="sf-btn-motion absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-btn px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-grey-light/70 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        {BRAND.productName} home
      </button>
      <main className="sf-page-enter w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <img src={stitchflowLogo} alt={`${BRAND.productName} logo`} className="sf-logo-reveal h-12 w-auto" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="text-sm text-ink-mute">{subtitle}</p>}
          <p className="text-[0.65rem] uppercase tracking-[0.22em] text-ink-mute">
            by {BRAND.parentName}
          </p>
        </div>

        <div className="rounded-card border border-line bg-surface p-6 shadow-e3">
          {children}
        </div>

        {footer && <div className="mt-5 text-center text-sm text-ink-mute">{footer}</div>}
      </main>
    </div>
  );
}

/** Small building blocks shared by the auth pages (labels, fields, errors). */
export function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} role="alert" className="sf-fade-enter mb-4 rounded-input border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
      {message}
    </p>
  );
}

export function FormLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
      {children}
    </label>
  );
}

export const inputClass =
  'w-full min-h-[40px] rounded-input border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-mute ' +
  'transition-colors duration-micro ease-standard hover:border-grey ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold';

export const primaryButtonClass =
  'sf-btn-motion flex w-full items-center justify-center gap-2 rounded-btn bg-charcoal px-4 py-2.5 text-sm font-semibold text-ivory ' +
  'hover:bg-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

export const linkClass =
  'font-medium text-gold-dark underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold rounded';
