import { useEffect, useMemo, useState, type ElementType, type FormEvent } from 'react';
import { useApp } from '../context/AppContext';
import { BRAND } from '../config/brand';
import {
  Search,
  FileText,
  Receipt,
  CheckCircle,
  Clock,
  AlertTriangle,
  Wallet,
  X,
  Pencil,
  Plus,
  DollarSign,
  Download,
} from 'lucide-react';
import { format, isPast } from 'date-fns';
import { formatCurrency, safeCurrency } from '@shared/utils/currency';
import {
  fetchInvoices,
  createInvoice,
  updateInvoice,
  type ApiInvoice,
  type InvoicePayload,
} from '@shared/api/invoices';
import {
  fetchInvoicePayments,
  createPayment,
  type ApiPayment,
} from '@shared/api/payments';
import { getCustomers, type ApiCustomer } from '@shared/utils/customerApi';
import { fetchOrders, type ApiOrder } from '@shared/api/orders';
import { downloadInvoicePdf } from '@shared/utils/invoicePdf';
import { Button, ErrorState, ExperienceEmptyState, LoadingState, PageHeader, Workroom } from '../experience';

export function Invoices() {
  const { currentWorkspace } = useApp();
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<ApiInvoice | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<ApiInvoice | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<ApiInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

const [items, setItems] = useState([
  { description: '', quantity: 1, unitPrice: 0, total: 0 },
]);

  const workspaceCurrency = 'GHS';

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [invoiceData, customerData, orderData] = await Promise.all([
        fetchInvoices(),
        getCustomers(),
        fetchOrders(),
      ]);

      setInvoices(invoiceData);
      setCustomers(customerData);
      setOrders(orderData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const customerMap = useMemo(() => {
    return new Map((customers ?? []).map((customer) => [customer.id, customer]));
  }, [customers]);

  const orderMap = useMemo(() => {
    return new Map((orders ?? []).map((order) => [order.id, order]));
  }, [orders]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const customerName = customerMap.get(invoice.customerId)?.fullName || '';

      return (
        (invoice.invoiceNumber ?? "").toLowerCase().includes((search ?? "").toLowerCase()) ||
        (customerName ?? "").toLowerCase().includes((search ?? "").toLowerCase())
      );
    });
  }, [invoices, customerMap, search]);

  const paidInvoicesCount = invoices.filter((invoice) => invoice.status === 'paid').length;
  const overdueInvoicesCount = invoices.filter((invoice) => {
    if (invoice.status === 'overdue') return true;
    if (!invoice.dueDate) return false;
    return isPast(new Date(invoice.dueDate)) && invoice.balanceDue > 0;
  }).length;

  const totalOutstanding = invoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0);

  async function handleDownloadInvoicePdf(invoice: ApiInvoice) {
    try {
      const customer = customerMap.get(invoice.customerId);
      await downloadInvoicePdf(invoice, customer?.fullName, {
        workspaceName: currentWorkspace.name,
        logoUrl: currentWorkspace.logoUrl,
        brandColor: currentWorkspace.brandColor,
        useLogoAsWatermark: currentWorkspace.useLogoAsWatermark,
        phone: currentWorkspace.phone,
        email: currentWorkspace.email,
        address: currentWorkspace.address,
      });
    } catch (downloadError) {
      console.error('Failed to download invoice PDF:', downloadError);
    }
  }

  return (
    <Workroom>
      <PageHeader
        level={2}
        kicker="Operations"
        title="Invoices"
        description={`${invoices.length} invoices from the backend database.`}
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          title="Total Invoices"
          value={String(invoices.length)}
          subtitle="All generated invoices"
          icon={FileText}
          tone="brand"
        />
        <SummaryCard
          title="Paid Invoices"
          value={String(paidInvoicesCount)}
          subtitle="Invoices fully settled"
          icon={CheckCircle}
          tone="green"
        />
        <SummaryCard
          title="Outstanding Balance"
          value={formatCurrency(totalOutstanding, workspaceCurrency)}
          subtitle={`${overdueInvoicesCount} overdue invoice${overdueInvoicesCount === 1 ? '' : 's'}`}
          icon={Wallet}
          tone="amber"
        />
      </div>

      <div className="relative mb-6 rounded-2xl border border-line bg-surface-panel shadow-sm">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          placeholder="Search invoices by invoice number or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl py-3 pl-11 pr-4 text-ink-secondary outline-none placeholder:text-ink-muted focus:ring-2 focus:ring-action-primary"
        />
      </div>

      {loading && <LoadingState label="Loading invoices…" />}

      {error && (
        <ErrorState
          title="Invoices could not load"
          description={error}
          action={<Button variant="secondary" size="sm" onClick={() => void loadData()}>Retry</Button>}
        />
      )}

      {!loading && !error && (
        <div className="overflow-hidden rounded-sf-lg border border-line bg-surface-panel shadow-sm">
          <div className="h-1.5 w-full bg-action-primary" />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line bg-surface-workspace text-left text-sm text-ink-muted">
                  <th className="px-5 py-3 font-medium">Invoice</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Order</th>
                  <th className="px-5 py-3 font-medium">Due Date</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Total</th>
                  <th className="px-5 py-3 font-medium text-right">Paid</th>
                  <th className="px-5 py-3 font-medium text-right">Balance</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(filteredInvoices ?? []).map((invoice) => {
                  const customer = customerMap.get(invoice.customerId);
                  const order = invoice.orderId ? orderMap.get(invoice.orderId) : null;

                  return (
                    <tr
                      key={invoice.id}
                      className="cursor-pointer text-sm hover:bg-surface-workspace"
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-ink-muted" />
                          <span className="font-medium text-ink-primary">{invoice.invoiceNumber}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-ink-secondary">{customer?.fullName || '�'}</td>
                      <td className="px-5 py-4 text-ink-secondary">{order?.orderNumber || '�'}</td>
                      <td className="px-5 py-4">
                        <span
                          className={
                            invoice.dueDate && isPast(new Date(invoice.dueDate)) && invoice.balanceDue > 0
                              ? 'font-medium text-red-600'
                              : 'text-ink-secondary'
                          }
                        >
                          {invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM d, yyyy') : '�'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <InvoiceStatusBadge status={invoice.status} />
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-ink-primary">
                        {formatCurrency(invoice.totalAmount, safeCurrency(invoice.currency, workspaceCurrency))}
                      </td>
                      <td className="px-5 py-4 text-right text-ink-secondary">
                        {formatCurrency(invoice.amountPaid, safeCurrency(invoice.currency, workspaceCurrency))}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span
                          className={
                            invoice.balanceDue > 0 ? 'font-medium text-amber-600' : 'text-green-600'
                          }
                        >
                          {formatCurrency(invoice.balanceDue, safeCurrency(invoice.currency, workspaceCurrency))}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDownloadInvoicePdf(invoice);
                            }}
                            className="rounded-xl p-2 text-ink-secondary transition-colors hover:bg-action-secondary"
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaymentInvoice(invoice);
                            }}
                            className="rounded-xl p-2 text-green-600 transition-colors hover:bg-green-50"
                            title="Record payment"
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingInvoice(invoice);
                            }}
                            className="rounded-xl p-2 text-ink-secondary transition-colors hover:bg-action-secondary"
                            title="Edit invoice"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && filteredInvoices.length === 0 && (
        <ExperienceEmptyState
          title="No invoices found"
          description="Create an invoice, or change the search."
          action={<Button size="sm" onClick={() => setShowCreateModal(true)}>New Invoice</Button>}
        />
      )}

      {selectedInvoice && (
        <InvoiceDetailsModal
          invoice={selectedInvoice}
          customer={customerMap.get(selectedInvoice.customerId) || null}
          order={selectedInvoice.orderId ? orderMap.get(selectedInvoice.orderId) || null : null}
          onClose={() => setSelectedInvoice(null)}
          onRecordPayment={() => {
            setPaymentInvoice(selectedInvoice);
          }}
          onDownload={() => {
            void handleDownloadInvoicePdf(selectedInvoice);
          }}
        />
      )}

      {showCreateModal && (
        <InvoiceModal
          mode="create"
          customers={customers}
          orders={orders}
          onClose={() => setShowCreateModal(false)}
          onSubmit={async (payload) => {
            const created = await createInvoice(payload);
            setInvoices((prev) => [created, ...prev]);
            setShowCreateModal(false);
          }}
        />
      )}

      {editingInvoice && (
        <InvoiceModal
          mode="edit"
          customers={customers}
          orders={orders}
          existingInvoice={editingInvoice}
          onClose={() => setEditingInvoice(null)}
          onSubmit={async (payload) => {
            const updated = await updateInvoice(editingInvoice.id, payload);
            setInvoices((prev) =>
              (prev ?? []).map((invoice) => (invoice.id === updated.id ? updated : invoice))
            );
            setEditingInvoice(null);

            if (selectedInvoice?.id === updated.id) {
              setSelectedInvoice(updated);
            }
          }}
        />
      )}

      {paymentInvoice && (
        <PaymentModal
          invoice={paymentInvoice}
          onClose={() => setPaymentInvoice(null)}
          onSubmit={async (payload) => {
            await createPayment(payload);
            await loadData();
            setPaymentInvoice(null);
          }}
        />
      )}
    </Workroom>
  );
}

