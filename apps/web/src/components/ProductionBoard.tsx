import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useWorkflow } from '../workflow/WorkflowContext';
import {
  AtelierConfidence,
  AtelierJourney,
  AtelierStage,
  AtelierThread,
  AtelierWorkroom,
  Button,
  ExperienceEmptyState,
  StatusBadge,
} from '../experience';
import { goAtelierRoom } from '../experience/atelier/navigate';
import { exportOrderJobSheetPdf } from '@modules/services/jobSheetExport';
import { getOrderAlerts } from '@shared/utils/productionAlerts';
import { PRODUCTION_STAGE_SEQUENCE } from '../domain/production/stages';
import type { Order, ProductionStage, ProductionStageStatus } from '../shared/types';

function stageLabel(code: string) {
  return code.replace(/_/g, ' ');
}

function recordedStage(order: Order, code: string): ProductionStage | undefined {
  return (order.productionStages || []).find((stage) => stage.code === code);
}

function activeStage(order: Order): ProductionStage | null {
  return (order.productionStages || []).find((stage) => stage.status === 'active') || null;
}

function statusCopy(status: ProductionStageStatus) {
  if (status === 'active') return 'Current';
  if (status === 'completed') return 'Recorded complete';
  if (status === 'skipped') return 'Recorded skipped';
  return 'Recorded pending';
}

