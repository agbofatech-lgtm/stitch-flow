import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { PageHeader, Workroom } from '../layout/layout';
import { Badge } from '../primitives/feedback';

export type ConfidenceState =
  | 'local'
  | 'queued'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'pending'
  | 'draft'
  | 'finalized'
  | 'verified'
  | 'error'
  | 'blocked';

const CONFIDENCE_COPY: Record<ConfidenceState, { label: string; tone: 'info' | 'success' | 'warning' | 'danger' | 'neutral' }> =
  {
    local: { label: 'Local workspace', tone: 'neutral' },
    queued: { label: 'Queued locally', tone: 'warning' },
    syncing: { label: 'Syncing', tone: 'warning' },
    synced: { label: 'Acknowledged remotely', tone: 'success' },
    offline: { label: 'Offline', tone: 'neutral' },
    pending: { label: 'Pending', tone: 'warning' },
    draft: { label: 'Draft', tone: 'neutral' },
    finalized: { label: 'Finalized', tone: 'info' },
    verified: { label: 'Verified', tone: 'success' },
    error: { label: 'Needs attention', tone: 'danger' },
    blocked: { label: 'Blocked', tone: 'danger' },
  };

export function AtelierConfidence({
  state,
  detail,
}: {
  state: ConfidenceState;
  detail?: string;
}) {
  const copy = CONFIDENCE_COPY[state];
  return (
    <span className="inline-flex flex-wrap items-center gap-2" data-confidence={state}>
      <Badge tone={copy.tone}>{copy.label}</Badge>
      {detail ? <span className="text-meta text-ink-muted">{detail}</span> : null}
    </span>
  );
}

export function AtelierThread({
  room,
  client,
  order,
}: {
  room: string;
  client?: string | null;
  order?: string | null;
}) {
  return (
    <p className="text-meta text-ink-secondary" data-atelier-thread="true">
      <span className="text-ink-muted">{room}</span>
      {client ? (
        <>
          <span aria-hidden="true"> · </span>
          <span>Client {client}</span>
        </>
      ) : (
        <>
          <span aria-hidden="true"> · </span>
          <span>No client selected</span>
        </>
      )}
      {order ? (
        <>
          <span aria-hidden="true"> · </span>
          <span className="font-numeric">{order}</span>
        </>
      ) : null}
    </p>
  );
}

export function AtelierPage({
  kicker,
  title,
  description,
  primaryAction,
  thread,
  confidence,
  children,
}: {
  kicker: string;
  title: string;
  description?: string;
  primaryAction?: ReactNode;
  thread?: ReactNode;
  confidence?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Workroom>
      <div className="space-y-3">
        {thread}
        <PageHeader level={2} kicker={kicker} title={title} description={description} actions={primaryAction} />
        {confidence}
      </div>
      {children}
    </Workroom>
  );
}

export function AtelierStage({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('sf-canvas-stage p-4 sm:p-5', className)}>{children}</div>;
}
