import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export function Badge({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  children: ReactNode;
}) {
  const tones = {
    info: 'bg-action-secondary text-action-primary',
    success: 'bg-status-success/10 text-status-success',
    warning: 'bg-status-warning/10 text-status-warning',
    danger: 'bg-status-danger/10 text-status-danger',
    neutral: 'bg-surface-workspace text-ink-secondary',
  };
  return (
    <span className={cn('inline-flex rounded-sf-pill px-2.5 py-1 text-meta font-semibold', tones[tone])}>
      {children}
    </span>
  );
}

export function ExperienceEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-sf-lg border border-dashed border-line bg-surface-panel p-8 text-center">
      <h3 className="text-heading-sm text-ink-primary">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-body text-ink-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 text-body text-ink-muted">
      <span className="h-3 w-3 animate-pulse rounded-full bg-action-primary" />
      {label}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <div role="alert" className="rounded-sf border border-status-danger/30 bg-status-danger/5 p-4">
      <p className="text-label text-status-danger">{title}</p>
      <p className="mt-1 text-body text-ink-secondary">{description}</p>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-sf bg-action-secondary', className)} />;
}

export function Pagination({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="sf-focus-ring rounded-sf border border-line px-3 py-1 text-label disabled:text-ink-muted"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Previous
      </button>
      <span className="text-meta text-ink-muted">
        Page {page} of {pageCount}
      </span>
      <button
        type="button"
        className="sf-focus-ring rounded-sf border border-line px-3 py-1 text-label disabled:text-ink-muted"
        disabled={page >= pageCount}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
    </div>
  );
}

export function Toast({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        'rounded-sf border border-line bg-surface-elevated px-4 py-3 text-body shadow-sf-md',
        tone === 'success' && 'border-status-success/40',
        tone === 'warning' && 'border-status-warning/40',
        tone === 'danger' && 'border-status-danger/40'
      )}
    >
      {children}
    </div>
  );
}
