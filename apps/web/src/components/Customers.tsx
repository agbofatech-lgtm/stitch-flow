import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ElementType,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from 'react';
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
} from 'lucide-react';
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
import {
  Button,
  ErrorState,
  ExperienceEmptyState,
  LoadingState,
  PageHeader,
  Workroom,
} from '../experience';

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
  const [debugInfo, setDebugInfo] = useState<string>('Customers screen mounted');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<ApiCustomer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<ApiCustomer | null>(null);

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
    <Workroom>
      <PageHeader
        level={2}
        kicker="Client studio"
        title="Customers"
        description="View, create, edit, and inspect real customer records from the backend API."
        actions={
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        }
      />

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

      <div className="relative mb-6 rounded-2xl border border-line bg-surface-panel shadow-sm">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          placeholder="Search customers by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl py-3 pl-11 pr-4 text-ink-secondary outline-none ring-0 placeholder:text-ink-muted focus:ring-2 focus:ring-action-primary"
        />
      </div>

      {loading && <LoadingState label="Loading customers…" />}

      {error && (
        <ErrorState
          title="Customers could not load"
          description={`${error} Source: ${API_BASE}/customers`}
          action={
            <Button variant="secondary" size="sm" onClick={() => void loadCustomers()}>
              Retry
            </Button>
          }
        />
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(filteredCustomers ?? []).map((customer) => (
              <div
                key={customer.id}
                className="overflow-hidden rounded-sf-lg border border-line bg-surface-panel shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="h-1.5 w-full bg-action-primary" />

                <div className="p-5">
                  <div
                    className="cursor-pointer"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-action-secondary">
                          <span className="font-semibold text-action-primary">
                            {customer.fullName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-semibold text-ink-primary">{customer.fullName}</h3>
                          <p className="text-xs text-ink-muted">
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
                        <div className="flex items-center gap-2 text-ink-secondary">
                          <Phone className="h-4 w-4 text-ink-muted" />
                          {customer.phone}
                        </div>
                      )}

                      {customer.email && (
                        <div className="flex items-center gap-2 text-ink-secondary">
                          <Mail className="h-4 w-4 text-ink-muted" />
                          {customer.email}
                        </div>
                      )}

                      {customer.address && (
                        <div className="flex items-start gap-2 text-ink-secondary">
                          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-ink-muted" />
                          <span className="line-clamp-2">{customer.address}</span>
                        </div>
                      )}
                    </div>

                    {customer.notes && (
                      <div className="mt-4 rounded-2xl bg-surface-workspace p-3">
                        <p className="line-clamp-2 text-xs text-ink-muted">{customer.notes}</p>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {customer.phone && (
                        <span className="rounded-full bg-action-secondary px-2.5 py-1 text-xs font-medium text-ink-secondary">
                          Phone saved
                        </span>
                      )}

                      {customer.email && (
                        <span className="rounded-full bg-action-secondary px-2.5 py-1 text-xs font-medium text-ink-secondary">
                          Email saved
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => setEditingCustomer(customer)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-line px-3 py-2.5 text-sm font-medium text-ink-secondary hover:bg-surface-workspace"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredCustomers.length === 0 && (
            <ExperienceEmptyState
              title={customers.length === 0 ? 'No customers yet' : 'No customers match your search'}
              description={
                customers.length === 0
                  ? 'Add your first customer to start creating orders and invoices.'
                  : 'Try a different name, phone number, or email.'
              }
              action={
                customers.length === 0 ? (
                  <Button size="sm" onClick={() => setShowAddModal(true)}>
                    Add Customer
                  </Button>
                ) : undefined
              }
            />
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
    </Workroom>
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
        <div className="rounded-2xl border border-line-subtle bg-surface-workspace p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center gap-2 text-sm text-ink-secondary">
              <Phone className="h-4 w-4 text-ink-muted" />
              {customer.phone || 'No phone'}
            </div>
            <div className="flex items-center gap-2 text-sm text-ink-secondary">
              <Mail className="h-4 w-4 text-ink-muted" />
              {customer.email || 'No email'}
            </div>
            <div className="flex items-start gap-2 text-sm text-ink-secondary md:col-span-2">
              <MapPin className="mt-0.5 h-4 w-4 text-ink-muted" />
              {customer.address || 'No address'}
            </div>
          </div>

          {customer.notes && (
            <p className="mt-3 text-sm text-ink-secondary">{customer.notes}</p>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-action-primary" />
            <h3 className="font-semibold text-ink-primary">Order History</h3>
          </div>

          {loading && (
            <div className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-muted">
              Loading customer orders...
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-muted">
              No orders yet for this customer.
            </div>
          )}

          {!loading && !error && orders.length > 0 && (
            <div className="space-y-3">
              {(orders ?? []).map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-line bg-surface-panel p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-ink-primary">{order.orderNumber}</p>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <p className="mt-1 text-sm text-ink-muted">{order.orderType}</p>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-ink-primary">
                        {formatCurrency(order.totalAmount, safeCurrency(order.currency, 'GHS'))}
                      </p>
                      {order.createdAt && (
                        <p className="text-xs text-ink-muted">
                          {format(new Date(order.createdAt), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>

                  {order.dueDate && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
                      <Calendar className="h-4 w-4" />
                      Due {format(new Date(order.dueDate), 'MMM d, yyyy')}
                    </div>
                  )}

                  {order.notes && (
                    <p className="mt-3 text-sm text-ink-muted">{order.notes}</p>
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

function AddCustomerModal({
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
            className="flex-1 rounded-xl border border-line px-4 py-2.5 font-medium text-ink-secondary hover:bg-surface-workspace disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-action-primary px-4 py-2.5 font-medium text-white hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Add Customer'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function EditCustomerModal({
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
            className="flex-1 rounded-xl border border-line px-4 py-2.5 font-medium text-ink-secondary hover:bg-surface-workspace disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-action-primary px-4 py-2.5 font-medium text-white hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-sf-lg bg-surface-panel shadow-xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="text-lg font-semibold text-ink-primary">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-action-secondary">
            <X className="h-5 w-5 text-ink-muted" />
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
    brand: 'bg-action-secondary text-action-primary',
    sky: 'bg-action-secondary text-action-primary',
    slate: 'bg-action-secondary text-ink-secondary',
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

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-action-secondary text-ink-secondary',
    in_progress: 'bg-action-secondary text-action-primary',
    ready: 'bg-green-100 text-green-700',
    delivered: 'bg-cyan-100 text-action-primary',
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
  return (
    <>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-secondary">
          Full Name *
        </label>
        <input
          type="text"
          value={formData.fullName}
          onChange={(e) => setFormData((f) => ({ ...f, fullName: e.target.value }))}
          className="w-full rounded-xl border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-action-primary"
          placeholder="John Smith"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-secondary">
          Phone
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
          className="w-full rounded-xl border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-action-primary"
          placeholder="+233 24 000 0000"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-secondary">
          Email
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
          className="w-full rounded-xl border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-action-primary"
          placeholder="john@example.com"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-secondary">
          Address
        </label>
        <textarea
          value={formData.address}
          onChange={(e) => setFormData((f) => ({ ...f, address: e.target.value }))}
          rows={2}
          className="w-full resize-none rounded-xl border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-action-primary"
          placeholder="123 Main Street, City"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-secondary">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
          className="w-full resize-none rounded-xl border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-action-primary"
          placeholder="Any preferences or notes..."
        />
      </div>
    </>
  );
}