function InvoiceDetailsModal({
  invoice,
  customer,
  order,
  onClose,
  onRecordPayment,
  onDownload,
}: {
  invoice: ApiInvoice;
  customer: ApiCustomer | null;
  order: ApiOrder | null;
  onClose: () => void;
  onRecordPayment: () => void;
  onDownload: () => void;
}) {
  const [payments, setPayments] = useState<ApiPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPayments() {
      try {
        setLoadingPayments(true);
        setPaymentError(null);
        const data = await fetchInvoicePayments(invoice.id);
        setPayments(data);
      } catch (err) {
        setPaymentError(err instanceof Error ? err.message : 'Failed to load payments');
      } finally {
        setLoadingPayments(false);
      }
    }

    void loadPayments();
  }, [invoice.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-sf-lg bg-surface-panel shadow-xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <div>
            <h2 className="text-lg font-semibold text-ink-primary">{invoice.invoiceNumber}</h2>
            <p className="text-sm text-ink-muted">{customer?.fullName || 'No customer'}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-action-secondary">
            <X className="h-5 w-5 text-ink-muted" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="flex items-center justify-between rounded-2xl bg-surface-workspace p-4">
            <div>
              <InvoiceStatusBadge status={invoice.status} />
              <p className="mt-2 text-sm text-ink-muted">
                Due: {invoice.dueDate ? format(new Date(invoice.dueDate), 'MMMM d, yyyy') : '�'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-ink-primary">
                {formatCurrency(invoice.totalAmount, safeCurrency(invoice.currency, 'GHS'))}
              </p>
              <p className="text-sm text-green-600">
                Paid: {formatCurrency(invoice.amountPaid, safeCurrency(invoice.currency, 'GHS'))}
              </p>
              <p className="text-sm text-amber-600">
                Balance: {formatCurrency(invoice.balanceDue, safeCurrency(invoice.currency, 'GHS'))}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailCard label="Customer" value={customer?.fullName || '�'} />
            <DetailCard label="Order" value={order?.orderNumber || '�'} />
            <DetailCard
              label="Amount Paid"
              value={formatCurrency(invoice.amountPaid, safeCurrency(invoice.currency, 'GHS'))}
            />
            <DetailCard
              label="Balance Due"
              value={formatCurrency(invoice.balanceDue, safeCurrency(invoice.currency, 'GHS'))}
            />
          </div>

          {invoice.notes && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-ink-primary">Notes</h3>
              <div className="rounded-2xl bg-surface-workspace p-4 text-sm text-ink-secondary">
                {invoice.notes}
              </div>
            </div>
          )}

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-ink-primary">Payment History</h3>

              <div className="flex items-center gap-2">
                <button
                  onClick={onDownload}
                  className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-medium text-ink-secondary hover:bg-surface-workspace"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>

                {invoice.balanceDue > 0 && (
                  <button
                    onClick={onRecordPayment}
                    className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    <DollarSign className="h-4 w-4" />
                    Record Payment
                  </button>
                )}
              </div>
            </div>

            {loadingPayments && (
              <div className="rounded-2xl bg-surface-workspace p-4 text-sm text-ink-muted">
                Loading payments...
              </div>
            )}

            {paymentError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {paymentError}
              </div>
            )}

            {!loadingPayments && !paymentError && payments.length === 0 && (
              <div className="rounded-2xl bg-surface-workspace p-4 text-sm text-ink-muted">
                No payments recorded yet.
              </div>
            )}

            {!loadingPayments && !paymentError && payments.length > 0 && (
              <div className="space-y-2">
                {(payments ?? []).map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-2xl bg-green-50 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink-primary">
                        {formatCurrency(payment.amount, safeCurrency(invoice.currency, 'GHS'))} via {payment.method}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {format(new Date(payment.paidAt), 'MMM d, yyyy')}
                        {payment.notes ? ` � ${payment.notes}` : ''}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-green-700">
                      {payment.paymentStatus}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-line p-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-line px-4 py-2.5 font-medium text-ink-secondary hover:bg-surface-workspace"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-panel p-4">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-2 text-base font-semibold text-ink-primary">{value}</p>
    </div>
  );
}

function InvoiceModal({
  mode,
  customers,
  orders,
  existingInvoice,
  onClose,
  onSubmit,
}: {
  mode: 'create' | 'edit';
  customers: ApiCustomer[];
  orders: ApiOrder[];
  existingInvoice?: ApiInvoice;
  onClose: () => void;
  onSubmit: (payload: InvoicePayload) => Promise<void>;
}) {
  const [form, setForm] = useState({
    customerId: existingInvoice?.customerId || '',
    orderId: existingInvoice?.orderId || '',
    invoiceNumber: existingInvoice?.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
    dueDate: existingInvoice?.dueDate ? String(existingInvoice.dueDate).slice(0, 10) : '',
    totalAmount: existingInvoice?.totalAmount ? String(existingInvoice.totalAmount) : '',
    amountPaid: existingInvoice?.amountPaid ? String(existingInvoice.amountPaid) : '0',
    currency: existingInvoice?.currency || 'GHS',
    notes: existingInvoice?.notes || '',
  });

  const [error, setError] = useState<string | null>(null);

const [items, setItems] = useState([
  { description: '', quantity: 1, unitPrice: 0, total: 0 },
]);
  const [saving, setSaving] = useState(false);

  const filteredOrders = orders.filter((order) => order.customerId === form.customerId);
  const totalAmountNumber = items.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
  const amountPaidNumber = Number(form.amountPaid) || 0;
  useEffect(() => {
  setItems((prev) =>
    (prev ?? []).map((item) => ({
      ...item,
      total: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    }))
  );
}, [(items ?? []).map(i => i.quantity).join(','), (items ?? []).map(i => i.unitPrice).join(',')]);
const balanceDue = Math.max(0, totalAmountNumber - amountPaidNumber);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.customerId) {
      setError('Please select a customer.');
      return;
    }

    if (!form.invoiceNumber.trim()) {
      setError('Please enter an invoice number.');
      return;
    }

    if (!Number.isFinite(totalAmountNumber) || totalAmountNumber <= 0) {
      setError('Please enter a valid total amount.');
      return;
    }

    if (!Number.isFinite(amountPaidNumber) || amountPaidNumber < 0) {
      setError('Please enter a valid paid amount.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await onSubmit({
        customerId: form.customerId,
        orderId: form.orderId || null,
        invoiceNumber: form.invoiceNumber.trim(),
        status: 'pending',
        dueDate: form.dueDate || null,
        totalAmount: totalAmountNumber,
        amountPaid: amountPaidNumber,
        balanceDue,
        currency: form.currency || 'GHS',
        notes: form.notes.trim(),
items,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-sf-lg bg-surface-panel shadow-xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="text-lg font-semibold text-ink-primary">
            {mode === 'create' ? 'Create Invoice' : 'Edit Invoice'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-action-secondary">
            <X className="h-5 w-5 text-ink-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-secondary">Customer</label>
            <select
              value={form.customerId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, customerId: e.target.value, orderId: '' }))
              }
              className="w-full rounded-xl border border-line px-3 py-2.5 text-ink-secondary focus:outline-none focus:ring-2 focus:ring-action-primary"
            >
              <option value="">Select customer</option>
              {(customers ?? []).map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.fullName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-secondary">Order</label>
            <select
              value={form.orderId}
              onChange={(e) => setForm((prev) => ({ ...prev, orderId: e.target.value }))}
              className="w-full rounded-xl border border-line px-3 py-2.5 text-ink-secondary focus:outline-none focus:ring-2 focus:ring-action-primary"
            >
              <option value="">No linked order</option>
              {(filteredOrders ?? []).map((order) => (
                <option key={order.id} value={order.id}>
                  {order.orderNumber} - {order.orderType}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-secondary">Invoice Number</label>
            <input
              value={form.invoiceNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
              className="w-full rounded-xl border border-line px-3 py-2.5 text-ink-secondary focus:outline-none focus:ring-2 focus:ring-action-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-secondary">Due Date</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
              className="w-full rounded-xl border border-line px-3 py-2.5 text-ink-secondary focus:outline-none focus:ring-2 focus:ring-action-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-secondary">Currency</label>
            <input
              value={form.currency}
              onChange={(e) => setForm((prev) => ({ ...prev, currency: (e.target.value ?? "").toUpperCase() }))}
              className="w-full rounded-xl border border-line px-3 py-2.5 uppercase text-ink-secondary focus:outline-none focus:ring-2 focus:ring-action-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-secondary">Total Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.totalAmount}
              onChange={(e) => setForm((prev) => ({ ...prev, totalAmount: e.target.value }))}
              className="w-full rounded-xl border border-line px-3 py-2.5 text-ink-secondary focus:outline-none focus:ring-2 focus:ring-action-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-secondary">Amount Paid</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amountPaid}
              onChange={(e) => setForm((prev) => ({ ...prev, amountPaid: e.target.value }))}
              className="w-full rounded-xl border border-line px-3 py-2.5 text-ink-secondary focus:outline-none focus:ring-2 focus:ring-action-primary"
            />
          </div>

          <div className="rounded-2xl bg-surface-workspace p-4">
            <p className="text-sm text-ink-muted">Balance Due</p>
            <p className="mt-2 text-xl font-bold text-ink-primary">
              {formatCurrency(balanceDue, safeCurrency(form.currency, 'GHS'))}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-secondary">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="w-full resize-none rounded-xl border border-line px-3 py-2.5 text-ink-secondary focus:outline-none focus:ring-2 focus:ring-action-primary"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-line px-4 py-2.5 font-medium text-ink-secondary hover:bg-surface-workspace"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-action-primary px-4 py-2.5 font-medium text-white hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : mode === 'create' ? 'Create Invoice' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentModal({
  invoice,
  onClose,
  onSubmit,
}: {
  invoice: ApiInvoice;
  onClose: () => void;
  onSubmit: (payload: {
    invoiceId: string;
    customerId: string;
    orderId?: string | null;
    amount: number;
    method: string;
    referenceCode: string;
    paymentStatus: string;
    notes: string;
  }) => Promise<void>;
}) {
  const [amount, setAmount] = useState(String(invoice.balanceDue));
  const [method, setMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

const [items, setItems] = useState([
  { description: '', quantity: 1, unitPrice: 0, total: 0 },
]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid amount.');
      return;
    }

    if (parsedAmount > invoice.balanceDue) {
      setError('Payment cannot exceed balance due.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await onSubmit({
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        orderId: invoice.orderId || null,
        amount: parsedAmount,
        method,
        referenceCode: `PAY-${Date.now()}`,
        paymentStatus: 'captured',
        notes,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-sf-lg bg-surface-panel shadow-xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="text-lg font-semibold text-ink-primary">Record Payment</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-action-secondary">
            <X className="h-5 w-5 text-ink-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="rounded-2xl bg-surface-workspace p-4">
            <p className="text-sm text-ink-muted">Balance Due</p>
            <p className="mt-2 text-xl font-bold text-ink-primary">
              {formatCurrency(invoice.balanceDue, safeCurrency(invoice.currency, 'GHS'))}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-secondary">Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-line px-3 py-2.5 text-ink-secondary focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-secondary">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-xl border border-line px-3 py-2.5 text-ink-secondary focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              <option>Cash</option>
              <option>Bank Transfer</option>
              <option>Credit Card</option>
              <option>Mobile Money</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-secondary">Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-line px-3 py-2.5 text-ink-secondary focus:outline-none focus:ring-2 focus:ring-green-600"
              placeholder="Optional note..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-line px-4 py-2.5 font-medium text-ink-secondary hover:bg-surface-workspace"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-green-600 px-4 py-2.5 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ElementType;
  tone: 'brand' | 'green' | 'amber';
}) {
  const tones = {
    brand: 'bg-action-secondary text-action-primary',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="rounded-sf-lg border border-line bg-surface-panel p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">{title}</p>
          <p className="mt-1 text-2xl font-bold text-ink-primary">{value}</p>
          <p className="mt-1 text-xs text-ink-muted">{subtitle}</p>
        </div>

        <div className={`rounded-2xl p-3 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: ElementType }> = {
    draft: { bg: 'bg-action-secondary', text: 'text-ink-secondary', icon: Clock },
    pending: { bg: 'bg-action-secondary', text: 'text-action-primary', icon: Clock },
    partial: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
    paid: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
    overdue: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
    void: { bg: 'bg-action-secondary', text: 'text-ink-muted', icon: Clock },
  };

  const { bg, text, icon: Icon } = config[status] || config.draft;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${bg} ${text}`}
    >
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}








