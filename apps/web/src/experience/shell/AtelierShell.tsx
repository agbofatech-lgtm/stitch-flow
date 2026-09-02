import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export type ShellPlane = 'atelier' | 'control';

export function AtelierShell({
  plane = 'atelier',
  placeId,
  navigation,
  header,
  toolbar,
  children,
  inspector,
  statusBar,
  mobileNav,
  toasts,
}: {
  plane?: ShellPlane;
  placeId?: string;
  navigation: ReactNode;
  header: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  inspector?: ReactNode;
  statusBar?: ReactNode;
  mobileNav?: ReactNode;
  toasts?: ReactNode;
}) {
  return (
    <div
      data-plane={plane}
      data-atelier-place={placeId}
      data-theme={plane === 'control' ? 'dark' : undefined}
      className={cn(
        'flex min-h-screen text-ink-primary',
        plane === 'control' ? 'bg-surface-canvas' : 'sf-atelier-atmosphere'
      )}
    >
      <a href="#workspace-main" className="sf-skip-link">
        Skip to workspace
      </a>
      {navigation}
      <div className="flex min-w-0 flex-1 flex-col">
        {header}
        {toolbar}
        <div className="flex min-h-0 flex-1">
          <main id="workspace-main" className="min-w-0 flex-1 overflow-auto" tabIndex={-1}>
            {children}
          </main>
          {inspector}
        </div>
        {statusBar}
        {mobileNav}
      </div>
      {toasts}
    </div>
  );
}
