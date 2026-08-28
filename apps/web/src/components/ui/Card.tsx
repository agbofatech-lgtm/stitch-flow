/** Phase 11 — surface & card primitives (16px radius, restrained elevation). */
import type { ReactNode } from 'react';

export function Surface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-card border border-line bg-surface shadow-e1 ${className}`}>{children}</div>;
}

export function Card({
  title,
  children,
  actions,
  className = '',
  hover = false,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <section aria-label={title} className={`rounded-card border border-line bg-surface p-4 shadow-e1 ${hover ? 'sf-card-hover' : ''} ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="sf-card-hover rounded-card border border-line bg-surface p-4 shadow-e1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-mute">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}
