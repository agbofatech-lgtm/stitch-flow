/** StitchFlow Design System — status language (Stage 5 §19).
 *
 * CANONICAL CONTRACT (protected): the DB production sequence is
 * measurement→cutting→sewing→embroidery→first_fitting→second_fitting→
 * final_press→ready→delivered (productionStageService, seq 1–9).
 * Presentation labels never alter canonical codes — every primitive
 * renders the code in `data-stage` and the label in text.
 *
 * Non-colour rule: every status = TEXT + SHAPE + colour. Colour is never
 * the only carrier. Payment state is independent of production state.
 */
import { clsx } from 'clsx';
import type { ReactNode } from 'react';

/** Canonical production stages, in canonical order. */
export const CANONICAL_STAGES = [
  'measurement', 'cutting', 'sewing', 'embroidery', 'first_fitting',
  'second_fitting', 'final_press', 'ready', 'delivered',
] as const;
export type CanonicalStage = (typeof CANONICAL_STAGES)[number];

export const STAGE_META: Record<CanonicalStage, { label: string; shape: string; token: string }> = {
  measurement:    { label: 'Measurement',    shape: '○', token: 'var(--ds-stage-measurement)' },
  cutting:        { label: 'Cutting',        shape: '◑', token: 'var(--ds-stage-cutting)' },
  sewing:         { label: 'Sewing',         shape: '◐', token: 'var(--ds-stage-sewing)' },
  embroidery:     { label: 'Embroidery',     shape: '✦', token: 'var(--ds-stage-embroidery)' },
  first_fitting:  { label: 'First fitting',  shape: '◇', token: 'var(--ds-stage-fitting)' },
  second_fitting: { label: 'Second fitting', shape: '◆', token: 'var(--ds-stage-fitting)' },
  final_press:    { label: 'Final press',    shape: '▤', token: 'var(--ds-stage-final-press)' },
  ready:          { label: 'Ready',          shape: '✓', token: 'var(--ds-stage-ready)' },
  delivered:      { label: 'Delivered',      shape: '■', token: 'var(--ds-stage-delivered)' },
};

export function StatusPill({ stage, size = 'md' }: { stage: CanonicalStage; size?: 'sm' | 'md' }) {
  const meta = STAGE_META[stage];
  return (
    <span
      data-stage={stage}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-medium',
        size === 'sm' ? 'text-[11px]' : 'text-xs',
      )}
      style={{ color: meta.token, borderColor: meta.token, background: 'color-mix(in srgb, currentColor 8%, transparent)' }}
    >
      <span aria-hidden="true">{meta.shape}</span>
      {meta.label}
    </span>
  );
}

export type PaymentState = 'unpaid' | 'partial' | 'paid' | 'overdue';
const PAYMENT_META: Record<PaymentState, { label: string; shape: string; token: string }> = {
  unpaid:   { label: 'Unpaid',   shape: '○', token: 'var(--ds-warning)' },
  partial:  { label: 'Partial',  shape: '◔', token: 'var(--ds-info)' },
  paid:     { label: 'Paid',     shape: '✓', token: 'var(--ds-success)' },
  overdue:  { label: 'Overdue',  shape: '!', token: 'var(--ds-danger)' },
};

/** Payment state — deliberately a SEPARATE primitive from production stage. */
export function PaymentPill({ state }: { state: PaymentState }) {
  const m = PAYMENT_META[state];
  return (
    <span data-payment={state}
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
      style={{ color: m.token, borderColor: m.token }}>
      <span aria-hidden="true">{m.shape}</span>{m.label}
    </span>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'advisory' }) {
  const tones = {
    neutral: 'bg-ds-subtle text-ink-soft', info: 'bg-ds-info text-white',
    success: 'bg-ds-success text-white', warning: 'bg-ds-warning text-white',
    danger: 'bg-ds-danger text-white', advisory: 'bg-ds-advisory-surface text-[var(--ds-advisory)] border border-ds-advisory-border',
  };
  return <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide', tones[tone])}>{children}</span>;
}

/** Canonical-sequence progress tracker. Index = completed-through position. */
export function ProductionTracker({ current, compact }: { current: CanonicalStage; compact?: boolean }) {
  const currentIdx = CANONICAL_STAGES.indexOf(current);
  return (
    <ol data-current-stage={current} aria-label={`Production progress: ${STAGE_META[current].label}`} className="flex flex-wrap items-center gap-1">
      {CANONICAL_STAGES.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const m = STAGE_META[s];
        return (
          <li key={s} aria-current={active ? 'step' : undefined} className="flex items-center gap-1">
            {!compact && i > 0 && <span aria-hidden="true" className="text-ink-mute">›</span>}
            <span data-stage={s} className={clsx('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium',
              active && 'border')} style={{ color: done || active ? m.token : 'var(--ds-text-muted)', borderColor: m.token }}>
              <span aria-hidden="true">{done ? '✓' : m.shape}</span>
              <span className="sr-only">{done ? 'Completed: ' : active ? 'Current: ' : 'Pending: '}{m.label}</span>
              {!compact || done || active ? m.label : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