export function ProductionBoard() {
  const { orders, customers, currentWorkspace, selectedOrderId } = useApp();
  const workflow = useWorkflow();
  const [query, setQuery] = useState('');

  const selectedId = workflow.orderId || selectedOrderId;
  const selectedOrder = orders.find((order) => order.id === selectedId) || null;
  const selectedClient =
    (selectedOrder && customers.find((customer) => customer.id === selectedOrder.customerId)?.fullName) || null;

  const visibleOrders = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((order) => {
      const client = customers.find((customer) => customer.id === order.customerId)?.fullName || '';
      return (
        order.orderNumber.toLowerCase().includes(term) ||
        (order.garmentType || '').toLowerCase().includes(term) ||
        client.toLowerCase().includes(term)
      );
    });
  }, [customers, orders, query]);

  function openOrder(orderId: string) {
    workflow.selectOrder(orderId);
  }

  const current = selectedOrder ? activeStage(selectedOrder) : null;
  const stages = selectedOrder?.productionStages || [];
  const plan = selectedOrder?.productionPlan || null;
  const alerts = selectedOrder ? getOrderAlerts(selectedOrder).alerts : [];

  function exportJobSheet() {
    if (!selectedOrder) return;
    exportOrderJobSheetPdf({
      order: selectedOrder,
      inspiration: null,
      selectedFabric: null,
      workspaceName: currentWorkspace.name || 'StitchFlow',
      logoUrl: currentWorkspace.logoUrl || null,
      phone: currentWorkspace.phone || '',
      email: currentWorkspace.email || '',
      address: currentWorkspace.address || '',
    });
  }

  return (
    <AtelierWorkroom
      place="Production floor"
      title={selectedClient || 'Select an order'}
      purpose={
        selectedOrder
          ? 'The garment is made here. Stages and plans come from this order record. Transitions are not executed from an unmounted HTTP path.'
          : 'Production requires an order on the thread. This floor does not invent a garment in motion.'
      }
      thread={
        <div className="space-y-1">
          <AtelierThread room="Production floor" client={selectedClient} order={selectedOrder?.orderNumber} />
          <AtelierJourney current="production" />
        </div>
      }
      confidence={
        <AtelierConfidence
          state="local"
          detail="AppContext workspace store. Same orders as the Floor. Not shop authority. Stage engine is not remounted."
        />
      }
      primaryAction={
        selectedOrder ? (
          <Button variant="primary" onClick={() => goAtelierRoom('business')}>
            Open ledger
          </Button>
        ) : (
          <Button variant="primary" onClick={() => goAtelierRoom('clients')}>
            Open client room
          </Button>
        )
      }
    >
      <div className="grid items-start gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <section data-production-queue="true" className={selectedOrder ? 'order-2 xl:order-1' : undefined}>
          <h3 className="font-display text-heading-sm text-ink-primary">Garments in this workspace</h3>
          <p className="mt-1 text-meta text-ink-muted">Selecting a garment continues the thread. Not a second production engine.</p>
          <div className="relative mt-3">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search order or client"
              aria-label="Search production orders"
              className="sf-focus-ring min-h-11 w-full rounded-sf border border-line bg-surface-panel px-3 py-2 text-body text-ink-primary outline-none placeholder:text-ink-muted"
            />
          </div>
          {orders.length === 0 ? (
            <div className="mt-4">
              <ExperienceEmptyState
                title="No orders in this workspace"
                description="Production appears here when an order exists in the local workspace store. Records are not loaded from an unmounted shop path."
              />
            </div>
          ) : visibleOrders.length === 0 ? (
            <div className="mt-4">
              <ExperienceEmptyState title="No orders match" description="Try a different order number, client, or garment." />
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-line-subtle border-t border-line-subtle">
              {visibleOrders.map((order) => {
                const client = customers.find((customer) => customer.id === order.customerId)?.fullName;
                const currentRow = order.id === selectedOrder?.id;
                const stage = activeStage(order);
                return (
                  <li key={order.id}>
                    <button
                      type="button"
                      aria-current={currentRow ? 'true' : undefined}
                      onClick={() => openOrder(order.id)}
                      className="sf-focus-ring sf-micro-press flex min-h-11 w-full items-center justify-between gap-3 py-3 text-left"
                    >
                      <span className="min-w-0">
                        <span className="block font-numeric text-body text-ink-primary">{order.orderNumber}</span>
                        <span className="block text-meta text-ink-muted">
                          {client || 'No client on this order'}
                          {order.garmentType ? (
                            <>
                              <span aria-hidden="true"> · </span>
                              {order.garmentType}
                            </>
                          ) : null}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <StatusBadge status={order.status} />
                        {stage ? (
                          <span className="mt-1 block text-meta text-ink-muted">{stageLabel(stage.code)}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section data-production-canvas="true" className={selectedOrder ? 'order-1 xl:order-2' : undefined}>
          {selectedOrder ? (
            <div className="space-y-6">
              <AtelierStage>
                <p className="text-meta text-ink-muted">Current work</p>
                <h2 className="mt-1 font-display text-heading text-ink-primary">
                  {selectedClient || 'No client on this order'}
                </h2>
                <p className="mt-2 font-numeric text-body text-ink-secondary">
                  {selectedOrder.orderNumber}
                  {selectedOrder.garmentType ? (
                    <>
                      <span aria-hidden="true"> · </span>
                      {selectedOrder.garmentType}
                    </>
                  ) : null}
                  <span aria-hidden="true"> · </span>
                  {selectedOrder.orderType}
                </p>
                <div className="mt-3">
                  <StatusBadge status={selectedOrder.status} />
                </div>
                <p className="mt-4 text-body text-ink-secondary">
                  {current
                    ? `Current recorded stage: ${stageLabel(current.code)} (${current.status}).`
                    : stages.length === 0
                      ? 'No production stages on this order. Stages are not invented from order status.'
                      : 'No active stage on this order. Recorded stages are listed below.'}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => goAtelierRoom('design')}>
                    Open design table
                  </Button>
                  <Button variant="ghost" onClick={exportJobSheet}>
                    Export job sheet
                  </Button>
                </div>
              </AtelierStage>

              <section>
                <h3 className="font-display text-heading-sm text-ink-primary">Production stages</h3>
                <p className="mt-1 text-meta text-ink-muted">
                  Canonical sequence from the domain. Statuses are the order record. Start/complete is not offered here
                  because the unmounted HTTP transition path is not product authority and /shop is not this stage.
                </p>
                <ol className="mt-3 divide-y divide-line-subtle border-t border-line-subtle">
                  {PRODUCTION_STAGE_SEQUENCE.map((code) => {
                    const stage = recordedStage(selectedOrder, code);
                    const currentRow = current?.code === code;
                    return (
                      <li key={code} className="flex min-h-11 items-center justify-between gap-3 py-3">
                        <span>
                          <span className="block text-label text-ink-primary">{stageLabel(code)}</span>
                          {stage?.notes ? (
                            <span className="mt-1 block text-meta text-ink-muted">{stage.notes}</span>
                          ) : null}
                        </span>
                        <span className="shrink-0 text-right text-meta text-ink-muted">
                          {stage ? (currentRow ? 'Current · ' : '') + statusCopy(stage.status) : 'Not on this order'}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </section>

              <section>
                <h3 className="font-display text-heading-sm text-ink-primary">Production plan</h3>
                {plan ? (
                  <div className="mt-3 space-y-3 text-body text-ink-secondary">
                    {plan.fabricEstimate ? (
                      <p>
                        Fabric estimate on this order:{' '}
                        <span className="font-numeric">
                          {plan.fabricEstimate.mainFabricQty} {plan.fabricEstimate.unit}
                        </span>
                        {plan.fabricEstimate.fabricType ? ` · ${plan.fabricEstimate.fabricType}` : ''}
                        . Not a live stock count.
                      </p>
                    ) : (
                      <p>No fabric estimate on this plan.</p>
                    )}
                    <p>
                      Cutting pieces recorded: {plan.cuttingList?.length || 0}. Sewing steps recorded:{' '}
                      {plan.sewingChecklist?.length || 0}. Fit-risk notes recorded: {plan.fitRisks?.length || 0}.
                    </p>
                    {plan.tailorNotes?.length ? (
                      <ul className="list-disc space-y-1 pl-5 text-meta text-ink-muted">
                        {plan.tailorNotes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-3">
                    <ExperienceEmptyState
                      title="No production plan on this order"
                      description="A plan is attached through the existing T3 production wrapper in the workflow inspector. This floor does not generate one and does not rewrite the Production Assistant."
                    />
                  </div>
                )}
              </section>

              {alerts.length > 0 ? (
                <section>
                  <h3 className="font-display text-heading-sm text-ink-primary">Attention</h3>
                  <p className="mt-1 text-meta text-ink-muted">Signals from the existing production-alert helper. Not a new engine.</p>
                  <ul className="mt-3 space-y-2">
                    {alerts.map((alert, index) => (
                      <li key={`${alert.code}-${index}`} className="rounded-sf border border-line bg-surface-panel p-3">
                        <p className="text-label text-ink-primary">{alert.title}</p>
                        <p className="mt-1 text-meta text-ink-muted">{alert.message}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section>
                <h3 className="font-display text-heading-sm text-ink-primary">Order notes</h3>
                <p className="mt-3 text-body text-ink-secondary whitespace-pre-wrap">
                  {selectedOrder.notes || 'No notes on this order.'}
                </p>
              </section>
            </div>
          ) : (
            <ExperienceEmptyState
              title="No order on this thread"
              description="Select a garment from the list, or open the client room. This floor does not borrow the first order."
              action={
                <Button onClick={() => goAtelierRoom('clients')}>Open client room</Button>
              }
            />
          )}
        </section>
      </div>
    </AtelierWorkroom>
  );
}
