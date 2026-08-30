/**
 * StitchFlow Finance Operations — Phase 18 · Stage 10.
 *
 * Evidence-first surface over VERIFIED contracts only:
 *  - Invoice fields totalAmount/amountPaid/balanceDue/status are backend-
 *    computed (POST /payments recalculates them transactionally) — displayed
 *    here verbatim, never recomputed (§46).
 *  - Payment writes: POST /payments (transactional, row-locked, over-payment
 *    rejected, idempotent replay via clientMutationId → duplicate:true).
 *    submitPaymentWithOfflineFallback queues network failures with the SAME
 *    idempotency key; server "no" (HTTP 4xx) is final and never queued.
 *  - Finance is an INDEPENDENT state domain from production (§17/§22):
 *    nothing here reads or advances production state.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Plus, RefreshCw } from 'lucide-react';
import { fetchInvoices, createInvoice, updateInvoice, type ApiInvoice, type InvoicePayload } from '@shared/api/invoices';
import { fetchPayments, submitPaymentWithOfflineFallback, type ApiPayment } from '@shared/api/payments';
import { fetchOrders, type ApiOrder } from '@shared/api/orders';
import { getCustomers, type ApiCustomer } from '@shared/utils/customerApi';
import { formatCurrency, safeCurrency } from '@shared/utils/currency';
import { useApp } from '../../context/AppContext';
import {
  Button, Badge, Body, Label, Numeric, Section, Surface, Skeleton, EmptyState, ErrorState, Input, Textarea, Metric,
} from '../../design-system';
import { InvoiceModal } from '../../components/Invoices';
import { emptyStateSrc } from '../workspace/assets';

/** Non-colour financial status semantics (§41) — InvoiceStatus is VERIFIED as
 *  draft|sent|partial|paid|overdue|void; presentation groups keep them. */
