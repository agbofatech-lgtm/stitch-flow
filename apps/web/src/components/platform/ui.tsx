/**
 * Phase 10 — shared UI primitives for the Developer Control Center.
 * Phase 11 — demoted to a thin adapter over the centralized component system
 * in components/ui; export names and behaviour preserved for all consumers.
 * Every action component still calls a real backend endpoint — no inert buttons.
 */
import { useState } from 'react';
import { Button } from '../ui/Button';
import { Card as UiCard, MetricCard as UiMetricCard } from '../ui/Card';
import { StatusBadge as UiStatusBadge } from '../ui/Badge';
import { EmptyState as UiEmptyState, ErrorState as UiErrorState, Loading as UiLoading } from '../ui/Feedback';

export function describeApiError(e: unknown): { message: string; status: number | null } {
  const err = e as { message?: string; status?: number } | null;
  return {
    message: err?.message || 'Request failed',
    status: typeof err?.status === 'number' ? err.status : null,
  };
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <UiLoading label={label} />;
}

export function ErrorState({ message, status, onRetry }: { message: string; status?: number | null; onRetry?: () => void }) {
  return <UiErrorState message={message} status={status} onRetry={onRetry} />;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <UiEmptyState>{children}</UiEmptyState>;
}

export function Card({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <UiCard title={title} actions={actions}>
      {children}
    </UiCard>
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
        <Button variant="secondary" size="sm" onClick={() => setArmed(true)}>
          {label}
        </Button>
      )}
      {armed && (
        <>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} size="sm" disabled={busy} loading={busy} onClick={() => void run()}>
            {busy ? busyLabel : confirmLabel}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              setArmed(false);
              setError(null);
            }}
          >
            Cancel
          </Button>
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
  return <UiStatusBadge status={status} />;
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
  return <UiMetricCard label={label} value={value} />;
}
