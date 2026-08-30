/**
 * StitchFlow Workspace Home — Phase 18 · Stage 7.
 *
 * Operational "Today" experience: attention model over REAL data only
 * (Stage 7 §16–18). Sources (VERIFIED):
 *  - API: getDashboardSummary · getDashboardDataBundle (orders, invoices)
 *  - Offline store (via AppContext): customers · fabricRecords/low-stock
 * No fabricated statistics; each section carries honest loading/error state.
 * API sections fail honestly offline (ONLINE REQUIRED); store sections are
 * FULLY OFFLINE (Stage 7 §20 classification in the Stage 7 doc).
 */
import { useEffect, useMemo, useState } from 'react';
import { format, isToday, isPast } from 'date-fns';
import { AlertTriangle, CalendarClock, Package, Users, Wallet, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useApp } from '../../context/AppContext';
import { getDashboardSummary, type DashboardSummary } from '@shared/utils/dashboardApi';
import { getDashboardDataBundle } from '@shared/utils/dashboardDataApi';
import type { ApiOrder } from '@shared/api/orders';
import type { ApiInvoice } from '@shared/api/invoices';
import { formatCurrency, safeCurrency } from '@shared/utils/currency';
import {
  Button, EmptyState, ErrorState, Skeleton, Surface, Section, Body, Label, Numeric, Badge,
} from '../../design-system';
import { emptyStateSrc } from './assets';

const ACTIVE_ORDER_STATUSES = new Set(['draft', 'in_progress', 'ready']);

function AttentionRow({ icon: Icon, label, value, action, onClick, tone }: {
  icon: typeof AlertTriangle; label: string; value?: string; action: string; onClick: () => void; tone?: 'urgent' | 'info';
}) {
  return (
    <button type="button" onClick={onClick} data-attention={label}
      className={clsx('ds-motion-micro flex w-full min-h-[var(--ds-touch-min)] items-center gap-3 rounded-xl border px-4 py-3 text-left',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-focus',
        tone === 'urgent' ? 'border-ds-warning bg-ds-warning-surface' : 'border-line bg-ds-surface hover:bg-ds-subtle')}>
      <Icon className={clsx('h-4.5 w-4.5 shrink-0', tone === 'urgent' ? 'text-ds-warning' : 'text-ink-mute')} aria-hidden="true" />
      <span className="flex-1">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {value && <span className="block text-xs text-ink-mute">{value}</span>}
      </span>
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-soft">{action}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></span>
    </button>
  );
}

