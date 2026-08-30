/**
 * Stage 9 intelligence presentation primitives — Phase 18.
 *
 * Composes ONLY Stage 5 design-system primitives (§52 — no competing
 * component system). Provides the deterministic/advisory distinction the
 * Stage 9 mandate requires (§36 hierarchy: deterministic PRIMARY,
 * explanation SECONDARY, advisory TERTIARY):
 *
 *   data-intelligence="deterministic" → Badge tone="info"  · "Deterministic"
 *   data-intelligence="advisory"      → Badge tone="advisory" · "Advisory · on-device"
 *   data-intelligence="missing"       → Badge tone="warning" · "Missing data"
 *   data-intelligence="snapshot"      → Badge tone="neutral" · "Snapshot"
 *
 * Class labels are always text (never colour alone — §29/§38). Progressive
 * disclosure uses the native <details> element (keyboard accessible, no JS).
 */
import type { ReactNode } from 'react';
import { Badge, Body, Label, Surface } from '../../design-system';
import clsx from 'clsx';

export type IntelligenceKind = 'deterministic' | 'advisory' | 'missing' | 'snapshot';

const KIND_META: Record<IntelligenceKind, { badge: string; tone: 'info' | 'advisory' | 'warning' | 'neutral' }> = {
  deterministic: { badge: 'Deterministic', tone: 'info' },
  advisory: { badge: 'Advisory · on-device', tone: 'advisory' },
  missing: { badge: 'Missing data', tone: 'warning' },
  snapshot: { badge: 'Snapshot', tone: 'neutral' },
};

export function IntelligenceCard({ kind, title, children, basedOn, disclosure, className, ready }: {
  kind: IntelligenceKind;
  title: string;
  children: ReactNode;
  /** Exposed as data-ready on the card root (probes/tests; not colour-only). */
  ready?: boolean;
  /** Provenance (§17 "Based on: …"). */
  basedOn?: string[];
  /** Level 2–4 progressive disclosure (§27). */
  disclosure?: { summary: string; body: ReactNode };
  className?: string;
}) {
  const meta = KIND_META[kind];
  return (
    <Surface data-intelligence={kind} data-ready={ready === undefined ? undefined : String(ready)} className={clsx('flex min-w-0 flex-col gap-2 p-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-ink">{title}</Label>
        <Badge tone={meta.tone}>{meta.badge}</Badge>
      </div>
      {children}
      {basedOn && basedOn.length > 0 && (
        <div className="text-xs text-ink-mute">
          <span className="ds-label">Based on:</span>{' '}
          {basedOn.join(' · ')}
        </div>
      )}
      {disclosure && (
        <details className="text-xs text-ink-mute">
          <summary className="ds-label min-h-[var(--ds-touch-min)] cursor-pointer select-none py-2 text-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-focus">
            {disclosure.summary}
          </summary>
          <div className="pb-1 pt-1">{disclosure.body}</div>
        </details>
      )}
    </Surface>
  );
}

export function MissingDataNotice({ children }: { children: ReactNode }) {
  return (
    <Body className="flex items-start gap-2 text-sm text-ink-soft" data-notice="missing-data">
      <span aria-hidden="true">⚠</span>
      <span>{children}</span>
    </Body>
  );
}
