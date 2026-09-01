import { AtelierCanvas, Badge, Button, ExperienceEmptyState, PageHeader, Panel, Workroom } from '../experience';
import { useApp } from '../context/AppContext';

export function AtelierHome() {
  const { currentMember, currentWorkspace, customers, orders, dueAlerts, setView } = useApp();
  const firstName = currentMember.user.fullName.trim().split(/\s+/)[0] || 'there';
  const active = orders.filter((order) => order.status === 'in_progress' || order.status === 'ready');
  const recentCustomers = customers.slice(0, 6);

  return (
    <AtelierCanvas>
      <Workroom>
        <PageHeader
          kicker="Digital Atelier"
          title={`Good day, ${firstName}`}
          description={`${currentWorkspace.name} · what requires your attention, not a statistics wall.`}
          actions={
            <Button variant="secondary" onClick={() => setView('customers')}>
              Open client studio
            </Button>
          }
        />

        <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <Panel elevated>
            <p className="text-meta uppercase tracking-[0.16em] text-ink-muted">Active work</p>
            <h2 className="mt-1 font-display text-heading-sm">Production queue</h2>
            {active.length === 0 ? (
              <p className="mt-4 text-body text-ink-muted">No garments are in progress. When an order moves, it appears here.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {active.slice(0, 6).map((order) => (
                  <li key={order.id} className="flex items-center justify-between gap-3 border-b border-line pb-3 last:border-0">
                    <div>
                      <p className="font-numeric text-body text-ink-primary">{order.orderNumber}</p>
                      <p className="text-meta text-ink-muted">{order.orderType}</p>
                    </div>
                    <Badge tone={order.status === 'ready' ? 'success' : 'warning'}>{order.status.replace('_', ' ')}</Badge>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <Button size="sm" onClick={() => setView('orders')}>
                Open orders
              </Button>
            </div>
          </Panel>

          <Panel>
            <p className="text-meta uppercase tracking-[0.16em] text-ink-muted">Today</p>
            <h2 className="mt-1 font-display text-heading-sm">Attention</h2>
            <p className="mt-4 font-numeric text-display text-ink-primary">{dueAlerts?.length || 0}</p>
            <p className="text-meta text-ink-muted">due alerts from the workspace store (not invented metrics).</p>
            <div className="mt-4">
              <Button variant="ghost" size="sm" onClick={() => setView('production-board')}>
                Production floor
              </Button>
            </div>
          </Panel>
        </section>

        <section>
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
                    className="sf-focus-ring w-full rounded-sf-lg border border-line bg-surface-panel p-4 text-left shadow-sf-sm"
                  >
                    <p className="text-label text-ink-primary">{customer.fullName}</p>
                    <p className="mt-1 font-numeric text-meta text-ink-muted">{customer.phone || 'No phone'}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Workroom>
    </AtelierCanvas>
  );
}
