import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../lib/cn';
import { PageHeader, Workroom } from '../layout/layout';
import { Badge } from '../primitives/feedback';
import { motionOrInstant, motionPresets } from '../motion/motion';

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
  const key = `${room}|${client || ''}|${order || ''}`;
  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={key}
        className="text-meta text-ink-secondary"
        data-atelier-thread="true"
        data-motion-category="contextual"
        {...motionOrInstant(motionPresets.contextual)}
      >
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
      </motion.p>
    </AnimatePresence>
  );
}

export function AtelierMilestone({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          role="status"
          data-motion-category="milestone"
          className="rounded-sf-lg border border-action-primary/25 bg-action-secondary p-4 text-body text-ink-primary"
          {...motionOrInstant(motionPresets.milestone)}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
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

const JOURNEY = [
  { id: 'clients', label: 'Client' },
  { id: 'measurements', label: 'Measurements' },
  { id: 'design', label: 'Design' },
  { id: 'production', label: 'Production' },
  { id: 'ledger', label: 'Ledger' },
] as const;

/** Orientation only. Not a second router and not a fake progress meter. */
export function AtelierJourney({ current }: { current: (typeof JOURNEY)[number]['id'] }) {
  return (
    <p className="text-meta text-ink-muted" data-atelier-journey={current}>
      {JOURNEY.map((step, index) => (
        <span key={step.id}>
          {index > 0 ? <span aria-hidden="true"> → </span> : null}
          <span className={step.id === current ? 'text-ink-primary' : undefined}>{step.label}</span>
        </span>
      ))}
    </p>
  );
}

/** Reusable workroom grammar. Identity + thread + surface + optional aside. Not a second layout system. */
export function AtelierWorkroom({
  place,
  title,
  purpose,
  thread,
  confidence,
  primaryAction,
  aside,
  density = 'standard',
  children,
}: {
  place: string;
  title: string;
  purpose?: string;
  thread?: ReactNode;
  confidence?: ReactNode;
  primaryAction?: ReactNode;
  aside?: ReactNode;
  density?: 'standard' | 'canvas';
  children: ReactNode;
}) {
  if (density === 'canvas') {
    return (
      <div
        className="flex min-h-full flex-col bg-surface-canvas text-ink-primary"
        data-workroom={place}
        data-workroom-density="canvas"
      >
        <div className="sticky top-0 z-[1] shrink-0 space-y-2 border-b border-line-subtle bg-surface-canvas px-3 py-2 sm:px-6 sm:py-3">
          {thread}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-meta text-ink-muted">{place}</p>
              <h2 className="mt-0.5 font-display text-heading text-ink-primary">{title}</h2>
              {purpose ? <p className="mt-1 max-w-3xl text-meta text-ink-secondary">{purpose}</p> : null}
            </div>
            {primaryAction ? <div className="flex flex-wrap items-center gap-2">{primaryAction}</div> : null}
          </div>
          {confidence}
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-surface-canvas text-ink-primary" data-workroom={place}>
      <Workroom className="space-y-6">
        <div className="space-y-3">
          {thread}
          <PageHeader level={2} kicker={place} title={title} description={purpose} actions={primaryAction} />
          {confidence}
        </div>
        <div className={aside ? 'grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_17rem]' : undefined}>
          <div className="min-w-0 space-y-6">{children}</div>
          {aside ? (
            <aside className="min-w-0 space-y-4 xl:sticky xl:top-4">{aside}</aside>
          ) : null}
        </div>
      </Workroom>
    </div>
  );
}
