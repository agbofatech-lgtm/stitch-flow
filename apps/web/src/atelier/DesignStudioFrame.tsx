import type { ReactNode } from 'react';
import { AtelierConfidence, AtelierThread, AtelierWorkroom, Badge } from '../experience';

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
    <AtelierWorkroom
      place="Design table"
      title="Protected studio"
      purpose="Geometry stays inside the hosted studio. This frame does not rewrite the engine."
      thread={<AtelierThread room="Design table" client={client} order={order} />}
      confidence={<AtelierConfidence state="local" detail="Hosted — not rewritten" />}
      primaryAction={<Badge tone="neutral">Hosted — not rewritten</Badge>}
    >
      <div className="min-h-0 overflow-auto rounded-sf-lg border border-line bg-surface-workspace">{children}</div>
    </AtelierWorkroom>
  );
}
