import type { ReactNode } from 'react';
import { Badge } from '../experience';

/** Presentation chrome only. Must not import patternEngine or rewrite DesignStudio. */
export function DesignStudioFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-surface-canvas">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle bg-surface-elevated/90 px-4 py-3">
        <div>
          <p className="text-meta uppercase tracking-[0.16em] text-ink-muted">Creative workroom</p>
          <p className="font-display text-heading-sm text-ink-primary">Design Studio</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="neutral">Protected engine hosted — not rewritten</Badge>
          <Badge>Draft geometry remains inside Studio</Badge>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}
