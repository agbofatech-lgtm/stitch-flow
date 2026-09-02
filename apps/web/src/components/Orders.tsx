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
import { formatCurrency } from '@shared/utils/currency';
import type { CurrencyCode, Invoice, Order, Payment } from '../shared/types';

function recordedMoney(amount: number | undefined, currency?: string | null) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return 'Amount not recorded';
  if (currency === 'USD' || currency === 'GHS' || currency === 'NGN' || currency === 'GBP') {
    return formatCurrency(amount, currency);
  }
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} (currency not recorded)`;
}

function invoiceStatusLabel(status: Invoice['status']) {
  return status.replace(/_/g, ' ');
}

export function Orders() {
  const { orders, customers, invoices, payments, selectedOrderId } = useApp();
  const workflow = useWorkflow();
  const [query, setQuery] = useState('');

  const selectedId = workflow.orderId || selectedOrderId;
  const selectedOrder = orders.find((order) => order.id === selectedId) || null;
  const selectedClient =
    (selectedOrder && customers.find((customer) => customer.id === selectedOrder.customerId)?.fullName) ||
    null;

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

  const orderInvoices = selectedOrder
    ? invoices.filter((invoice) => invoice.orderId === selectedOrder.id)
    : [];
  const orderPayments = selectedOrder
    ? payments.filter((payment) => payment.orderId === selectedOrder.id)
    : [];

  function openOrder(orderId: string) {
    workflow.selectOrder(orderId);
  }

  return (
    <AtelierWorkroom
      place="Ledger"
      title={selectedClient || 'Select an order'}
      purpose={
        selectedOrder
          ? 'The commercial record for this garment. Amounts are the stored records. Live payment processing is not in this room.'
          : 'The Ledger holds the garment’s commercial record. This station does not invent an order.'
      }
      thread={
        <div className="space-y-1">
          <AtelierThread room="Ledger" client={selectedClient} order={selectedOrder?.orderNumber} />
          <AtelierJourney current="ledger" />
        </div>
      }
      confidence={
        <AtelierConfidence
          state="local"
          detail="AppContext invoices, payments, and orders. Not shop authority. Not a payment processor."
        />
      }
      primaryAction={
        <Button variant="primary" onClick={() => goAtelierRoom('command')}>
          Return to floor
        </Button>
      }
    >
      <div className="grid items-start gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <section data-ledger-queue="true" className={selectedOrder ? 'order-2 xl:order-1' : undefined}>
          <h3 className="font-display text-heading-sm text-ink-primary">Orders in this workspace</h3>
          <p className="mt-1 text-meta text-ink-muted">Selecting an order continues the thread.</p>
          <div className="relative mt-3">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search order or client"
              aria-label="Search ledger orders"
              className="sf-focus-ring min-h-11 w-full rounded-sf border border-line bg-surface-panel px-3 py-2 text-body text-ink-primary outline-none placeholder:text-ink-muted"
            />
          </div>
          {orders.length === 0 ? (
            <div className="mt-4">
              <ExperienceEmptyState
                title="No orders in this workspace"
                description="Ledger records appear here from the local workspace store. They are not loaded from an unmounted shop path."
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
                const current = order.id === selectedOrder?.id;
                return (
                  <li key={order.id}>
                    <button
                      type="button"
                      aria-current={current ? 'true' : undefined}
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
                      <StatusBadge status={order.status} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section data-ledger-record="true" className={selectedOrder ? 'order-1 xl:order-2' : undefined}>
          {selectedOrder ? (
            <LedgerRecord
              order={selectedOrder}
              client={selectedClient}
              invoices={orderInvoices}
              payments={orderPayments}
            />
          ) : (
            <ExperienceEmptyState
              title="No order on this thread"
              description="Select an order from the list. This station does not borrow the first order."
              action={
                <Button onClick={() => goAtelierRoom('production')}>Open production floor</Button>
              }
            />
          )}
        </section>
      </div>
    </AtelierWorkroom>
  );
}

function LedgerRecord({
  order,
  client,
  invoices,
  payments,
}: {
  order: Order;
  client: string | null;
  invoices: Invoice[];
  payments: Payment[];
}) {
  return (
    <div className="space-y-6">
      <AtelierStage>
        <p className="text-meta text-ink-muted">Commercial record</p>
        <h2 className="mt-1 font-display text-heading text-ink-primary">{client || 'No client on this order'}</h2>
        <p className="mt-2 font-numeric text-body text-ink-secondary">
          {order.orderNumber}
          {order.garmentType ? (
            <>
              <span aria-hidden="true"> · </span>
              {order.garmentType}
            </>
          ) : null}
          <span aria-hidden="true"> · </span>
          {order.orderType}
        </p>
        <div className="mt-3">
          <StatusBadge status={order.status} />
        </div>
        <p className="mt-4 text-body text-ink-secondary">
          Order total on this record: {recordedMoney(order.totalAmount, order.currency as CurrencyCode | undefined)}.
          Order status is not a payment status.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => goAtelierRoom('production')}>
            Open production floor
          </Button>
          <Button variant="ghost" onClick={() => goAtelierRoom('clients')}>
            Open client room
          </Button>
        </div>
      </AtelierStage>

      <section>
        <h3 className="font-display text-heading-sm text-ink-primary">Invoices</h3>
        {invoices.length === 0 ? (
          <div className="mt-3">
            <ExperienceEmptyState
              title="No invoice record exists for this order"
              description="This workspace store was checked. An invoice was not invented. Creating invoices through unmounted HTTP is not offered here."
            />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-line-subtle border-t border-line-subtle">
            {invoices.map((invoice) => (
              <li key={invoice.id} className="py-3">
                <p className="font-numeric text-body text-ink-primary">{invoice.invoiceNumber}</p>
                <p className="mt-1 text-meta text-ink-muted">
                  Recorded status: {invoiceStatusLabel(invoice.status)}
                  <span aria-hidden="true"> · </span>
                  Total {recordedMoney(invoice.totalAmount, invoice.currency)}
                  <span aria-hidden="true"> · </span>
                  Paid {recordedMoney(invoice.paidAmount, invoice.currency)}
                  <span aria-hidden="true"> · </span>
                  Balance on this invoice {recordedMoney(invoice.balanceDue, invoice.currency)}
                </p>
                {invoice.items?.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-meta text-ink-muted">
                    {invoice.items.map((item) => (
                      <li key={item.id}>
                        {item.description}{' '}
                        <span className="font-numeric">
                          {item.quantity} × {recordedMoney(item.unitPrice, invoice.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-meta text-ink-muted">No line items on this invoice record.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="font-display text-heading-sm text-ink-primary">Payments</h3>
        {payments.length === 0 ? (
          <div className="mt-3">
            <ExperienceEmptyState
              title="No payment record is available"
              description="This is not a statement that the order is unpaid. Live payment processing is not part of this room."
            />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-line-subtle border-t border-line-subtle">
            {payments.map((payment) => (
              <li key={payment.id} className="flex min-h-11 items-center justify-between gap-3 py-3">
                <span>
                  <span className="block font-numeric text-body text-ink-primary">
                    {recordedMoney(payment.amount, invoices.find((invoice) => invoice.id === payment.invoiceId)?.currency)}
                  </span>
                  <span className="block text-meta text-ink-muted">
                    {payment.method || 'Method not recorded'}
                    {payment.referenceCode ? ` · ${payment.referenceCode}` : ''}
                  </span>
                </span>
                <span className="text-meta text-ink-muted">{payment.paymentStatus}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="font-display text-heading-sm text-ink-primary">Order notes</h3>
        <p className="mt-3 text-body text-ink-secondary whitespace-pre-wrap">
          {order.notes || 'No notes on this order.'}
        </p>
      </section>
    </div>
  );
}
