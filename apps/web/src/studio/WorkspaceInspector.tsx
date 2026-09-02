import { Badge, Button, Panel } from '../experience';
import { PRODUCTION_STAGE_SEQUENCE } from '../domain/production/stages';
import type { BusinessSurface, StudioWorkspaceId } from './workspaces';
import { BUSINESS_SURFACES } from './workspaces';

export function WorkspaceInspector({
  workspace,
  business,
  customers,
  orders,
  attention,
  clientName,
  orderNumber,
  onOpenBusiness,
}: {
  workspace: StudioWorkspaceId;
  business: BusinessSurface;
  customers: number;
  orders: number;
  attention: number;
  clientName?: string | null;
  orderNumber?: string | null;
  onOpenBusiness: (id: BusinessSurface) => void;
}) {
  return (
    <div className="space-y-4 p-4">
      <div>
        <p className="text-meta uppercase tracking-[0.16em] text-ink-muted">Inspector</p>
        <h2 className="text-heading-sm text-ink-primary">Context</h2>
        <p className="mt-1 text-meta text-ink-muted">Supporting information. Not a second domain authority.</p>
      </div>

      {workspace === 'command' ? (
        <Panel>
          <p className="text-label">Attention</p>
          <p className="mt-2 text-heading">{attention}</p>
          <p className="mt-1 text-meta text-ink-muted">Alerts and in-progress orders. Not a analytics rebuild.</p>
        </Panel>
      ) : null}

      {workspace === 'clients' ? (
        <Panel>
          <p className="text-label">Active relationship</p>
          <p className="mt-2 text-body text-ink-primary">{clientName || 'No client selected'}</p>
          {orderNumber ? <p className="mt-1 font-numeric text-meta text-ink-muted">{orderNumber}</p> : null}
          <p className="mt-3 text-meta text-ink-muted">
            {customers} people in this workspace store. Not shop authority.
          </p>
        </Panel>
      ) : null}

      {workspace === 'measurements' ? (
        <Panel>
          <p className="text-label">Domain boundary</p>
          <p className="mt-2 text-body text-ink-primary">{clientName || 'No client selected'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>Body</Badge>
            <Badge tone="neutral">Garment</Badge>
            <Badge tone="warning">Pattern derived</Badge>
          </div>
          <p className="mt-3 text-meta text-ink-muted">No second measurement authority. No new localStorage.</p>
        </Panel>
      ) : null}

      {workspace === 'design' ? (
        <Panel>
          <p className="text-label">Protected design</p>
          <p className="mt-2 text-body text-ink-primary">{clientName || 'No client on this thread'}</p>
          {orderNumber ? <p className="mt-1 font-numeric text-meta text-ink-muted">{orderNumber}</p> : null}
          <p className="mt-3 text-meta text-ink-muted">
            Hosted studio. Finalize for Production stays inside Design Studio. This inspector does not create a second finalize. Pattern Engine remains behind T3.
          </p>
        </Panel>
      ) : null}

      {workspace === 'production' ? (
        <Panel>
          <p className="text-label">Stage sequence</p>
          <ol className="mt-3 list-decimal space-y-1 pl-4 text-body text-ink-secondary">
            {PRODUCTION_STAGE_SEQUENCE.map((code) => (
              <li key={code}>{code.replace('_', ' ')}</li>
            ))}
          </ol>
        </Panel>
      ) : null}

      {workspace === 'business' ? (
        <Panel>
          <p className="text-label">Business surfaces</p>
          <div className="mt-3 space-y-2">
            {BUSINESS_SURFACES.map((surface) => (
              <Button
                key={surface.id}
                variant={business === surface.id ? 'primary' : 'secondary'}
                size="sm"
                className="w-full"
                onClick={() => onOpenBusiness(surface.id)}
              >
                {surface.label}
              </Button>
            ))}
          </div>
          <p className="mt-3 text-meta text-ink-muted">{orders} local orders. Commercial platform is locked.</p>
        </Panel>
      ) : null}
    </div>
  );
}
