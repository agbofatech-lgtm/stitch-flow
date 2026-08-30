import {
  useEffect,
  useId,
  useMemo,
  useState,
  type Dispatch,
  type ElementType,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { useModalBehaviour } from '../design-system/Overlay';
import { BRAND } from '../config/brand';
import {
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Pencil,
  Users,
  AlertCircle,
  X,
  ClipboardList,
  Calendar,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { CustomerDetail } from './CustomerDetail';
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  type ApiCustomer,
} from '@shared/utils/customerApi';
import { getCustomerOrders } from '@shared/utils/customerOrdersApi';
import type { ApiOrder } from '@shared/api/orders';
import { format } from 'date-fns';
import { formatCurrency, safeCurrency } from '@shared/utils/currency';
import { API_BASE } from '@shared/utils/api';

function normalizeCustomerPayload(data: {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}) {
  return {
    fullName: data.fullName.trim(),
    phone: data.phone.trim(),
    email: data.email.trim().toLowerCase(),
    address: data.address.trim(),
    notes: data.notes.trim(),
  };
}

function isValidEmail(email: string) {
  if (!email.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function Customers() {
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_debugInfo, setDebugInfo] = useState<string>('Customers screen mounted');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<ApiCustomer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<ApiCustomer | null>(null);
  /**
   * Phase 13–16 exposure repair: CustomerDetail (measurement, design,
   * pattern and production intelligence) existed since Phase 13 but had no
   * mount point. This state opens it contextually for an API-backed
   * customer — the backend id is preserved so the intelligence endpoints
   * (/customers/:id/…) bind to the right record.
   */
  const [intelligenceCustomer, setIntelligenceCustomer] = useState<ApiCustomer | null>(null);

  async function loadCustomers() {
    try {
      setDebugInfo('Starting customer load...');
      setLoading(true);
      setError(null);

      setDebugInfo('Calling getCustomers()...');
      const data = await getCustomers();

      setDebugInfo(`Loaded ${data.length} customers successfully`);
      setCustomers(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load customers';
      setDebugInfo(`Customer load failed: ${message}`);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = (search ?? "").toLowerCase();

    return customers.filter((customer) => {
      return (
        (customer.fullName ?? "").toLowerCase().includes(query) ||
        (customer.email || '').toLowerCase().includes(query) ||
        (customer.phone || '').includes(search)
      );
    });
  }, [customers, search]);

  const customersWithPhone = customers.filter((customer) => !!customer.phone?.trim()).length;
  const customersWithEmail = customers.filter((customer) => !!customer.email?.trim()).length;

  return (
    <div className="p-4 lg:p-8">
      {intelligenceCustomer ? (
        <div>
          <button
            onClick={() => setIntelligenceCustomer(null)}
            className="mb-5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </button>
          <CustomerDetail
            customerId={intelligenceCustomer.id}
            customer={{ fullName: intelligenceCustomer.fullName }}
          />
        </div>
      ) : (
        <>
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-sm font-medium text-[#0F6E8C]">
            <Users className="h-4 w-4" />
            {BRAND.productName} Customer Management
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="mt-1 text-slate-500">
            View, create, edit, and inspect real customer records from the backend API.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-[#0F6E8C] px-4 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-[#0C5C74]"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          title="Total Customers"
          value={String(customers.length)}
          subtitle="Loaded from backend"
          icon={Users}
          tone="brand"
        />

        <SummaryCard
          title="With Phone"
          value={String(customersWithPhone)}
          subtitle="Customers with phone number saved"
          icon={Phone}
          tone="sky"
        />

        <SummaryCard
          title="With Email"
          value={String(customersWithEmail)}
          subtitle="Customers with email saved"
          icon={Mail}
          tone="slate"
        />
      </div>

      <div className="relative mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search customers by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl py-3 pl-11 pr-4 text-slate-700 outline-none ring-0 placeholder:text-slate-400 focus:ring-2 focus:ring-[#0F6E8C]"
        />
      </div>

      {loading && (
        <div className="rounded-[24px] border border-slate-200 bg-white py-12 text-center">
          <p className="text-slate-500">Loading customers...</p>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <div>
              <p className="font-medium">{error}</p>
              <p className="mt-1 text-xs text-red-600">Source: {`${API_BASE}/customers`}</p>
            </div>
            </div>

            <button
              type="button"
              onClick={() => void loadCustomers()}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(filteredCustomers ?? []).map((customer) => (
              <div
                key={customer.id}
                className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="h-1.5 w-full bg-[#0F6E8C]" />

                <div className="p-5">
                  <div
                    className="cursor-pointer"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100">
                          <span className="font-semibold text-[#0F6E8C]">
                            {customer.fullName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-semibold text-slate-900">{customer.fullName}</h3>
                          <p className="text-xs text-slate-400">
                            Since{' '}
                            {customer.createdAt
                              ? format(new Date(customer.createdAt), 'MMM yyyy')
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="h-4 w-4 text-slate-400" />
                          {customer.phone}
                        </div>
                      )}

                      {customer.email && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="h-4 w-4 text-slate-400" />
                          {customer.email}
                        </div>
                      )}

                      {customer.address && (
                        <div className="flex items-start gap-2 text-slate-600">
                          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                          <span className="line-clamp-2">{customer.address}</span>
                        </div>
                      )}
                    </div>

                    {customer.notes && (
                      <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                        <p className="line-clamp-2 text-xs text-slate-500">{customer.notes}</p>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {customer.phone && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          Phone saved
                        </span>
                      )}

                      {customer.email && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          Email saved
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setEditingCustomer(customer)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => setIntelligenceCustomer(customer)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm font-medium text-[#0F6E8C] hover:bg-sky-100"
                    >
                      <Sparkles className="h-4 w-4" />
                      Intelligence
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredCustomers.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-white py-12 text-center">
              <p className="font-medium text-slate-700">
                {customers.length === 0 ? 'No customers yet' : 'No customers match your search'}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {customers.length === 0
                  ? 'Add your first customer to start creating orders and invoices.'
                  : 'Try a different name, phone number, or email.'}
              </p>
            </div>
          )}
        </>
      )}

      {showAddModal && (
        <AddCustomerModal
          onClose={() => setShowAddModal(false)}
          onAdd={async (data) => {
            await createCustomer(data);
            await loadCustomers();
          }}
        />
      )}

      {editingCustomer && (
        <EditCustomerModal
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSave={async (customerId, updates) => {
            await updateCustomer(customerId, updates);
            setEditingCustomer(null);
            await loadCustomers();
          }}
        />
      )}

      {selectedCustomer && (
        <CustomerOrdersModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
        </>
      )}
    </div>
  );
}

function CustomerOrdersModal({
  customer,
  onClose,
}: {
  customer: ApiCustomer;
  onClose: () => void;
}) {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrders() {
      try {
        const data = await getCustomerOrders(customer.id);
        setOrders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load customer orders');
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, [customer.id]);

  return (
    <ModalShell title={customer.fullName} onClose={onClose}>
      <div className="space-y-6 p-4">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Phone className="h-4 w-4 text-slate-400" />
              {customer.phone || 'No phone'}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Mail className="h-4 w-4 text-slate-400" />
              {customer.email || 'No email'}
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-700 md:col-span-2">
              <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
              {customer.address || 'No address'}
            </div>
          </div>

          {customer.notes && (
            <p className="mt-3 text-sm text-slate-600">{customer.notes}</p>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-[#0F6E8C]" />
            <h3 className="font-semibold text-slate-900">Order History</h3>
          </div>

          {loading && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              Loading customer orders...
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              No orders yet for this customer.
            </div>
          )}

          {!loading && !error && orders.length > 0 && (
            <div className="space-y-3">
              {(orders ?? []).map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{order.orderNumber}</p>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{order.orderType}</p>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(order.totalAmount, safeCurrency(order.currency, 'GHS'))}
                      </p>
                      {order.createdAt && (
                        <p className="text-xs text-slate-400">
                          {format(new Date(order.createdAt), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>

                  {order.dueDate && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="h-4 w-4" />
                      Due {format(new Date(order.dueDate), 'MMM d, yyyy')}
                    </div>
                  )}

                  {order.notes && (
                    <p className="mt-3 text-sm text-slate-500">{order.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

/** Stage 7: exported for reuse by the new CustomersView (same validated behavior). */
export function AddCustomerModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (data: {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
  }) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const payload = normalizeCustomerPayload(formData);

    if (!payload.fullName) {
      setError('Name is required');
      return;
    }

    if (!payload.phone) {
      setError('Phone number is required');
      return;
    }

    if (!isValidEmail(payload.email)) {
      setError('Enter a valid email address');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onAdd(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Add Customer" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <FormFields formData={formData} setFormData={setFormData} />

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-[#0F6E8C] px-4 py-2.5 font-medium text-white hover:bg-[#0C5C74] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Add Customer'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function EditCustomerModal({
  customer,
  onClose,
  onSave,
}: {
  customer: ApiCustomer;
  onClose: () => void;
  onSave: (
    customerId: string,
    updates: {
      fullName: string;
      phone: string;
      email: string;
      address: string;
      notes: string;
    }
  ) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    fullName: customer.fullName || '',
    phone: customer.phone || '',
    email: customer.email || '',
    address: customer.address || '',
    notes: customer.notes || '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const payload = normalizeCustomerPayload(formData);

    if (!payload.fullName) {
      setError('Name is required');
      return;
    }

    if (!payload.phone) {
      setError('Phone number is required');
      return;
    }

    if (!isValidEmail(payload.email)) {
      setError('Enter a valid email address');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave(customer.id, payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Edit Customer" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <FormFields formData={formData} setFormData={setFormData} />

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-[#0F6E8C] px-4 py-2.5 font-medium text-white hover:bg-[#0C5C74] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  // Stage 13 §15/§16 — keyboard contract composed from the existing DS
  // primitive: Escape closes, focus moves in/traps/restores, scroll locked.
  const dialogRef = useModalBehaviour(true, onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      {/* Stage 7 a11y repair (narrow): dialog semantics + labelled close for the
          legacy modal shell, reused by the new CustomersView create flow. */}
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-2xl rounded-[24px] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label={`Close ${title.toLowerCase()}`} className="rounded-lg p-1 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>
        <div className="max-h-[85vh] overflow-y-auto">{children}</div>
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
  tone: 'brand' | 'sky' | 'slate';
}) {
  const tones = {
    brand: 'bg-sky-50 text-[#0F6E8C]',
    sky: 'bg-cyan-50 text-cyan-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>

        <div className={`rounded-2xl p-3 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-sky-100 text-sky-700',
    ready: 'bg-green-100 text-green-700',
    delivered: 'bg-cyan-100 text-cyan-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        styles[status] || styles.draft
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

function FormFields({
  formData,
  setFormData,
}: {
  formData: {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
  };
  setFormData: Dispatch<
    SetStateAction<{
      fullName: string;
      phone: string;
      email: string;
      address: string;
      notes: string;
    }>
  >;
}) {
  // Stage 13 §18 — every label is programmatically associated (useId) so
  // screen readers announce fields; required fields carry aria-required.
  const uid = useId();
  return (
    <>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor={`${uid}-fullName`}>
          Full Name *
        </label>
        <input
          id={`${uid}-fullName`}
          aria-required="true"
          type="text"
          value={formData.fullName}
          onChange={(e) => setFormData((f) => ({ ...f, fullName: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]"
          placeholder="John Smith"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor={`${uid}-phone`}>
          Phone
        </label>
        <input
          id={`${uid}-phone`}
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]"
          placeholder="+233 24 000 0000"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor={`${uid}-email`}>
          Email
        </label>
        <input
          id={`${uid}-email`}
          type="email"
          value={formData.email}
          onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]"
          placeholder="john@example.com"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor={`${uid}-address`}>
          Address
        </label>
        <textarea
          id={`${uid}-address`}
          value={formData.address}
          onChange={(e) => setFormData((f) => ({ ...f, address: e.target.value }))}
          rows={2}
          className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]"
          placeholder="123 Main Street, City"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor={`${uid}-notes`}>
          Notes
        </label>
        <textarea
          id={`${uid}-notes`}
          value={formData.notes}
          onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
          className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]"
          placeholder="Any preferences or notes..."
        />
      </div>
    </>
  );
}













