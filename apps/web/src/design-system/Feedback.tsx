/** StitchFlow Design System — feedback states (Stage 5 §16/§20/§23). */
import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Body, Label } from './primitives';

/* ── AI advisory (§20) — advice, never authority ─────────────────────────
   Verbs mirror the Phase 17 advisory contract: INFORM · WARN · SUGGEST ·
   EXPLAIN · RECOMMEND. SILENTLY MODIFY is prohibited by contract and has
   no representation here by design. Advisory output is never rendered as
   deterministic data (separate visual family, explicit "Advisory" label,
   dismissible, review required).                                              */
export const AI_VERBS = ['INFORM', 'WARN', 'SUGGEST', 'EXPLAIN', 'RECOMMEND'] as const;
export type AiVerb = (typeof AI_VERBS)[number];

export function AiAdvisory({ verb, title, children, onReview, onDismiss, source }:
  { verb: AiVerb; title: string; children: ReactNode; onReview?: () => void; onDismiss?: () => void; source?: string }) {
  const warn = verb === 'WARN';
  return (
    <aside
      role="note"
      aria-label={`AI advisory: ${verb}`}
      data-ai-verb={verb}
      className="rounded-xl border border-ds-advisory-border bg-ds-advisory-surface p-4"
      style={warn ? { borderColor: 'var(--ds-warning)', background: 'var(--ds-warning-surface)' } : undefined}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className={clsx('rounded px-1.5 py-0.5 text-[10px] font-bold tracking-widest',
          warn ? 'bg-ds-warning text-white' : 'bg-ds-advisory text-white')}>AI · {verb}</span>
        <Label className="normal-case tracking-normal">Advisory — not deterministic data</Label>
        {source && <span className="ml-auto ds-numeric text-[10px] text-ink-mute">{source}</span>}
      </div>
      <p className="ds-body font-medium text-ink">{title}</p>
      <div className="ds-body text-ink-soft">{children}</div>
      {(onReview || onDismiss) && (
        <div className="mt-3 flex gap-2">
          {onReview && <Button variant="secondary" className="min-h-8 px-3 text-xs" onClick={onReview}>Review</Button>}
          {onDismiss && <Button variant="tertiary" className="min-h-8 text-xs" onClick={onDismiss}>Dismiss</Button>}
        </div>
      )}
    </aside>
  );
}

/* ── Alert (system messages — visually distinct from AI advisory) ─────── */
export function Alert({ tone = 'info', title, children }: { tone?: 'info' | 'success' | 'warning' | 'danger'; title: string; children?: ReactNode }) {
  const tones = {
    info: { bg: 'var(--ds-info-surface)', fg: 'var(--ds-info)', icon: 'ℹ' },
    success: { bg: 'var(--ds-success-surface)', fg: 'var(--ds-success)', icon: '✓' },
    warning: { bg: 'var(--ds-warning-surface)', fg: 'var(--ds-warning)', icon: '⚠' },
    danger: { bg: 'var(--ds-danger-surface)', fg: 'var(--ds-danger)', icon: '✕' },
  }[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className="rounded-xl border p-4" style={{ background: tones.bg, borderColor: tones.fg }}>
      <p className="flex items-center gap-2 font-medium text-ink">
        <span aria-hidden="true" style={{ color: tones.fg }}>{tones.icon}</span>{title}
      </p>
      {children && <div className="ds-body mt-1 text-ink-soft">{children}</div>}
    </div>
  );
}

export function Progress({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}
      className="h-1.5 w-full overflow-hidden rounded-full bg-ds-subtle">
      <div className="ds-motion-fast h-full rounded-full bg-ds-accent" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Skeleton({ label, className }: { label: string; className?: string }) {
  return (
    <div role="status" aria-label={`Loading ${label}…`} className={className}>
      <div className="ds-motion-micro animate-pulse rounded-md bg-ds-subtle" style={{ height: '1rem', width: '100%' }} />
      <span className="sr-only">Loading {label}…</span>
    </div>
  );
}

/* ── Empty states (§23): what's missing · why it matters · next action ── */
export function EmptyState({ illustration, title, message, primaryAction, secondaryAction }:
  { illustration?: string; title: string; message: string; primaryAction?: ReactNode; secondaryAction?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-ds-surface px-6 py-12 text-center">
      {illustration && (
        <img src={illustration} alt="" role="presentation" loading="lazy" decoding="async"
          className="h-28 w-auto opacity-90" />
      )}
      <p className="ds-section text-ink">{title}</p>
      <Body className="max-w-sm text-ink-mute">{message}</Body>
      {(primaryAction || secondaryAction) && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {primaryAction}{secondaryAction}
        </div>
      )}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, errorId }:
  { title?: string; message: string; onRetry?: () => void; errorId?: string }) {
  return (
    <div role="alert" className="rounded-2xl border border-ds-danger bg-ds-danger-surface p-6 text-center">
      <p className="ds-section text-ink"><span aria-hidden="true">⚠ </span>{title}</p>
      <Body className="mt-1 text-ink-soft">{message}</Body>
      {errorId && <p className="ds-numeric mt-2 text-xs text-ink-mute">ref {errorId}</p>}
      {onRetry && <Button className="mt-3" variant="secondary" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
