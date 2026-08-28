/** Phase 11 — one badge system with semantic tones. */
import type { ReactNode } from 'react';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold';

const tones: Record<BadgeTone, string> = {
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-rose-100 text-rose-800',
  info: 'bg-sky-100 text-sky-800',
  neutral: 'bg-grey-light text-ink-soft',
  gold: 'bg-gold-light/40 text-gold-dark',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

const statusTone: Record<string, BadgeTone> = {
  active: 'success',
  suspended: 'danger',
  trialing: 'warning',
  past_due: 'warning',
  cancelled: 'neutral',
  expired: 'neutral',
  paused: 'neutral',
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone[status] ?? 'neutral'}>{status}</Badge>;
}
