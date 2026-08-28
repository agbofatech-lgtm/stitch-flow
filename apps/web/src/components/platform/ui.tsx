/**
 * Phase 10 — shared UI primitives for the Developer Control Center.
 * Clarity over cinematic: plain cards, real states (loading / empty / error /
 * retry), semantic tables and keyboard-operable confirmations. Every action
 * component here calls a real backend endpoint — there are no inert buttons.
 */
import { useState, type ReactNode } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';

export function describeApiError(e: unknown): { message: string; status: number | null } {
  const err = e as { message?: string; status?: number } | null;
  return {
    message: err?.message || 'Request failed',
    status: typeof err?.status === 'number' ? err.status : null,
  };
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorState({ message, status, onRetry }: { message: string; status?: number | null; onRetry?: () => void }) {
  const hint =
    status === 403
      ? 'Your account does not have permission for this platform operation.'
      : status === 404
        ? 'The requested record no longer exists. Try refreshing the list.'
        : status === 409
          ? 'This action conflicts with the current state (already applied).'
          : status === 429
            ? 'Too many privileged actions — wait a moment and try again.'
            : status === 422 || status === 400
              ? 'Check the entered values and try again.'
              : status === 500
                ? 'The server could not complete the request. Try again; if it persists, check the audit log.'
                : null;
  return (
    <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-medium">Something went wrong{status ? ` (${status})` : ''}</p>
          <p className="mt-0.5">{message}</p>
          {hint && <p className="mt-1 text-rose-700/90">{hint}</p>}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

export function Card({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Two-step inline confirmation — destructive actions never fire on first click. */
export function ConfirmAction({
  label,
  confirmLabel,
  tone = 'default',
  busyLabel = 'Working…',
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  tone?: 'default' | 'danger';
  busyLabel?: string;
  /** Resolve with a short success message; throw to surface a failure. */
  onConfirm: () => Promise<string>;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const base =
    tone === 'danger'
      ? 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:outline-rose-600'
      : 'bg-[#0F6E8C] text-white hover:bg-[#0c5a73] focus-visible:outline-[#0F6E8C]';

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const message = await onConfirm();
      setDone(message);
      setArmed(false);
      window.setTimeout(() => setDone(null), 5000);
    } catch (e) {
      setError(describeApiError(e).message);
      setArmed(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {!armed && !done && (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
            tone === 'danger'
              ? 'border border-rose-300 text-rose-700 hover:bg-rose-50 focus-visible:outline-rose-600'
              : 'border border-slate-300 text-slate-700 hover:bg-slate-50 focus-visible:outline-[#0F6E8C]'
          }`}
        >
          {label}
        </button>
      )}
      {armed && (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run()}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 ${base}`}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setArmed(false);
              setError(null);
            }}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
          >
            Cancel
          </button>
        </>
      )}
      {done && (
        <span role="status" className="text-xs font-medium text-emerald-700">
          {done}
        </span>
      )}
      {error && (
        <span role="alert" className="text-xs font-medium text-rose-700">
          {error}
        </span>
      )}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800',
    suspended: 'bg-rose-100 text-rose-800',
    trialing: 'bg-amber-100 text-amber-800',
    past_due: 'bg-orange-100 text-orange-800',
    cancelled: 'bg-slate-200 text-slate-700',
    expired: 'bg-slate-200 text-slate-700',
    paused: 'bg-slate-200 text-slate-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${map[status] ?? 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  );
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
