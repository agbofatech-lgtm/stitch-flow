import type { ReactNode } from 'react';
import {
  AtelierConfidence,
  AtelierJourney,
  AtelierThread,
  AtelierWorkroom,
} from '../experience';

/** Presentation chrome only. Must not import patternEngine or rewrite DesignStudio. */
export function DesignStudioFrame({
  children,
  client,
  order,
  garment,
}: {
  children: ReactNode;
  client?: string | null;
  order?: string | null;
  garment?: string | null;
}) {
  const threadClient = client || null;
  const detail = [
    garment ? `Garment ${garment}` : null,
    'Hosted — not rewritten. Finalize remains inside the studio.',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <AtelierWorkroom
      density="canvas"
      place="Design table"
      title={threadClient || 'Design table'}
      purpose={
        threadClient
          ? 'Protected studio for this fitting. Geometry stays inside. This frame does not rewrite the engine.'
          : 'No client on this thread. The hosted studio can still use its own order selector. This frame does not invent a client.'
      }
      thread={
        <div className="space-y-1">
          <AtelierThread room="Design table" client={threadClient} order={order} />
          <AtelierJourney current="design" />
        </div>
      }
      confidence={<AtelierConfidence state="local" detail={detail} />}
    >
      <div data-design-host="true" className="min-h-0 overflow-x-auto">
        {children}
      </div>
    </AtelierWorkroom>
  );
}
