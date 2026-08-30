/** StitchFlow Design System — layout & typography primitives (Stage 5). */
import { clsx } from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

export const cx = clsx;

/* ── Typography (six roles — Stage 3 §2 contract) ─────────────────────── */
type TextProps = { children: ReactNode; className?: string; id?: string };

export const Display = ({ children, className, id }: TextProps) => (
  <h1 id={id} className={cx('ds-display text-ink', className)}>{children}</h1>
);
export const Heading = ({ children, className, id }: TextProps) => (
  <h2 id={id} className={cx('ds-heading text-ink', className)}>{children}</h2>
);
export const Section = ({ children, className, id }: TextProps) => (
  <h3 id={id} className={cx('ds-section text-ink', className)}>{children}</h3>
);
export const Body = ({ children, className, id }: TextProps) => (
  <p id={id} className={cx('ds-body text-ink-soft', className)}>{children}</p>
);
export const Label = ({ children, className, htmlFor }: TextProps & { htmlFor?: string }) => (
  <span className={cx('ds-label', className)}>{children}</span>
);
export const Numeric = ({ children, className, id }: TextProps) => (
  <span id={id} className={cx('ds-numeric text-ink', className)}>{children}</span>
);

/* ── Layout ───────────────────────────────────────────────────────────── */
export const Surface = ({ children, className, raised, subtle, ...rest }:
  HTMLAttributes<HTMLDivElement> & { raised?: boolean; subtle?: boolean }) => (
  <div
    {...rest}
    className={cx(
      'rounded-2xl border border-line',
      subtle ? 'bg-ds-subtle' : 'bg-ds-surface',
      raised && 'shadow-[var(--sf-e2)]',
      className,
    )}
  >
    {children}
  </div>
);

export const Stack = ({ children, className, gap = 3, ...rest }:
  HTMLAttributes<HTMLDivElement> & { gap?: number }) => (
  <div {...rest} className={cx('flex flex-col', className)} style={{ gap: `calc(0.25rem * ${gap})` }}>
    {children}
  </div>
);

export const Inline = ({ children, className, gap = 2, wrap = true, ...rest }:
  HTMLAttributes<HTMLDivElement> & { gap?: number; wrap?: boolean }) => (
  <div {...rest} className={cx('flex items-center', wrap && 'flex-wrap', className)}
    style={{ gap: `calc(0.25rem * ${gap})` }}>
    {children}
  </div>
);

export const Divider = ({ className, label }: { className?: string; label?: string }) => (
  <div role="separator" aria-label={label} className={cx('h-px w-full bg-line', className)} />
);

/* ── Data display ─────────────────────────────────────────────────────── */
export const Metric = ({ label, value, unit, hint }: { label: string; value: ReactNode; unit?: string; hint?: string }) => (
  <div className="flex flex-col gap-1">
    <Label>{label}</Label>
    <Numeric className="text-lg font-semibold">
      {value}{unit ? <span className="text-ink-mute ml-1 text-xs">{unit}</span> : null}
    </Numeric>
    {hint ? <span className="text-xs text-ink-mute">{hint}</span> : null}
  </div>
);

export const KeyValue = ({ items, className }: { items: Array<[string, ReactNode]>; className?: string }) => (
  <dl className={cx('grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2', className)}>
    {items.map(([k, v]) => (
      <div key={k} className="flex items-baseline justify-between gap-4 border-b border-line pb-1">
        <dt className="ds-label">{k}</dt>
        <dd className="ds-body text-ink">{v}</dd>
      </div>
    ))}
  </dl>
);
