/** StitchFlow Design System — overlays (Stage 5 §16).
 *  Dialog/Drawer: modal semantics, Escape to close, focus moved in on open
 *  and restored on close, scroll locked. Drawer is right-side on desktop,
 *  bottom sheet on mobile (Stage 3 §10). Tier-2 FUNCTIONAL motion only. */
import { clsx } from 'clsx';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { IconButton } from './Button';

/** Reusable modal behaviour (focus-in/restore, trap, Escape, scroll lock) —
    exported in Stage 6 for the shell account menu (documented DS extension). */
export function useModalBehaviour(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    restoreTo.current = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      (el ?? ref.current)?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const items = Array.from(ref.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])') ?? []);
      if (!items.length) return;
      const first = items[0]; const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      restoreTo.current?.focus?.();
    };
  }, [open, onClose]);
  return ref;
}

export function Dialog({ open, onClose, title, children, footer }:
  { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useModalBehaviour(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[var(--sf-z-overlay)] flex items-center justify-center p-4" data-ds-overlay="dialog">
      <div className="absolute inset-0 bg-[var(--ds-overlay)]" onClick={onClose} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
        className="ds-motion-fast relative z-10 w-full max-w-lg rounded-2xl border border-line bg-ds-raised shadow-[var(--sf-e4)]">
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <h2 className="ds-section text-ink">{title}</h2>
          <IconButton label="Close dialog" className="min-h-8 h-8 w-8" onClick={onClose}>✕</IconButton>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line bg-ds-subtle/60 p-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children, footer, width = 480 }:
  { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; width?: number }) {
  const ref = useModalBehaviour(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[var(--sf-z-overlay)]" data-ds-overlay="drawer">
      <div className="absolute inset-0 bg-[var(--ds-overlay)]" onClick={onClose} aria-hidden="true" />
      {/* mobile: bottom sheet · desktop: right drawer (Stage 3 §10) */}
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
        style={{ '--drawer-w': `${width}px` } as React.CSSProperties}
        className={clsx(
          'ds-motion-fast absolute z-10 flex flex-col border-line bg-ds-raised shadow-[var(--sf-e4)]',
          'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t',
          'sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-[var(--drawer-w)] sm:rounded-t-none sm:border-l sm:border-t-0',
        )}>
        <div className="flex items-center justify-between gap-4 border-b border-line p-4">
          <h2 className="ds-section text-ink">{title}</h2>
          <IconButton label="Close panel" className="min-h-8 h-8 w-8" onClick={onClose}>✕</IconButton>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <div className="border-t border-line bg-ds-subtle/60 p-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const id = `tt-${label.replace(/\W+/g, '').slice(0, 24)}`;
  return (
    <span className="relative inline-flex" tabIndex={0} aria-describedby={id}>
      {children}
      <span role="tooltip" id={id}
        className="pointer-events-none absolute bottom-full left-1/2 z-[var(--sf-z-dropdown)] mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-ds-raised px-2 py-1 text-xs text-ink shadow-[var(--sf-e2)] group-focus-within:block hover:block [.relative:hover>&]:block">
        {label}
      </span>
    </span>
  );
}
