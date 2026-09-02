import type { ReactNode } from 'react';
import { Badge } from '../experience';

/** Presentation chrome only. Must not import patternEngine or rewrite DesignStudio. */
export function DesignStudioFrame({
  children,
  client,
  order,
}: {
  children: ReactNode;
  client?: string | null;
  order?: string | null;
}) {
  return (
    <div className="flex min-h-full flex-col bg-surface-workspace">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-panel px-4 py-3">
        <div>
          <p className="text-meta text-ink-muted">Design table</p>
          <p className="font-display text-heading-sm text-ink-primary">Protected studio</p>
          <p className="mt-1 text-meta text-ink-muted">
            {client ? `Client ${client}` : 'No active client'}
            {order ? ` · ${order}` : ''}
            . Geometry stays inside the hosted studio.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="neutral">Hosted — not rewritten</Badge>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}
