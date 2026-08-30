/** StitchFlow Design System — workflow & imagery primitives (Stage 5 §16/§22).
 *
 * Workflow spine made visible (Stage 5 §43):
 *   Customer → Order → Measurements → Design → Materials → Cutting →
 *   Production → Quality → Payment → Delivery
 *
 * ImageFrame contract (§21/§22): images are VISUAL REFERENCE ONLY —
 * «REFERENCE IMAGE ≠ CANONICAL FABRIC DATA». No primitive accepts or
 * implies domain authority; alt text is mandatory; performance budgets
 * respected (lazy by default, hero eager; sizes from the asset manifest).
 */
import { clsx } from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

/* ── Workflow ─────────────────────────────────────────────────────────── */
export function Stepper({ steps, current, onStepClick, children }:
  { steps: Array<{ id: string; label: string }>; current: number; onStepClick?: (i: number) => void; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4" data-step={current}>
      <ol className="flex flex-wrap items-center gap-2" aria-label="Workflow position">
        {steps.map((s, i) => {
          const state = i < current ? 'done' : i === current ? 'current' : 'todo';
          const clickable = onStepClick && i <= current;
          return (
            <li key={s.id} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true" className="text-ink-mute">—</span>}
              <button type="button" disabled={!clickable} onClick={() => onStepClick?.(i)}
                aria-current={state === 'current' ? 'step' : undefined}
                className={clsx(
                  'ds-motion-micro inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-focus',
                  state === 'done' && 'border-ds-success text-ds-success',
                  state === 'current' && 'border-ds-accent bg-ds-accent text-ds-surface',
                  state === 'todo' && 'border-line text-ink-mute',
                  clickable && 'cursor-pointer', !clickable && 'opacity-70',
                )}>
                <span aria-hidden="true" className="ds-numeric">{state === 'done' ? '✓' : i + 1}</span>{s.label}
              </button>
            </li>
          );
        })}
      </ol>
      <div>{children}</div>
    </div>
  );
}

export function Timeline({ items }: { items: Array<{ title: string; meta?: string; body?: ReactNode; done?: boolean; current?: boolean }> }) {
  return (
    <ol aria-label="Activity timeline" className="relative flex flex-col gap-0 border-l border-line pl-5">
      {items.map((it, i) => (
        <li key={i} className={clsx('relative pb-5', (i === items.length - 1) && 'pb-0')} aria-current={it.current ? 'step' : undefined}>
          <span aria-hidden="true" className={clsx(
            'absolute -left-[27px] top-0.5 block size-3 rounded-full border-2',
            it.done && 'border-ds-success bg-ds-success',
            it.current && 'border-ds-accent bg-ds-surface',
            !it.done && !it.current && 'border-line bg-ds-surface',
          )} />
          <p className="ds-body font-medium text-ink">{it.title}</p>
          {it.meta && <p className="ds-numeric text-xs text-ink-mute">{it.meta}</p>}
          {it.body && <div className="ds-body mt-1 text-ink-soft">{it.body}</div>}
        </li>
      ))}
    </ol>
  );
}

export function Checklist({ items }: { items: Array<{ label: string; state: 'todo' | 'done' | 'blocked'; note?: string }> }) {
  return (
    <ul aria-label="Readiness checklist" className="flex flex-col gap-2">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span aria-hidden="true" className={clsx('mt-0.5 grid size-5 shrink-0 place-items-center rounded border text-xs font-bold',
            it.state === 'done' && 'border-ds-success text-ds-success',
            it.state === 'blocked' && 'border-ds-danger text-ds-danger',
            it.state === 'todo' && 'border-line text-ink-mute')}>
            {it.state === 'done' ? '✓' : it.state === 'blocked' ? '!' : '○'}
          </span>
          <span>
            <span className={clsx('ds-body', it.state === 'todo' ? 'text-ink' : 'text-ink-soft')}>{it.label}</span>
            <span className="sr-only"> — {it.state === 'done' ? 'completed' : it.state === 'blocked' ? 'blocked' : 'not started'}</span>
            {it.note && <span className="block text-xs text-ink-mute">{it.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ActivityItem({ title, meta, children }: { title: string; meta?: string; children?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-3">
      <div>
        <p className="ds-body text-ink">{title}</p>
        {children && <div className="text-xs text-ink-mute">{children}</div>}
      </div>
      {meta && <span className="ds-numeric shrink-0 text-xs text-ink-mute">{meta}</span>}
    </div>
  );
}

/** Sticky mobile action bar — primary action stays in the thumb zone (§13). */
export function ActionBar({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  return (
    <div role="group" aria-label={label}
      className={clsx('sticky bottom-0 z-[var(--sf-z-sticky)] -mx-4 mt-4 flex gap-2 border-t border-line bg-ds-surface/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:mx-0 sm:justify-end sm:border-0 sm:p-0', className)}>
      {children}
    </div>
  );
}

/* ── Imagery (§22) — variants map to Stage 4 manifest usage classes ───── */
export type ImageVariant = 'hero' | 'garment' | 'fabric' | 'production' | 'editorial' | 'illustration';
const RATIOS: Record<ImageVariant, string> = {
  hero: '16 / 9', garment: '3 / 4', fabric: '1 / 1', production: '16 / 9', editorial: '3 / 4', illustration: 'auto',
};

export function ImageFrame({ variant, src, alt, className, eager, children }: {
  variant: ImageVariant; src?: string; alt: string; className?: string; eager?: boolean; children?: ReactNode;
}) {
  const ratio = RATIOS[variant];
  if (!src) {
    return (
      <div role="img" aria-label={alt} data-variant={variant}
        className={clsx('grid place-items-center rounded-xl border border-dashed border-line bg-ds-subtle text-ink-mute', className)}
        style={{ aspectRatio: ratio === 'auto' ? undefined : ratio, minHeight: ratio === 'auto' ? 96 : undefined }}>
        <span className="ds-label">No image available</span>
      </div>
    );
  }
  return (
    <figure data-variant={variant} className={clsx('relative overflow-hidden rounded-xl', className)}
      style={{ aspectRatio: ratio === 'auto' ? undefined : ratio }}>
      <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async"
        className="ds-motion-micro size-full object-cover" />
      {children /* e.g. selected-state ring overlay (Stage 8) */}
    </figure>
  );
}

/** Surface wrapper — density personality lives on the shell (§24). */
export const DensitySurface = ({ density, children, className, ...rest }:
  HTMLAttributes<HTMLDivElement> & { density: 'workspace' | 'developer' | 'platform' | 'public' }) => (
  <div {...rest} data-density={density} className={clsx('ds', className)}>
    {children}
  </div>
);
