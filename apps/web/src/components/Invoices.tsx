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
} from '../experience';
import { formatCurrency } from '@shared/utils/currency';
import type { Invoice } from '../shared/types';

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

export function Invoices() {
  const { invoices, payments, orders, customers, selectedOrderId, setView } = useApp();
  const workflow = useWorkflow();
  const [query, setQuery] = useState('');

  const selectedId = workflow.orderId || selectedOrderId;
  const selectedOrder = orders.find((order) => order.id === selectedId) || null;
  const selectedClient =
    (selectedOrder && customers.find((customer) => customer.id === selectedOrder.customerId)?.fullName) ||
    null;

  const scoped = selectedOrder ? invoices.filter((invoice) => invoice.orderId === selectedOrder.id) : invoices;

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return scoped;
    return scoped.filter((invoice) => {
      const order = orders.find((item) => item.id === invoice.orderId);
      const client = order ? customers.find((customer) => customer.id === order.customerId)?.fullName || '' : '';
      return invoice.invoiceNumber.toLowerCase().includes(term) || client.toLowerCase().includes(term);
    });
  }, [customers, orders, query, scoped]);

  const [openId, setOpenId] = useState<string | null>(null);
  const openInvoice = invoices.find((invoice) => invoice.id === openId) || visible[0] || null;

  return (
    <AtelierWorkroom
      place="Ledger"
      title="Invoices station"
      purpose={
        selectedOrder
          ? 'Invoice records for the current garment thread. Amounts are stored fields. This station does not process payments.'
          : 'Invoice records in this workspace store. Select an order on the Ledger to scope the thread. Unmounted HTTP is not used.'
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
          detail="AppContext invoices. Not shop authority. Balance values are stored on the invoice record."
        />
      }
      primaryAction={
        <Button variant="primary" onClick={() => setView('orders')}>
          Open orders station
        </Button>
      }
    >
      <div className="grid items-start gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <section>
          <h3 className="font-display text-heading-sm text-ink-primary">
            {selectedOrder ? 'Invoices for this order' : 'Invoices in this workspace'}
          </h3>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search invoice number"
            aria-label="Search invoices"
            className="sf-focus-ring mt-3 min-h-11 w-full rounded-sf border border-line bg-surface-panel px-3 py-2 text-body outline-none placeholder:text-ink-muted"
          />
          {scoped.length === 0 ? (
            <div className="mt-4">
              <ExperienceEmptyState
                title={
                  selectedOrder
                    ? 'No invoice record exists for this order'
                    : 'No invoice records in this workspace'
                }
                description="The local workspace store was checked. Invoices were not loaded from an unmounted /invoices path."
              />
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-line-subtle border-t border-line-subtle">
              {visible.map((invoice) => (
                <li key={invoice.id}>
                  <button
                    type="button"
                    aria-current={invoice.id === openInvoice?.id ? 'true' : undefined}
                    onClick={() => setOpenId(invoice.id)}
                    className="sf-focus-ring sf-micro-press flex min-h-11 w-full items-center justify-between py-3 text-left"
                  >
                    <span className="font-numeric text-body text-ink-primary">{invoice.invoiceNumber}</span>
                    <span className="text-meta text-ink-muted">{invoice.status}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          {openInvoice ? (
            <InvoiceDetail invoice={openInvoice} payments={payments.filter((payment) => payment.invoiceId === openInvoice.id)} />
          ) : (
            <ExperienceEmptyState
              title="No invoice selected"
              description="Choose an invoice from the list. A record is not invented."
            />
          )}
        </section>
      </div>
    </AtelierWorkroom>
  );
}

function InvoiceDetail({ invoice, payments }: { invoice: Invoice; payments: { id: string; amount: number; method: string; referenceCode: string; paymentStatus: string }[] }) {
  return (
    <AtelierStage>
      <p className="text-meta text-ink-muted">Invoice record</p>
      <h2 className="mt-1 font-display text-heading text-ink-primary font-numeric">{invoice.invoiceNumber}</h2>
      <p className="mt-2 text-body text-ink-secondary">Recorded status: {invoice.status}. This is not a PSP confirmation.</p>
      <dl className="mt-4 space-y-2 text-body text-ink-secondary">
        <div className="flex justify-between gap-3">
          <dt>Total</dt>
          <dd className="font-numeric">{recordedMoney(invoice.totalAmount, invoice.currency)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Paid amount on record</dt>
          <dd className="font-numeric">{recordedMoney(invoice.paidAmount, invoice.currency)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Balance on this invoice</dt>
          <dd className="font-numeric">{recordedMoney(invoice.balanceDue, invoice.currency)}</dd>
        </div>
      </dl>
      {invoice.items?.length ? (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-meta text-ink-muted">
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
        <p className="mt-4 text-meta text-ink-muted">No line items on this invoice record.</p>
      )}
      <h3 className="mt-6 font-display text-heading-sm text-ink-primary">Payments on this invoice</h3>
      {payments.length === 0 ? (
        <p className="mt-2 text-meta text-ink-muted">No payment record is available. That is not a statement that the invoice is unpaid.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line-subtle border-t border-line-subtle">
          {payments.map((payment) => (
            <li key={payment.id} className="flex min-h-11 items-center justify-between py-3">
              <span className="font-numeric">{recordedMoney(payment.amount, invoice.currency)}</span>
              <span className="text-meta text-ink-muted">
                {payment.method} · {payment.paymentStatus}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5">
        <Button variant="secondary" onClick={() => setView('orders')}>
          Open orders station
        </Button>
      </div>
    </AtelierStage>
  );
}
