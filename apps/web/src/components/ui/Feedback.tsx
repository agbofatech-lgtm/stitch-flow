/** Phase 11 — loading / error / empty primitives (what, why, next). */
import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-2 text-sm text-ink-mute">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-grey border-t-gold" aria-hidden="true" />
      {label}
    </span>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-card border border-line bg-surface p-6 text-sm text-ink-mute">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-grey border-t-gold" aria-hidden="true" />
      {label}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`sf-skeleton ${className}`} aria-hidden="true" />;
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
    <div role="alert" className="rounded-card border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-medium">Something went wrong{status ? ` (${status})` : ''}</p>
          <p className="mt-0.5">{message}</p>
          {hint && <p className="mt-1 text-rose-700/90">{hint}</p>}
          {onRetry && (
            <Button variant="danger" size="sm" className="mt-2" onClick={onRetry} icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}>
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  art,
  children,
}: {
  title?: string;
  body?: string;
  action?: ReactNode;
  art?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="sf-fade-enter rounded-card border border-dashed border-grey bg-surface p-6 text-center text-sm text-ink-mute">
      {art && <div className="mx-auto mb-3 w-16 opacity-70">{art}</div>}
      {title && <p className="font-display text-sm font-semibold text-ink">{title}</p>}
      {body && <p className="mx-auto mt-1 max-w-sm">{body}</p>}
      {children}
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}
