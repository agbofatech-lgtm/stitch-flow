import { useMemo, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Dialog } from './overlays';

export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ id: string; label: string; panel: ReactNode }>;
  value: string;
  onChange: (id: string) => void;
}) {
  const active = tabs.find((tab) => tab.id === value) || tabs[0];
  return (
    <div>
      <div role="tablist" className="flex gap-1 rounded-sf bg-action-secondary p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === active.id}
            className={cn(
              'sf-focus-ring flex-1 rounded-sf-sm px-3 py-2 text-label',
              tab.id === active.id ? 'bg-surface-panel text-ink-primary shadow-sf-sm' : 'text-ink-muted'
            )}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-4">
        {active.panel}
      </div>
    </div>
  );
}

export function Breadcrumb({
  items,
}: {
  items: Array<{ id: string; label: string; onClick?: () => void }>;
}) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-meta text-ink-muted">
        {items.map((item, index) => (
          <li key={item.id} className="flex items-center gap-2">
            {item.onClick ? (
              <button type="button" className="sf-focus-ring text-action-primary" onClick={item.onClick}>
                {item.label}
              </button>
            ) : (
              <span aria-current={index === items.length - 1 ? 'page' : undefined}>{item.label}</span>
            )}
            {index < items.length - 1 ? <span aria-hidden>/</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function CommandMenu({
  open,
  onClose,
  commands,
}: {
  open: boolean;
  onClose: () => void;
  commands: Array<{ id: string; label: string; onSelect: () => void }>;
}) {
  const [query, setQuery] = useState('');
  const matches = useMemo(
    () => commands.filter((command) => command.label.toLowerCase().includes(query.toLowerCase())),
    [commands, query]
  );

  return (
    <Dialog open={open} title="Command menu" onClose={onClose}>
      <input
        autoFocus
        aria-label="Filter commands"
        className="sf-focus-ring w-full rounded-sf border border-line px-3 py-2 text-body"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <ul className="mt-3 max-h-56 overflow-auto">
        {matches.map((command) => (
          <li key={command.id}>
            <button
              type="button"
              className="sf-focus-ring w-full rounded-sf px-3 py-2 text-left text-body hover:bg-action-secondary"
              onClick={() => {
                command.onSelect();
                onClose();
              }}
            >
              {command.label}
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
