import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/cn';
import { motionOrInstant, motionPresets } from '../motion/motion';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  pending: 'Pending',
  processing: 'Processing',
  in_progress: 'In progress',
  ready: 'Ready',
  completed: 'Completed',
  delivered: 'Delivered',
  failed: 'Failed',
  cancelled: 'Cancelled',
  archived: 'Archived',
  overdue: 'Overdue',
  offline: 'Offline',
  syncing: 'Syncing',
  unavailable: 'Unavailable',
  local: 'Local workspace',
  queued: 'Queued locally',
  synced: 'Acknowledged remotely',
  blocked: 'Blocked',
  finalized: 'Finalized',
  verified: 'Verified',
};

export function StatusBadge({
  status,
}: {
  status: string;
}) {
  const key = status.toLowerCase();
  const tone =
    key === 'completed' || key === 'delivered' || key === 'active' || key === 'ready'
      ? 'success'
      : key === 'failed' || key === 'cancelled' || key === 'overdue'
        ? 'danger'
        : key === 'pending' || key === 'processing' || key === 'in_progress' || key === 'syncing' || key === 'queued'
          ? 'warning'
          : key === 'finalized' || key === 'verified' || key === 'synced'
            ? 'info'
            : 'neutral';
  const label = STATUS_LABEL[key] || status.replace(/_/g, ' ');
  return <Badge tone={tone}>{label}</Badge>;
}

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
    <motion.div
      className="rounded-sf-lg border border-dashed border-line bg-surface-panel p-8 text-center"
      data-motion-category="contextual"
      {...motionOrInstant(motionPresets.empty)}
    >
      <h3 className="text-heading-sm text-ink-primary">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-body text-ink-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </motion.div>
  );
}

export function LoadingState({ label = 'Preparing workspace…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 text-body text-ink-muted" data-motion-category="contextual">
      <span className="h-3 w-3 animate-pulse rounded-full bg-action-primary" />
      {label}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  action,
}: {
  title?: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div role="alert" className="rounded-sf border border-status-danger/30 bg-status-danger/5 p-4" data-motion-category="micro">
      <p className="text-label text-status-danger">{title}</p>
      <p className="mt-1 text-body text-ink-secondary">{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function WorkspaceSkeleton({ label = 'Loading workspace' }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-28 w-full" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
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
