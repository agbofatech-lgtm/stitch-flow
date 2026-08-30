/** StitchFlow Design System — navigation & data (Stage 5 §16).
 *  Tabs: full WAI-ARIA tabs pattern (roving tabindex, arrows, Home/End).
 *  Table: semantic table in an overflow-x container (horizontal scroll is
 *  the desktop small-viewport policy; card-transform for mobile lists is
 *  a Stage 7+ per-screen decision — primitive provided via DataList). */
import { clsx } from 'clsx';
import { useRef, useState, type ReactNode, type TableHTMLAttributes } from 'react';

export function Tabs({ tabs, initial = 0 }: { tabs: Array<{ id: string; label: string; content: ReactNode }>; initial?: number }) {
  const [active, setActive] = useState(initial);
  const listRef = useRef<HTMLDivElement>(null);
  const onKeyDown = (e: React.KeyboardEvent) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'Home' ? -Infinity : e.key === 'End' ? Infinity : 0;
    if (dir === 0) return;
    e.preventDefault();
    const next = dir === -Infinity ? 0 : dir === Infinity ? tabs.length - 1 : (active + dir + tabs.length) % tabs.length;
    setActive(next);
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };
  return (
    <div>
      <div ref={listRef} role="tablist" onKeyDown={onKeyDown} className="flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t, i) => (
          <button
            key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={i === active} aria-controls={`panel-${t.id}`}
            tabIndex={i === active ? 0 : -1} onClick={() => setActive(i)}
            className={clsx(
              'ds-motion-micro -mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-focus',
              i === active ? 'border-ds-accent text-ink' : 'border-transparent text-ink-mute hover:text-ink',
            )}>
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={i !== active}
          className="pt-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ds-focus" tabIndex={0}>
          {t.content}
        </div>
      ))}
    </div>
  );
}

export function StepIndicator({ steps, current }: { steps: Array<{ id: string; label: string }>; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Workflow steps">
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li key={s.id} aria-current={state === 'current' ? 'step' : undefined} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden="true" className="text-ink-mute">›</span>}
            <span className={clsx('ds-motion-micro inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
              state === 'done' && 'border-ds-success text-ds-success',
              state === 'current' && 'border-ds-accent bg-ds-accent text-ds-surface',
              state === 'todo' && 'border-line text-ink-mute')}>
              <span aria-hidden="true" className="ds-numeric">{state === 'done' ? '✓' : i + 1}</span>{s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function Table({ children, className, caption, ...rest }:
  TableHTMLAttributes<HTMLTableElement> & { caption?: string }) {
  return (
    <div className="ds-motion-none w-full overflow-x-auto rounded-2xl border border-line bg-ds-surface" tabIndex={0}
      role="region" aria-label={caption ?? 'Data table'} data-motion="none">
      <table {...rest} className={clsx('w-full border-collapse text-sm', className)}
        style={{ '--row-h': 'var(--ds-row-h)' } as React.CSSProperties}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

export const Th = ({ children, numeric }: { children: ReactNode; numeric?: boolean }) => (
  <th scope="col" className={clsx('ds-label border-b border-line px-4 py-3 text-left', numeric && 'text-right')}>
    {children}
  </th>
);

export const Td = ({ children, numeric, className }: { children: ReactNode; numeric?: boolean; className?: string }) => (
  <td className={clsx('ds-body border-b border-line px-4 text-ink', numeric && 'ds-numeric text-right', className)}
    style={{ height: 'var(--ds-row-h)' }}>
    {children}
  </td>
);

/** Mobile-friendly stacked record list (the §13 table-transformation partner). */
export const DataList = ({ items, label }: { items: Array<{ title: ReactNode; rows: Array<[string, ReactNode]> }>; label: string }) => {
  return (
    <dl aria-label={label} className="flex flex-col gap-3 lg:hidden">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-line bg-ds-surface p-4">
          <dt className="ds-section mb-2 text-ink">{it.title}</dt>
          <div className="flex flex-col gap-1">
            {it.rows.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4">
                <dt className="ds-label">{k}</dt>
                <dd className="ds-body text-ink">{v}</dd>
              </div>
            ))}
          </div>
        </div>
      ))}
    </dl>
  );
}