export function HomeView() {
  const { customers, fabricRecords, getLowStockMaterials, setView, currentMember, currentWorkspace } = useApp();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [orders, setOrders] = useState<ApiOrder[] | null>(null);
  const [invoices, setInvoices] = useState<ApiInvoice[] | null>(null);
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [s, bundle] = await Promise.all([getDashboardSummary(), getDashboardDataBundle()]);
        if (!alive) return;
        setSummary(s); setOrders(bundle.orders); setInvoices(bundle.invoices);
      } catch { if (alive) setApiError(true); }
    })();
    return () => { alive = false; };
  }, []);

  const currency = safeCurrency(currentWorkspace?.defaultCurrency ?? summary?.currency);
  const firstName = (currentMember?.user?.fullName || 'there').split(' ')[0];

  const overdue = useMemo(() => (invoices ?? []).filter((i) => i.balanceDue > 0 && (i.status === 'overdue' || (i.dueDate && isPast(new Date(i.dueDate))))), [invoices]);
  const dueToday = useMemo(() => (orders ?? []).filter((o) => o.dueDate && isToday(new Date(o.dueDate)) && ACTIVE_ORDER_STATUSES.has(o.status)), [orders]);
  const active = useMemo(() => (orders ?? []).filter((o) => ACTIVE_ORDER_STATUSES.has(o.status) && !(o.dueDate && isToday(new Date(o.dueDate)))), [orders]);
  const lowStock = useMemo(() => getLowStockMaterials?.() ?? [], [getLowStockMaterials]);
  const activeMaterials = useMemo(() => fabricRecords.filter((m) => m.isActive !== false), [fabricRecords]);

  const urgentCount = overdue.length;
  const actionCount = dueToday.length + lowStock.length;
  const nothingToDo = urgentCount === 0 && actionCount === 0 && active.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6" data-view="home">
      <header className="flex flex-col gap-1">
        <Label>{format(new Date(), 'EEEE, d MMMM yyyy')}</Label>
        <Section>Good day, {firstName}</Section>
        <Body className="text-ink-mute">Here is what needs your attention today.</Body>
      </header>

      {apiError && (
        <ErrorState title="Live figures unavailable" message="Orders and finance figures could not be loaded (you may be offline). They will refresh when you reconnect — your locally saved data is untouched."
          onRetry={() => setView('dashboard')} errorId="home/api" />
      )}

      {/* L1 — Urgent */}
      <section aria-label="Urgent" className="flex flex-col gap-2">
        <div className="flex items-center gap-2"><Label>Urgent</Label>{urgentCount > 0 && <Badge tone="warning">{urgentCount}</Badge>}</div>
        {invoices === null && !apiError ? <Skeleton label="Urgent work" /> : urgentCount === 0 ? (
          <Body className="text-ink-mute">Nothing overdue. 🧵</Body>
        ) : (
          <div className="flex flex-col gap-2">
            {overdue.slice(0, 4).map((i) => (
              <AttentionRow key={i.id} icon={AlertTriangle} tone="urgent"
                label={`Payment overdue — ${formatCurrency(i.balanceDue, currency)}`}
                value={i.dueDate ? `was due ${format(new Date(i.dueDate), 'd MMM')}` : undefined}
                action="Finance" onClick={() => setView('invoices')} />
            ))}
          </div>
        )}
      </section>

      {/* L2 — Action required */}
      <section aria-label="Action required" className="flex flex-col gap-2">
        <div className="flex items-center gap-2"><Label>Action required</Label>{actionCount > 0 && <Badge>{actionCount}</Badge>}</div>
        <div className="flex flex-col gap-2">
          {dueToday.slice(0, 3).map((o) => (
            <AttentionRow key={o.id} icon={CalendarClock}
              label={`Due today — ${o.orderNumber}${o.garmentType ? ` · ${o.garmentType}` : ''}`}
              value={o.status.replace('_', ' ')} action="Orders" onClick={() => setView('orders')} />
          ))}
          {lowStock.slice(0, 2).map((m) => (
            <AttentionRow key={m.id} icon={Package} label={`Low stock — ${m.name}`}
              value="reorder before cutting" action="Materials" onClick={() => setView('materials')} />
          ))}
          {orders !== null && dueToday.length === 0 && lowStock.length === 0 && (
            <Body className="text-ink-mute">No work is waiting on you today.</Body>
          )}
        </div>
      </section>

      {/* L3 — Active work */}
      <section aria-label="Active work" className="flex flex-col gap-2">
        <Label>Active work</Label>
        {orders === null && !apiError ? <Skeleton label="Active work" /> : active.length === 0 ? (
          <Body className="text-ink-mute">{nothingToDo && customers.length === 0
            ? 'Your workspace is ready — start by adding your first customer.'
            : 'No active orders right now.'}</Body>
        ) : (
          <Surface className="divide-y divide-line">
            {active.slice(0, 5).map((o) => (
              <div key={o.id} className="flex min-h-11 items-center justify-between gap-3 px-4 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{o.orderNumber}{o.garmentType ? ` · ${o.garmentType}` : ''}</span>
                  <span className="block text-xs capitalize text-ink-mute">{o.status.replace('_', ' ')}{o.dueDate ? ` · due ${format(new Date(o.dueDate), 'd MMM')}` : ''}</span>
                </span>
                <Button variant="tertiary" className="min-h-9" onClick={() => setView('orders')}>Open<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Button>
              </div>
            ))}
          </Surface>
        )}
      </section>

      {/* L4 — Informational (real figures only) */}
      <section aria-label="At a glance" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Surface subtle className="p-4"><Label>Customers</Label><Numeric className="mt-1 text-lg font-semibold">{customers.length}</Numeric></Surface>
        <Surface subtle className="p-4"><Label>Materials</Label><Numeric className="mt-1 text-lg font-semibold">{activeMaterials.length}</Numeric></Surface>
        <Surface subtle className="p-4"><Label>Active orders</Label><Numeric className="mt-1 text-lg font-semibold">{active.length}</Numeric></Surface>
        <Surface subtle className="p-4"><Label>Pending balances</Label><Numeric className="mt-1 text-lg font-semibold">{summary ? formatCurrency(summary.pendingBalances, currency) : '—'}</Numeric></Surface>
      </section>

      {/* Empty workspace → first-use guidance */}
      {customers.length === 0 && (
        <EmptyState illustration={emptyStateSrc('no-customers')}
          title="No customers yet" message="Everything in StitchFlow starts with a customer — add your first one and orders, measurements and designs flow from there."
          primaryAction={<Button variant="primary" onClick={() => setView('customers')}>Add customer</Button>}
          secondaryAction={<Button variant="tertiary" onClick={() => setView('orders')}>Explore orders</Button>} />
      )}

      <p className="flex items-center gap-1.5 text-xs text-ink-mute">
        <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
        Figures combine live workspace data with this device's saved records. <Users className="ml-1 h-3.5 w-3.5" aria-hidden="true" /> Offline notes are saved locally.
      </p>
    </div>
  );
}