const STATUS_META: Record<string, { label: string; icon: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  pending: { label: 'Payment outstanding', icon: '○', tone: 'neutral' }, // backend GET /invoices returns 'pending' (VERIFIED live)
  draft: { label: 'Payment outstanding', icon: '○', tone: 'neutral' },
  sent: { label: 'Payment outstanding', icon: '○', tone: 'neutral' },
  partial: { label: 'Partial payment', icon: '◐', tone: 'warning' },
  paid: { label: 'Paid', icon: '✓', tone: 'success' },
  overdue: { label: 'Overdue', icon: '!', tone: 'danger' },
  void: { label: 'Void', icon: '✗', tone: 'neutral' },
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'outstanding', label: 'Outstanding' },
  { id: 'paid', label: 'Paid' },
  { id: 'overdue', label: 'Overdue' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

export function FinanceView() {
  const { currentWorkspace } = useApp();
  const [invoices, setInvoices] = useState<ApiInvoice[] | null>(null);
  const [payments, setPayments] = useState<ApiPayment[]>([]);
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<FilterId>('all');
  const [search, setSearch] = useState('');
  const [payFor, setPayFor] = useState<ApiInvoice | null>(null);
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; invoice?: ApiInvoice } | null>(null);

  const load = useCallback(() => {
    setLoadError(false);
    Promise.all([fetchInvoices(), fetchPayments(), getCustomers().catch(() => [] as ApiCustomer[]), fetchOrders().catch(() => [] as ApiOrder[])])
      .then(([i, p, c, o]) => { setInvoices(i); setPayments(p); setCustomers(c); setOrders(o); })
      .catch(() => setLoadError(true));
  }, []);
  useEffect(load, [load]);

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const orderById = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);

  /* Authoritative per-invoice fields; sums are presentational aggregates. */
  const totals = useMemo(() => {
    const base = { expected: 0, received: 0, outstanding: 0 };
    return (invoices ?? []).reduce(
      (acc, inv) => ({
        expected: acc.expected + (Number(inv.totalAmount) || 0),
        received: acc.received + (Number(inv.amountPaid) || 0),
        outstanding: acc.outstanding + (Number(inv.balanceDue) || 0),
      }),
      base,
    );
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (invoices ?? []).filter((inv) => {
      if (filter === 'outstanding' && !['draft', 'sent', 'partial', 'overdue'].includes(inv.status)) return false;
      if (filter === 'paid' && inv.status !== 'paid') return false;
      if (filter === 'overdue' && inv.status !== 'overdue') return false;
      if (!q) return true;
      const customer = customerById.get(inv.customerId);
      const order = inv.orderId ? orderById.get(inv.orderId) : null;
      return inv.invoiceNumber.toLowerCase().includes(q)
        || (customer?.fullName ?? '').toLowerCase().includes(q)
        || (order?.orderNumber ?? '').toLowerCase().includes(q);
    });
  }, [invoices, filter, search, customerById, orderById]);

  /* ── Record payment (idempotent, honest about duplicates/offline) ─────── */
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [payOutcome, setPayOutcome] = useState<string | null>(null);

  useEffect(() => {
    if (payFor) { setAmount(String(payFor.balanceDue || '')); setMethod(''); setReference(''); setNotes(''); setPayError(null); setPayOutcome(null); }
  }, [payFor]);

  const submitPayment = async () => {
    if (!payFor) return;
    setPayBusy(true); setPayError(null); setPayOutcome(null);
    const payloadAmount = Number(amount);
    if (!Number.isFinite(payloadAmount) || payloadAmount <= 0) { setPayError('Enter an amount greater than zero.'); setPayBusy(false); return; }
    if (!method.trim()) { setPayError('Enter how the payment was received (e.g. cash, mobile money).'); setPayBusy(false); return; }
    if (!reference.trim()) { setPayError('A payment reference is required — it appears on the receipt.'); setPayBusy(false); return; }
    try {
      const result = await submitPaymentWithOfflineFallback(currentWorkspace?.id ?? '', {
        invoiceId: payFor.id,
        customerId: payFor.customerId,
        orderId: payFor.orderId ?? null,
        amount: payloadAmount,
        method: method.trim(),
        referenceCode: reference.trim(),
        notes: notes.trim(),
        clientMutationId: crypto.randomUUID(),
      });
      if (result.status === 'confirmed') {
        // Server transaction confirmed (authoritative). Replay acknowledged?
        setPayOutcome((result.payment as ApiPayment).duplicate
          ? 'This payment was already recorded — acknowledged, nothing was recorded twice.'
          : 'Payment recorded and the invoice balance updated.');
        load(); // refresh from the authoritative source
      } else {
        setPayOutcome('Payment saved on this device and queued — it will be submitted once you are online. Its idempotency key guarantees it cannot be recorded twice.');
      }
    } catch (err) {
      // HTTP rejection: the server said no — final, no success shown (FN9).
      setPayError(err instanceof Error ? err.message : 'The payment could not be recorded. Nothing was saved — please retry.');
    } finally { setPayBusy(false); }
  };

  /* ── Render ───────────────────────────────────────────────────────────── */
  if (loadError) {
    return (
      <div data-view="finance" className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <Section>Finance</Section>
        <ErrorState title="Finance could not be loaded" message="Invoices and payments could not be fetched right now. Nothing was changed. Retry when connected." onRetry={load} errorId="finance/load" />
      </div>
    );
  }
  if (invoices === null) {
    return (
      <div data-view="finance" className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <Section>Finance</Section>
        <Skeleton label="Finance workspace" />
      </div>
    );
  }

  const wsCurrency = safeCurrency(invoices?.[0]?.currency ?? currentWorkspace?.defaultCurrency);

  return (
    <div data-view="finance" className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Label>Financial operations</Label>
          <Section>Finance</Section>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input aria-label="Search invoices by number, customer or order" placeholder="Search invoice, customer, order…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-60" />
          <Button variant="secondary" onClick={load}><RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh</Button>
          <Button variant="primary" data-action="new-invoice" onClick={() => setModal({ mode: 'create' })}><Plus className="h-4 w-4" aria-hidden="true" /> New invoice</Button>
        </div>
      </div>

      {/* Authoritative aggregates — per-invoice figures come from the backend */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Money expected" value={formatCurrency(totals.expected, wsCurrency)} hint="Sum of invoice totals" />
        <Metric label="Money received" value={formatCurrency(totals.received, wsCurrency)} hint="Sum of invoice amounts paid" />
        <Metric label="Outstanding balances" value={formatCurrency(totals.outstanding, wsCurrency)} hint="Sum of invoice balances due" />
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter invoices">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}
            className={filter === f.id ? 'ds-btn ds-btn-secondary' : 'ds-btn ds-btn-tertiary'}>
            {f.label}
          </button>
        ))}
      </div>

      {invoices.length === 0 ? (
        <EmptyState illustration={emptyStateSrc('no-results')} title="No invoices yet"
          message="Invoices track what clients owe for confirmed orders. Create the first one to start tracking payments."
          primaryAction={<Button variant="primary" onClick={() => setModal({ mode: 'create' })}>New invoice</Button>} />
      ) : filtered.length === 0 ? (
        <EmptyState illustration={emptyStateSrc('no-results')} title="No matching invoices"
          message={`Nothing matches this ${filter === 'all' ? 'search' : 'filter'}. Clear it to see every invoice.`}
          primaryAction={<Button variant="secondary" onClick={() => { setSearch(''); setFilter('all'); }}>Clear search and filter</Button>} />
      ) : (
        <Surface className="divide-y divide-line" data-list="invoices">
          {filtered.map((inv) => {
            const meta = STATUS_META[inv.status] ?? { label: inv.status, icon: '○', tone: 'neutral' as const };
            const customer = customerById.get(inv.customerId);
            const order = inv.orderId ? orderById.get(inv.orderId) : null;
            const paymentCount = payments.filter((p) => p.invoiceId === inv.id && p.paymentStatus === 'captured').length;
            return (
              <div key={inv.id} data-invoice={inv.id} data-invoice-status={inv.status} className="ds-motion-micro flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink">{inv.invoiceNumber}</div>
                  <div className="text-xs text-ink-mute">
                    {customer?.fullName ?? 'Customer not on this device'}
                    {order ? ` · ${order.orderNumber}` : ''}
                    {inv.dueDate ? ` · due ${format(new Date(inv.dueDate), 'd MMM yyyy')}` : ''}
                    {paymentCount > 0 ? ` · ${paymentCount} payment${paymentCount === 1 ? '' : 's'} recorded` : ''}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                  <span className="text-sm text-ink-soft">Total <Numeric>{formatCurrency(inv.totalAmount, inv.currency as never)}</Numeric></span>
                  <span className="text-sm text-ink-soft">Paid <Numeric>{formatCurrency(inv.amountPaid, inv.currency as never)}</Numeric></span>
                  <span className="text-sm text-ink-soft" data-balance={inv.balanceDue}>Balance <Numeric>{formatCurrency(inv.balanceDue, inv.currency as never)}</Numeric></span>
                  <span data-status={inv.status}><Badge tone={meta.tone}>{meta.icon} {meta.label}</Badge></span>
                  {inv.status !== 'paid' && inv.status !== 'void' && (
                    <Button variant="secondary" className="min-h-[var(--ds-touch-min)]" data-action={`record-payment-${inv.id}`} onClick={() => setPayFor(inv)}>Record payment</Button>
                  )}
                  <Button variant="tertiary" className="min-h-[var(--ds-touch-min)] px-2" aria-label={`Edit invoice ${inv.invoiceNumber}`} onClick={() => setModal({ mode: 'edit', invoice: inv })}>Edit</Button>
                </div>
              </div>
            );
          })}
        </Surface>
      )}

      <Body className="text-xs text-ink-mute">
        Payment state and production state are independent — a paid order still moves through production, and a finished garment may still have a balance. Neither implies the other.
      </Body>

      {/* Record payment — idempotent write with honest outcomes */}
      {payFor && (
        <div className="fixed inset-0 z-[var(--sf-z-modal)] flex items-end justify-center bg-ink/40 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label={`Record payment for ${payFor.invoiceNumber}`} data-dialog="record-payment">
          <Surface className="flex w-full max-w-md flex-col gap-3 p-5">
            <Section>Record payment</Section>
            <Body className="text-sm text-ink-soft">
              {payFor.invoiceNumber} · balance <Numeric>{formatCurrency(payFor.balanceDue, payFor.currency as never)}</Numeric> of <Numeric>{formatCurrency(payFor.totalAmount, payFor.currency as never)}</Numeric>
            </Body>
            {payOutcome ? (
              <>
                <span data-outcome="success" className="block"><Body className="text-sm text-ink">{payOutcome}</Body></span>
                <Button variant="primary" data-action="close-payment" onClick={() => setPayFor(null)}>Done</Button>
              </>
            ) : (
              <>
                {payError && <ErrorState title="Payment not recorded" message={payError} errorId="finance/payment" />}
                <label className="flex flex-col gap-1"><span className="ds-label">Amount [{payFor.currency}]</span>
                  <Input numeric value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(payFor.balanceDue)} /></label>
                <label className="flex flex-col gap-1"><span className="ds-label">Method</span>
                  <Input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="e.g. cash, mobile money" /></label>
                <label className="flex flex-col gap-1"><span className="ds-label">Payment reference (required)</span>
                  <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. MM-000123" /></label>
                <label className="flex flex-col gap-1"><span className="ds-label">Notes</span>
                  <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional…" /></label>
                <div className="flex justify-end gap-2">
                  <Button variant="tertiary" onClick={() => setPayFor(null)}>Cancel</Button>
                  <Button variant="primary" data-action="submit-payment" disabled={payBusy} onClick={submitPayment}>{payBusy ? 'Recording…' : 'Record payment'}</Button>
                </div>
                <Body className="text-xs text-ink-mute">Recorded payments cannot exceed the invoice total, and each submission carries an idempotency key — a retried or replayed submission can never double-charge.</Body>
              </>
            )}
          </Surface>
        </div>
      )}

      {modal && (
        <InvoiceModal
          mode={modal.mode}
          existingInvoice={modal.invoice}
          customers={customers}
          orders={orders}
          onClose={() => setModal(null)}
          onSubmit={async (payload: InvoicePayload) => {
            if (modal.mode === 'create') await createInvoice(payload);
            else if (modal.invoice) await updateInvoice(modal.invoice.id, payload);
            setModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}
