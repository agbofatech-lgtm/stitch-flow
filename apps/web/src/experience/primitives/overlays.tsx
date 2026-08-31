import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-dropdown mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-sf-sm bg-ink-primary px-2 py-1 text-meta text-ink-inverse group-hover:block group-focus-within:block"
      >
        {label}
      </span>
    </span>
  );
}

export function Popover({
  trigger,
  children,
}: {
  trigger: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <div onClick={() => setOpen((value) => !value)}>{trigger}</div>
      {open ? (
        <div className="absolute z-dropdown mt-2 min-w-[12rem] rounded-sf border border-line bg-surface-elevated p-3 shadow-sf-md">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function Dialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const headingId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog overlay"
        className="absolute inset-0 bg-ink-primary/40"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        className="sf-focus-ring relative z-modal w-full max-w-lg rounded-sf-workspace bg-surface-elevated p-6 shadow-sf-lg"
      >
        <h2 id={headingId} className="text-heading text-ink-primary">
          {title}
        </h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-modal">
      <button type="button" aria-label="Close sheet overlay" className="absolute inset-0 bg-ink-primary/40" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-y-0 right-0 w-full max-w-md overflow-auto bg-surface-elevated p-6 shadow-sf-lg"
      >
        <h2 className="text-heading text-ink-primary">{title}</h2>
        <div className="mt-4">{children}</div>
      </aside>
    </div>
  );
}

export function Dropdown({
  label,
  items,
}: {
  label: string;
  items: Array<{ id: string; label: string; onSelect: () => void }>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        className="sf-focus-ring rounded-sf border border-line bg-surface-panel px-3 py-2 text-label"
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </button>
      {open ? (
        <ul role="menu" className="absolute z-dropdown mt-2 min-w-[10rem] rounded-sf border border-line bg-surface-elevated py-1 shadow-sf-md">
          {items.map((item) => (
            <li key={item.id} role="none">
              <button
                type="button"
                role="menuitem"
                className="sf-focus-ring w-full px-3 py-2 text-left text-body hover:bg-action-secondary"
                onClick={() => {
                  item.onSelect();
                  setOpen(false);
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function Menu(props: Parameters<typeof Dropdown>[0]) {
  return <Dropdown {...props} />;
}

export function Combobox({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const listId = useId();
  const filtered = options.filter((option) => option.toLowerCase().includes(value.toLowerCase()));
  return (
    <div>
      <label className="mb-1 block text-label text-ink-secondary" htmlFor={listId}>
        {label}
      </label>
      <input
        id={listId}
        role="combobox"
        aria-expanded={filtered.length > 0}
        aria-autocomplete="list"
        className="sf-focus-ring w-full rounded-sf border border-line px-3 py-2 text-body"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {filtered.length > 0 ? (
        <ul role="listbox" className="mt-1 max-h-40 overflow-auto rounded-sf border border-line bg-surface-elevated">
          {filtered.map((option) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={option === value}
                className={cn('w-full px-3 py-2 text-left text-body hover:bg-action-secondary', option === value && 'bg-action-secondary')}
                onClick={() => onChange(option)}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
