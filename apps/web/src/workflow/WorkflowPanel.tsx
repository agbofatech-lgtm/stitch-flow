import { Badge, Button, ExperienceEmptyState, Panel } from '../experience';
import { useApp } from '../context/AppContext';
import { useWorkflow } from './WorkflowContext';
import { PRODUCTION_STAGE_SEQUENCE } from '../domain/production/stages';

const STEPS = [
  'Customer',
  'Measurement',
  'Design',
  'Garment spec',
  'Pattern',
  'Materials',
  'Order',
  'Production',
  'Delivery',
];

export function WorkflowPanel() {
  const app = useApp();
  const workflow = useWorkflow();
  const customer = app.customers.find((item) => item.id === workflow.customerId);
  const profiles = app.measurementProfiles.filter((item) => item.customerId === workflow.customerId);
  const orders = app.orders.filter((item) => !workflow.customerId || item.customerId === workflow.customerId);
  const order = app.orders.find((item) => item.id === workflow.orderId);
  const fabric = app.fabricRecords.find((item) => item.id === workflow.specification?.fabricRecordId);
  const estimate = order?.productionPlan?.fabricEstimate;

  return (
    <div className="space-y-4 p-4">
      <div>
        <p className="text-meta uppercase tracking-[0.16em] text-ink-muted">Workflow</p>
        <h2 className="text-heading-sm">End-to-end context</h2>
      </div>

      <ol className="flex flex-wrap gap-1">
        {STEPS.map((step) => (
          <li key={step}>
            <Badge tone="neutral">{step}</Badge>
          </li>
        ))}
      </ol>

      {workflow.lastMessage ? <p className="text-meta text-status-success">{workflow.lastMessage}</p> : null}
      {workflow.lastError ? (
        <p role="alert" className="text-meta text-status-danger">
          {workflow.lastError}
        </p>
      ) : null}

      <Panel>
        <p className="text-label">Next</p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-meta text-ink-secondary">
          {workflow.nextActions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <p className="text-label">Customer</p>
        <select
          className="sf-focus-ring mt-2 w-full rounded-sf border border-line bg-surface-panel px-2 py-2 text-body"
          value={workflow.customerId || ''}
          onChange={(event) => workflow.selectCustomer(event.target.value || null)}
          aria-label="Select workflow customer"
        >
          <option value="">Select customer</option>
          {app.customers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.fullName}
            </option>
          ))}
        </select>
        {!app.customers.length ? (
          <ExperienceEmptyState
            title="No studio customers"
            description="Workflow uses AppContext clients — the same population as the Client room. Not shop authority."
          />
        ) : null}
        {customer ? <p className="mt-2 text-meta text-ink-muted">{customer.phone || 'No phone'}</p> : null}
      </Panel>

      <Panel>
        <p className="text-label">Measurement version</p>
        <select
          className="sf-focus-ring mt-2 w-full rounded-sf border border-line bg-surface-panel px-2 py-2 text-body"
          value={workflow.profileId || ''}
          onChange={(event) => workflow.selectProfile(event.target.value || null)}
          aria-label="Select measurement profile"
        >
          <option value="">Select profile</option>
          {profiles.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>Body {Object.keys(workflow.specification?.separated.body.fields || {}).length}</Badge>
          <Badge tone="neutral">
            Garment {Object.keys(workflow.specification?.separated.garment.fields || {}).length}
          </Badge>
          <Badge tone="warning">Pattern derived</Badge>
        </div>
        <Button className="mt-3 w-full" size="sm" onClick={() => workflow.freezeMeasurementsOnOrder()}>
          Freeze onto order
        </Button>
        <p className="mt-2 text-meta text-ink-muted">
          History intact: {workflow.historyIntact ? 'yes' : 'check snapshot'} · captured{' '}
          {workflow.specification?.measurementVersionCapturedAt || 'not frozen'}
        </p>
      </Panel>

      <Panel>
        <p className="text-label">Order</p>
        <select
          className="sf-focus-ring mt-2 w-full rounded-sf border border-line bg-surface-panel px-2 py-2 text-body"
          value={workflow.orderId || ''}
          onChange={(event) => workflow.selectOrder(event.target.value || null)}
          aria-label="Select workflow order"
        >
          <option value="">Select order</option>
          {orders.map((item) => (
            <option key={item.id} value={item.id}>
              {item.orderNumber}
            </option>
          ))}
        </select>
        <p className="mt-2 text-meta text-ink-muted">{workflow.orderWorkflowLabel}</p>
      </Panel>

      <Panel>
        <p className="text-label">Design → spec → pattern</p>
        <p className="mt-1 text-meta text-ink-muted">
          Kind {workflow.specification?.patternKind || '—'} · Studio hosted, not rewritten
        </p>
        <div className="mt-3 space-y-2">
          <Button variant="secondary" size="sm" className="w-full" onClick={workflow.saveStudioToOrder}>
            Save hosted studio output to order
          </Button>
          <Button variant="secondary" size="sm" className="w-full" onClick={workflow.generatePattern}>
            Generate pattern (T3 wrapper)
          </Button>
          <Button variant="secondary" size="sm" className="w-full" onClick={() => void workflow.snapshotSpecToRepository()}>
            Snapshot spec to T2
          </Button>
        </div>
        {workflow.patternSummary ? (
          <p className="mt-2 text-meta">
            Pattern artifact: {workflow.patternSummary.kind} · {workflow.patternSummary.pointCount} points
          </p>
        ) : (
          <p className="mt-2 text-meta text-ink-muted">No pattern artifact in this session.</p>
        )}
      </Panel>

      <Panel>
        <p className="text-label">Materials</p>
        {estimate ? (
          <p className="mt-2 text-body">
            {estimate.mainFabricQty} {estimate.unit} · {fabric?.name || estimate.fabricType || 'unspecified fabric'}
          </p>
        ) : (
          <p className="mt-2 text-meta text-ink-muted">
            Material qty comes from the production plan estimate. Advanced fabric intelligence is not claimed (Phase 16 locked).
          </p>
        )}
      </Panel>

      <Panel>
        <p className="text-label">Production → QC → delivery</p>
        <Button className="mt-3 w-full" size="sm" onClick={workflow.generateProduction}>
          Attach production plan
        </Button>
        <ol className="mt-3 list-decimal space-y-1 pl-4 text-meta text-ink-secondary">
          {PRODUCTION_STAGE_SEQUENCE.map((code) => {
            const stage = order?.productionStages?.find((item) => item.code === code);
            return (
              <li key={code}>
                {code.replace('_', ' ')}
                {stage ? ` · ${stage.status}` : ''}
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-meta text-ink-muted">
          QC is first/second fitting in the existing stage codes. Delivery is order status delivered / stage delivered.
        </p>
      </Panel>
    </div>
  );
}
