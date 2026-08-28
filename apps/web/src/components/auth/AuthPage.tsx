import type { ReactNode } from 'react';
import stitchflowLogo from '@shared/assets/stitchflow-logo.png';
import { BRAND } from '../../config/brand';

/**
 * Phase 9 — shared shell for the public authentication pages.
 *
 * Establishes the beginning of a coherent StitchFlow visual language:
 * calm premium gradient, centered card, brand header, generous spacing.
 * Intentionally lightweight — no app modules are imported here so the
 * unauthenticated experience never loads Design Studio / Pattern Engine /
 * Production Assistant / Developer code (bundle isolation preserved).
 * The later cinematic phase will build on this foundation, not replace it.
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-sky-50 p-4">
      <main className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <img src={stitchflowLogo} alt={`${BRAND.productName} logo`} className="h-12 w-auto" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          <p className="text-[0.65rem] uppercase tracking-[0.22em] text-slate-400">
            by {BRAND.parentName}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
          {children}
        </div>

        {footer && <div className="mt-5 text-center text-sm text-slate-500">{footer}</div>}
      </main>
    </div>
  );
}

/** Small building blocks shared by the auth pages (labels, fields, errors). */
export function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {message}
    </p>
  );
}

export function FormLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
      {children}
    </label>
  );
}

export const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 ' +
  'focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200';

export const primaryButtonClass =
  'flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white ' +
  'transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

export const linkClass =
  'font-medium text-sky-700 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-sky-300 rounded';
