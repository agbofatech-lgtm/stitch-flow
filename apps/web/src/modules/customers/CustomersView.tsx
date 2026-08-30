/**
 * StitchFlow Customer Experience — Phase 18 · Stage 7.
 *
 * Task-oriented customer list + customer workspace (Stage 7 §6–15), built on
 * Stage 5 primitives inside the Stage 6 shell.
 *
 * Data contracts (VERIFIED, unchanged):
 *  - List/create/edit/delete: API customers (getCustomers/createCustomer/
 *    updateCustomer/deleteCustomer) — reuse of the existing validated
 *    AddCustomerModal from components/Customers.tsx (exported for reuse).
 *  - Orders context: getCustomerOrders(customer.id) (API).
 *  - Measurements/Designs context: the EXISTING CustomerDetail component
 *    (Phase 13–16 intelligence surface) — reused verbatim below the context
 *    header; protected engines untouched.
 *  - Offline classification: list/orders = ONLINE REQUIRED (honest error +
 *    retry offline); measurement profiles via offline store = FULLY OFFLINE.
 * Stage 8 handoff: "New order" primary action navigates to the existing
 * Orders surface (order wizard itself is Stage 8, not implemented here).
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { Search, Plus, Phone, Mail, ArrowLeft, ArrowRight, Scissors, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { getCustomers, createCustomer, type ApiCustomer } from '@shared/utils/customerApi';
import { getCustomerOrders } from '@shared/utils/customerOrdersApi';
import type { ApiOrder } from '@shared/api/orders';
import { AddCustomerModal } from '../../components/Customers';
import { CustomerDetail } from '../../components/CustomerDetail';
import { useApp } from '../../context/AppContext';
import {
  Button, EmptyState, ErrorState, Skeleton, Surface, Section, Body, Label, Numeric, Badge, Input,
} from '../../design-system';
import { emptyStateSrc } from '../workspace/assets';
import { OrderWorkflow } from '../orders/OrderWorkflow';

/* ── Customer context (single selected customer) ────────────────────────── */
function CustomerWorkspace({ customer, onBack }: { customer: ApiCustomer; onBack: () => void }) {
  const { setView } = useApp();
  const [ordering, setOrdering] = useState(false);
  const [orders, setOrders] = useState<ApiOrder[] | null>(null);
  const [ordersError, setOrdersError] = useState(false);

  const load = () => {
    setOrdersError(false);
    getCustomerOrders(customer.id).then(setOrders).catch(() => setOrdersError(true));
  };
  useEffect(load, [customer.id]);

  const activeOrders = (orders ?? []).filter((o) => ['draft', 'in_progress', 'ready'].includes(o.status));

  if (ordering) {
    return (
      <OrderWorkflow customer={customer}
        onExit={() => setOrdering(false)}
        onCompleted={() => { setOrdering(false); setView('orders'); }} />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6" data-view="customer-workspace">
      {/* Header: identity + contact + primary action (Stage 7 §10) */}
      <div className="flex flex-col gap-3">
        <Button variant="tertiary" className="w-fit px-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All customers
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Section>{customer.fullName}</Section>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
              {customer.phone && <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-ink-mute" aria-hidden="true" />{customer.phone}</span>}
              {customer.email && <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-ink-mute" aria-hidden="true" />{customer.email}</span>}
              {!customer.phone && !customer.email && <span className="text-ink-mute">No contact details on record</span>}
            </div>
          </div>
          {/* Stage 8: the order workflow now launches HERE (customer context retained) */}
          <Button variant="primary" onClick={() => setOrdering(true)} data-handoff="stage8-order-workflow">
            <Plus className="h-4 w-4" aria-hidden="true" /> New order
          </Button>
        </div>
      </div>

      {/* Active work */}
      <section aria-label="Active work" className="flex flex-col gap-2">
        <div className="flex items-center gap-2"><Label>Active work</Label>{activeOrders.length > 0 && <Badge>{activeOrders.length}</Badge>}</div>
        {ordersError ? (
          <ErrorState message="Orders could not be loaded right now. Retry when connected — nothing is lost." onRetry={load} errorId={`cust/${customer.id.slice(0, 8)}`} />
        ) : orders === null ? (
          <Skeleton label="Customer orders" />
        ) : activeOrders.length === 0 ? (
          <EmptyState illustration={emptyStateSrc('no-orders')} title="Nothing in progress"
            message={`No active orders for ${customer.fullName}. Start one and measurements, design and production will hang off it.`}
            primaryAction={<Button variant="primary" onClick={() => setView('orders')}>New order</Button>} />
        ) : (
          <Surface className="divide-y divide-line">
            {activeOrders.map((o) => (
              <button key={o.id} type="button" onClick={() => setView('orders')}
                className="ds-motion-micro flex min-h-[var(--ds-touch-min)] w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-ds-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ds-focus">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{o.orderNumber}{o.garmentType ? ` · ${o.garmentType}` : ''}</span>
                  <span className="block text-xs capitalize text-ink-mute">{o.status.replace('_', ' ')}{o.dueDate ? ` · due ${format(new Date(o.dueDate), 'd MMM')}` : ''}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-mute" aria-hidden="true" />
              </button>
            ))}
          </Surface>
        )}
      </section>

      {/* Measurements / designs / intelligence context — existing Phase 13–16 surface, reused verbatim */}
      <section aria-label="Measurements and designs" className="flex flex-col gap-2">
        <Label>Measurements &amp; designs</Label>
        <Body className="text-ink-mute">Profiles are versioned — updating a profile here never changes a past order's saved measurements.</Body>
        <CustomerDetail customerId={customer.id} customer={customer} />
      </section>
    </div>
  );
}

/* ── Customer list ──────────────────────────────────────────────────────── */
export function CustomersView() {
  const [customers, setCustomers] = useState<ApiCustomer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<ApiCustomer | null>(null);

  const load = () => { setError(null); setCustomers(null); getCustomers().then(setCustomers).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load customers')); };
  useEffect(load, []);

  // VERIFIED searchable fields (existing screen searched fullName + phone):
  const filtered = useMemo(() => {
    const q = (query ?? '').trim().toLowerCase();
    if (!q) return customers ?? [];
    // Evidenced fields (existing screen): name, email, phone.
    return (customers ?? []).filter((c) =>
      (c.fullName ?? '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').includes(q));
  }, [customers, query]);

  const handleAdd = async (data: { fullName: string; phone: string; email: string; address: string; notes: string }) => {
    await createCustomer(data);
    setShowAdd(false);
    load(); // list refresh, then the natural next step is opening the customer
  };

  if (selected) return <CustomerWorkspace customer={selected} onBack={() => { setSelected(null); load(); }} />;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5" data-view="customers">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Section>Customers</Section>
          <Body className="text-ink-mute">Find a customer and continue their work.</Body>
        </div>
        <Button variant="primary" onClick={() => setShowAdd(true)} data-action="add-customer">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add customer
        </Button>
      </header>

      {/* Search (name + phone — evidenced fields only) */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" aria-hidden="true" />
        <Input aria-label="Search customers by name, phone or email" placeholder="Search by name, phone or email…" value={query}
          onChange={(e) => setQuery(e.target.value)} className="pl-9" />
      </div>

      {error ? (
        <ErrorState title="Customers unavailable" message={`Saved lists could not be loaded (${error}). You may be offline — try again when connected.`} onRetry={load} errorId="customers/load" />
      ) : customers === null ? (
        <div className="flex flex-col gap-2"><Skeleton label="Customers" /><Skeleton label="Customers" /></div>
      ) : customers.length === 0 ? (
        <EmptyState illustration={emptyStateSrc('no-customers')} title="No customers yet"
          message="Your customer list is where every order, measurement and design begins. Add your first customer to start the workflow."
          primaryAction={<Button variant="primary" onClick={() => setShowAdd(true)}>Add customer</Button>} />
      ) : filtered.length === 0 ? (
        <EmptyState illustration={emptyStateSrc('no-results')} title="No matches"
          message={`No customer matches “${query}”. Try a shorter search — name, phone or email.`}
          primaryAction={<Button variant="secondary" onClick={() => setQuery('')}>Clear search</Button>} />
      ) : (
        <>
          <p className="text-xs text-ink-mute"><Numeric>{filtered.length}</Numeric> of <Numeric>{customers.length}</Numeric> customers</p>
          <Surface className="divide-y divide-line" data-list="customers">
            {filtered.map((c) => (
              <button key={c.id} type="button" onClick={() => setSelected(c)} data-customer={c.id}
                className="ds-motion-micro flex min-h-[var(--ds-touch-min)] w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-ds-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ds-focus">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ds-subtle text-xs font-semibold text-ink-soft" aria-hidden="true">
                    {(c.fullName ?? '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{c.fullName}</span>
                    <span className="block truncate text-xs text-ink-mute">{c.phone || 'No phone on record'}</span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-mute" aria-hidden="true" />
              </button>
            ))}
          </Surface>
        </>
      )}

      {showAdd && <AddCustomerModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
    </div>
  );
}
