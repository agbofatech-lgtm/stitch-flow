import { useEffect, useMemo, useState } from 'react';
import { Dialog } from '../primitives/overlays';
import { filterCommands, groupCommands, type CommandEntry } from './commands';

export function CommandPalette({
  open,
  onClose,
  commands,
}: {
  open: boolean;
  onClose: () => void;
  commands: CommandEntry[];
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const matches = useMemo(() => filterCommands(commands, query), [commands, query]);
  const grouped = useMemo(() => groupCommands(matches), [matches]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  return (
    <Dialog open={open} title="Go to a room" onClose={onClose}>
      <p className="mb-3 text-meta text-ink-muted">
        Move through the atelier. Authorization and data stores are unchanged.
      </p>
      <input
        autoFocus
        aria-label="Filter commands"
        className="sf-focus-ring min-h-11 w-full rounded-sf border border-line px-3 py-2 text-body"
        placeholder="Search rooms, clients, or orders…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((value) => Math.min(matches.length - 1, value + 1));
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((value) => Math.max(0, value - 1));
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            const selected = matches[active];
            if (selected) {
              selected.onSelect();
              onClose();
            }
          }
        }}
      />
      <div className="mt-3 max-h-[min(18rem,45vh)] overflow-auto">
        {matches.length === 0 ? (
          <p className="px-3 py-6 text-center text-body text-ink-muted">No matching commands in this workspace.</p>
        ) : (
          grouped.map((section) => (
            <div key={section.group} className="mb-3">
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                {section.group}
              </p>
              <ul>
                {section.items.map((command) => {
                  const index = matches.findIndex((item) => item.id === command.id);
                  return (
                    <li key={command.id}>
                      <button
                        type="button"
                        className={`sf-focus-ring min-h-11 w-full rounded-sf px-3 py-2 text-left text-body ${
                          index === active ? 'bg-action-secondary text-ink-primary' : 'hover:bg-action-secondary'
                        }`}
                        onClick={() => {
                          command.onSelect();
                          onClose();
                        }}
                      >
                        {command.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </Dialog>
  );
}
