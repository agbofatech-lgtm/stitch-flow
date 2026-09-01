import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export type NavEntry = {
  id: string;
  label: string;
  icon: ReactNode;
  current?: boolean;
};

export type NavSection = {
  id: string;
  label: string;
  items: NavEntry[];
};

export function AtelierNavigation({
  brand,
  workspaceName,
  sections,
  collapsed,
  mobileOpen,
  onCloseMobile,
  onSelect,
  footer,
}: {
  brand: ReactNode;
  workspaceName?: string;
  sections: NavSection[];
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSelect: (id: string) => void;
  footer?: ReactNode;
}) {
  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-overlay bg-ink-primary/35 lg:hidden"
          onClick={onCloseMobile}
        />
      ) : null}
      <aside
        aria-label="Atelier navigation"
        className={cn(
          'sf-nav-rail fixed inset-y-0 left-0 z-modal flex flex-col border-r border-line-subtle transition-[width,transform] duration-base ease-standard sf-motion-safe lg:static lg:translate-x-0',
          collapsed ? 'lg:w-[4.5rem]' : 'lg:w-64',
          mobileOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex items-center gap-3 border-b border-line-subtle px-3 py-4">{brand}</div>
        {!collapsed && workspaceName ? (
          <p className="truncate px-4 pt-3 text-meta uppercase tracking-[0.16em] text-ink-muted">
            {workspaceName}
          </p>
        ) : null}
        <nav aria-label="Studio workspaces" className="flex-1 space-y-4 overflow-y-auto p-2">
          {sections.map((section) => (
            <div key={section.id}>
              {!collapsed || mobileOpen ? (
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                  {section.label}
                </p>
              ) : (
                <p className="sr-only">{section.label}</p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item.id)}
                    className={cn(
                      'sf-focus-ring flex min-h-10 w-full items-center gap-3 rounded-sf px-3 py-2 text-left text-label',
                      item.current
                        ? 'bg-action-primary text-ink-inverse shadow-sf-sm'
                        : 'text-ink-secondary hover:bg-action-secondary'
                    )}
                    aria-current={item.current ? 'page' : undefined}
                  >
                    <span className="shrink-0" aria-hidden>
                      {item.icon}
                    </span>
                    {!collapsed || mobileOpen ? (
                      <span>{item.label}</span>
                    ) : (
                      <span className="sr-only">{item.label}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        {footer ? <div className="border-t border-line-subtle p-2">{footer}</div> : null}
      </aside>
    </>
  );
}
