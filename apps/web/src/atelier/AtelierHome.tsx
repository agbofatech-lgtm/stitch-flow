import {
  AtelierConfidence,
  AtelierStage,
  AtelierThread,
  AtelierWorkroom,
  Button,
  ExperienceEmptyState,
  StatusBadge,
} from '../experience';
import { useApp } from '../context/AppContext';
import { goAtelierRoom } from '../experience/atelier/navigate';

function alertLabel(type: string) {
  if (type === 'order_due_today') return 'Due today';
  if (type === 'invoice_overdue') return 'Invoice overdue';
  if (type === 'balance_pending') return 'Balance pending';
  return type.replace(/_/g, ' ');
}

export function AtelierHome() {
  const {
    currentWorkspace,
    customers,
    orders,
    dueAlerts,
    setView,
    selectedOrderId,
    selectOrder,
  } = useApp();
  const active = orders.filter((order) => order.status === 'in_progress' || order.status === 'ready');
  const people = customers.slice(0, 8);
  const openAlerts = (dueAlerts || []).filter((alert) => !alert.isResolved);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) || null;
  const threadClient =
    (selectedOrder && customers.find((customer) => customer.id === selectedOrder.customerId)?.fullName) || null;

  function openProduction(orderId: string) {
    selectOrder(orderId);
    setView('production-board');
  }

  return (
    <AtelierWorkroom
      place="Floor"
      title={currentWorkspace.name}
      purpose="Orient. See what needs a human."
      thread={<AtelierThread room="Floor" client={threadClient} order={selectedOrder?.orderNumber} />}
      confidence={
        <AtelierConfidence state="local" detail="AppContext workspace store. Not remote shop authority." />
      }
      primaryAction={
        threadClient ? (
          <Button variant="primary" onClick={() => goAtelierRoom('measurements')}>
            Continue to measurements
          </Button>
        ) : (
          <Button variant="primary" onClick={() => setView('customers')}>
            Open client room
          </Button>
        )
      }
      aside={
        <div className="space-y-4">
          <section>
            <p className="text-meta text-ink-muted">Attention</p>
            {openAlerts.length === 0 ? (
              <p className="mt-2 text-body text-ink-secondary">Quiet floor. No unresolved alerts in this workspace.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {openAlerts.slice(0, 6).map((alert) => {
                  const order = orders.find((item) => item.id === alert.orderId);
                  return (
                    <li key={alert.id}>
                      <button
                        type="button"
                        className="sf-focus-ring sf-micro-press min-h-11 w-full rounded-sf border border-line bg-surface-panel px-3 py-2 text-left"
                        onClick={() => (alert.orderId ? openProduction(alert.orderId) : setView('orders'))}
                      >
                        <span className="text-label text-ink-primary">{alertLabel(alert.alertType)}</span>
                        <span className="mt-0.5 block font-numeric text-meta text-ink-muted">
                          {order?.orderNumber || 'Workspace alert'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <section>
            <p className="text-meta text-ink-muted">Begin</p>
            <div className="mt-2 flex flex-col gap-2">
              <Button variant="secondary" onClick={() => setView('customers')}>
                Open client room
              </Button>
              <Button variant="ghost" onClick={() => goAtelierRoom('measurements')}>
                Measurement table
              </Button>
            </div>
          </section>
        </div>
      }
    >
      {selectedOrder ? (
        <AtelierStage>
          <p className="text-meta text-ink-muted">Active thread</p>
          <h2 className="mt-1 font-display text-heading text-ink-primary">{threadClient}</h2>
          <p className="mt-1 font-numeric text-body text-ink-secondary">
            {selectedOrder.orderNumber}
            <span aria-hidden="true"> · </span>
            {selectedOrder.orderType}
          </p>
          <div className="mt-3">
            <StatusBadge status={selectedOrder.status} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => goAtelierRoom('measurements')}>Continue to measurements</Button>
            <Button variant="secondary" onClick={() => openProduction(selectedOrder.id)}>
              Open production floor
            </Button>
          </div>
        </AtelierStage>
      ) : (
        <ExperienceEmptyState
          title="No client selected"
          description="The floor does not invent an active client. Open the client room to begin, or continue a garment already in motion."
          action={
            <Button onClick={() => setView('customers')}>Open client room</Button>
          }
        />
      )}

      <section>
        <h2 className="font-display text-heading-sm text-ink-primary">Work in motion</h2>
        <p className="mt-1 text-meta text-ink-muted">In-progress and ready orders from this workspace store.</p>
        {active.length === 0 ? (
          <div className="mt-4">
            <ExperienceEmptyState
              title="No garments in progress"
              description="When an order moves on the floor, it appears here."
              action={
                <Button size="md" variant="secondary" onClick={() => setView('orders')}>
                  Open ledger
                </Button>
              }
            />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line-subtle border-t border-line-subtle">
            {active.slice(0, 8).map((order) => {
              const client = customers.find((customer) => customer.id === order.customerId)?.fullName;
              return (
                <li key={order.id}>
                  <button
                    type="button"
                    className="sf-focus-ring sf-micro-press flex min-h-11 w-full items-center justify-between gap-3 py-3 text-left"
                    onClick={() => openProduction(order.id)}
                  >
                    <span>
                      <span className="block font-numeric text-body text-ink-primary">{order.orderNumber}</span>
                      <span className="block text-meta text-ink-muted">
                        {client || 'No client on this order'}
                        <span aria-hidden="true"> · </span>
                        {order.orderType}
                      </span>
                    </span>
                    <StatusBadge status={order.status} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-heading-sm text-ink-primary">People in this workspace</h2>
        <p className="mt-1 text-meta text-ink-muted">Entry to the client room. Not the active thread.</p>
        {people.length === 0 ? (
          <div className="mt-4">
            <ExperienceEmptyState
              title="No clients yet"
              description="Your first client dossier will appear here once you add a customer."
              action={
                <Button onClick={() => setView('customers')}>Open client room</Button>
              }
            />
          </div>
        ) : (
          <ul className="mt-3">
            {people.map((customer) => (
              <li key={customer.id} className="border-b border-line-subtle last:border-0">
                <button
                  type="button"
                  onClick={() => setView('customers')}
                  className="sf-focus-ring sf-micro-press flex min-h-11 w-full items-center justify-between py-3 text-left"
                >
                  <span className="text-label text-ink-primary">{customer.fullName}</span>
                  <span className="font-numeric text-meta text-ink-muted">{customer.phone || 'No phone'}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AtelierWorkroom>
  );
}
