import {
  AtelierCanvas,
  AtelierConfidence,
  AtelierPage,
  AtelierStage,
  AtelierThread,
  Badge,
  Button,
  ExperienceEmptyState,
  Panel,
  StatusBadge,
} from '../experience';
import { useApp } from '../context/AppContext';

export function AtelierHome() {
  const { currentMember, currentWorkspace, customers, orders, dueAlerts, setView, selectedOrderId } = useApp();
  const firstName = currentMember.user.fullName.trim().split(/\s+/)[0] || 'there';
  const active = orders.filter((order) => order.status === 'in_progress' || order.status === 'ready');
  const recentCustomers = customers.slice(0, 6);
  const attentionCount = dueAlerts?.length || 0;
  const selectedOrder = orders.find((order) => order.id === selectedOrderId);
  const threadClient =
    (selectedOrder && customers.find((customer) => customer.id === selectedOrder.customerId)?.fullName) ||
    recentCustomers[0]?.fullName ||
    null;

  return (
    <AtelierCanvas>
      <AtelierPage
        kicker="Floor"
        title={`Good day, ${firstName}`}
        description={`${currentWorkspace.name}. Work that needs a human, not a statistics wall.`}
        primaryAction={
          <Button variant="primary" onClick={() => setView('customers')}>
            Open client room
          </Button>
        }
        thread={<AtelierThread room="Floor" client={threadClient} order={selectedOrder?.orderNumber} />}
        confidence={<AtelierConfidence state="local" detail="AppContext workspace store. Not remote shop authority." />}
      >
        <section className="grid gap-4 lg:grid-cols-[1.45fr_0.85fr]">
          <Panel elevated>
            <p className="text-meta text-ink-muted">Primary task</p>
            <h2 className="mt-1 font-display text-heading-sm">Production queue</h2>
            {active.length === 0 ? (
              <div className="mt-4">
                <ExperienceEmptyState
                  title="No garments in progress"
                  description="When an order moves on the floor, it appears here."
                  action={
                    <Button size="sm" variant="secondary" onClick={() => setView('orders')}>
                      Open orders
                    </Button>
                  }
                />
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {active.slice(0, 6).map((order) => (
                  <li
                    key={order.id}
                    className="flex items-center justify-between gap-3 border-b border-line-subtle pb-3 last:border-0"
                  >
                    <div>
                      <p className="font-numeric text-body text-ink-primary">{order.orderNumber}</p>
                      <p className="text-meta text-ink-muted">{order.orderType}</p>
                    </div>
                    <StatusBadge status={order.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <p className="text-meta text-ink-muted">Attention</p>
            <h2 className="mt-1 font-display text-heading-sm">Due from the store</h2>
            <p className="mt-4 font-numeric text-display text-ink-primary">{attentionCount}</p>
            <p className="text-meta text-ink-muted">Due alerts from the workspace store. Not invented metrics.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone={attentionCount > 0 ? 'warning' : 'success'}>
                {attentionCount > 0 ? 'Needs review' : 'Quiet floor'}
              </Badge>
            </div>
            <div className="mt-4">
              <Button variant="ghost" size="sm" onClick={() => setView('production-board')}>
                Production floor
              </Button>
            </div>
          </Panel>
        </section>

        <AtelierStage>
          <h2 className="font-display text-heading-sm">Recent clients</h2>
          {recentCustomers.length === 0 ? (
            <div className="mt-4">
              <ExperienceEmptyState
                title="No clients yet"
                description="Your first client dossier will appear here once you add a customer."
                action={
                  <Button size="sm" onClick={() => setView('customers')}>
                    Create client
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {recentCustomers.map((customer) => (
                <li key={customer.id}>
                  <button
                    type="button"
                    onClick={() => setView('customers')}
                    className="sf-focus-ring min-h-11 w-full rounded-sf-lg border border-line bg-surface-panel p-4 text-left shadow-sf-sm transition duration-fast hover:shadow-sf-md"
                  >
                    <p className="text-label text-ink-primary">{customer.fullName}</p>
                    <p className="mt-1 font-numeric text-meta text-ink-muted">{customer.phone || 'No phone'}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </AtelierStage>
      </AtelierPage>
    </AtelierCanvas>
  );
}
