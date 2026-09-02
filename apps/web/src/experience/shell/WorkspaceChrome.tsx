import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export function WorkspaceHeader({
  kicker,
  title,
  description,
  state,
  actions,
}: {
  kicker: string;
  title: string;
  description?: string;
  state?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-sticky border-b border-line-subtle bg-surface-elevated">
      <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
        <div className="min-w-0 flex-1">
          <p className="text-meta text-ink-muted">{kicker}</p>
          <h1 className="font-display text-heading-sm leading-tight text-ink-primary">{title}</h1>
          {description ? (
            <p className="mt-0.5 hidden text-meta text-ink-muted lg:block">{description}</p>
          ) : null}
        </div>
        {state ? <div className="hidden items-center gap-2 lg:flex">{state}</div> : null}
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

export function WorkspaceToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 border-b border-line-subtle bg-surface-panel px-3 py-2',
        className
      )}
    >
      {children}
    </div>
  );
}

export function WorkspaceCanvas({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn('min-h-full bg-transparent', className)}>{children}</div>;
}

export function WorkspacePanel({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-sf-lg border border-line bg-surface-panel p-5 shadow-sf-sm', className)}>
      {title ? <h2 className="font-display text-heading-sm text-ink-primary">{title}</h2> : null}
      {children}
    </section>
  );
}

export function InspectorPanel({
  title = 'Inspector',
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <aside
      aria-label={title}
      className="hidden w-80 shrink-0 overflow-auto border-l border-line-subtle bg-surface-workspace/90 xl:block"
    >
      {children}
    </aside>
  );
}

export function ContextBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line-subtle bg-surface-workspace px-3 py-2">
      {children}
    </div>
  );
}

export function StatusBar({ children }: { children: ReactNode }) {
  return (
    <footer className="flex items-center justify-between gap-3 border-t border-line-subtle bg-surface-panel px-3 py-2 text-meta text-ink-muted">
      {children}
    </footer>
  );
}
