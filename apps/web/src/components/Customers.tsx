import {
  useMemo,
  useState,
  type Dispatch,
  type ElementType,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { useApp } from '../context/AppContext';
import { BRAND } from '../config/brand';
import {
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  Lock,
  X,
  Pencil,
  ShoppingBag,
  Ruler,
  Calendar,
  User,
  ClipboardList,
  CheckCircle2,
  Clock3,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  CurrencyCode,
  Customer,
  CustomerMeasurementProfile,
  Order,
  OrderStatus,
} from '../types';
import { formatCurrency, safeCurrency } from '@shared/utils/currency';

const ORDER_TYPE_OPTIONS = [
  'Senator',
  'Kaftan',
  'Agbada',
  'Suit',
  'Shirt',
  'Trousers',
  'Gown',
  'Dress',
  'Skirt',
  'Blouse',
  'Bridal',
  'Wedding Wear',
  'Traditional Wear',
  'Casual Wear',
  'Custom Outfit',
];

export function Customers() {
  const {
    customers,
    currentWorkspace,
    featureAccess,
    addCustomer,
    updateCustomer,
    addOrder,
    canPerform,
    selectOrder,
    setView,
    getCustomerOrders,
    getCustomerMeasurementProfiles,
    addCustomerMeasurementProfile,
  } = useApp();

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [orderCustomer, setOrderCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderMeasurementSeed, setOrderMeasurementSeed] =
    useState<CustomerMeasurementProfile | null>(null);

  const filteredCustomers = customers.filter(
    (c) =>
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  const canAdd = canPerform('manage_customers') && featureAccess.canCreateCustomer.allowed;
  const limitInfo = featureAccess.canCreateCustomer;

  const customersWithPhone = customers.filter((customer) => !!customer.phone.trim()).length;
  const customersWithEmail = customers.filter((customer) => !!customer.email.trim()).length;

  const openNewOrderForCustomer = (
    customer: Customer,
    measurementSeed?: CustomerMeasurementProfile | null
  ) => {
    setOrderMeasurementSeed(measurementSeed || null);
    setOrderCustomer(customer);
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-sm font-medium text-[#0F6E8C]">
            <Users className="h-4 w-4" />
            {BRAND.productName} Customer Management
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="mt-1 text-slate-500">
            Manage your client records, measurements, and order history.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          disabled={!canAdd}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium transition-colors ${
            canAdd
              ? 'bg-[#0F6E8C] text-white shadow-sm hover:bg-[#0C5C74]'
              : 'cursor-not-allowed bg-slate-100 text-slate-400'
          }`}
        >
          {!featureAccess.canCreateCustomer.allowed ? (
            <>
              <Lock className="h-4 w-4" />
              Upgrade to Add
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Add Customer
            </>
          )}
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          title="Total Customers"
          value={String(customers.length)}
          subtitle={
            limitInfo.limit
              ? `${Math.max(limitInfo.limit - customers.length, 0)} slots remaining`
              : 'Unlimited customer storage'
          }
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

      {!featureAccess.canCreateCustomer.allowed && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-medium text-amber-800">
            {featureAccess.canCreateCustomer.reason}
          </p>
          <p className="mt-1 text-sm text-amber-700">
            Upgrade to Pro for unlimited customers and more features.
          </p>
        </div>
      )}

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredCustomers.map((customer) => {
          const customerOrders = getCustomerOrders(customer.id);

          return (
            <div
              key={customer.id}
              className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="h-1.5 w-full bg-[#0F6E8C]" />

              <div className="p-5">
                <div className="cursor-pointer" onClick={() => setSelectedCustomer(customer)}>
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
                          Since {format(new Date(customer.createdAt), 'MMM yyyy')}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="rounded-lg p-1 hover:bg-slate-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4 text-slate-400" />
                    </button>
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
                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-[#0F6E8C]">
                      {customerOrders.length} orders
                    </span>

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
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>

                  <button
                    onClick={() => openNewOrderForCustomer(customer)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#0F6E8C] px-3 py-2.5 text-sm font-medium text-white hover:bg-[#0C5C74]"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    New Order
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="rounded-[24px] border border-dashed border-slate-200 bg-white py-12 text-center">
          <p className="text-slate-500">No customers found</p>
        </div>
      )}

      {showAddModal && (
        <AddCustomerModal onClose={() => setShowAddModal(false)} onAdd={addCustomer} />
      )}

      {editingCustomer && (
        <EditCustomerModal
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSave={(customerId, updates) => {
            updateCustomer(customerId, updates);
            setEditingCustomer(null);
          }}
        />
      )}

      {orderCustomer && (
        <NewOrderModal
          customer={orderCustomer}
          defaultCurrency={currentWorkspace.defaultCurrency || 'GHS'}
          previousMeasurements={getCustomerMeasurementProfiles(orderCustomer.id)}
          initialMeasurementProfile={orderMeasurementSeed}
          onClose={() => {
            setOrderCustomer(null);
            setOrderMeasurementSeed(null);
          }}
          onCreate={(payload) => {
            const newOrderId = addOrder(payload.orderData);

            if (payload.saveAsLatestMeasurement && payload.measurementProfile) {
              addCustomerMeasurementProfile(payload.measurementProfile);
            }

            setOrderCustomer(null);
            setOrderMeasurementSeed(null);

            if (newOrderId) {
              selectOrder(newOrderId);
            }

            setView('orders');
          }}
        />
      )}

      {selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          orders={getCustomerOrders(selectedCustomer.id)}
          measurements={getCustomerMeasurementProfiles(selectedCustomer.id)}
          currency={currentWorkspace.defaultCurrency || 'GHS'}
          onClose={() => setSelectedCustomer(null)}
          onNewOrder={() => {
            setSelectedCustomer(null);
            openNewOrderForCustomer(selectedCustomer);
          }}
          onNewOrderWithLatestMeasurements={(measurement) => {
            setSelectedCustomer(null);
            openNewOrderForCustomer(selectedCustomer, measurement);
          }}
          onEdit={() => {
            setSelectedCustomer(null);
            setEditingCustomer(selectedCustomer);
          }}
        />
      )}
    </div>
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
  }) => { success: boolean; error?: string };
}) {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      setError('Name is required');
      return;
    }

    const result = onAdd(formData);
    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Failed to add customer');
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
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 rounded-xl bg-[#0F6E8C] px-4 py-2.5 font-medium text-white hover:bg-[#0C5C74]"
          >
            Add Customer
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
  customer: Customer;
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
  ) => void;
}) {
  const [formData, setFormData] = useState({
    fullName: customer.fullName || '',
    phone: customer.phone || '',
    email: customer.email || '',
    address: customer.address || '',
    notes: customer.notes || '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      setError('Name is required');
      return;
    }

    onSave(customer.id, formData);
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
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 rounded-xl bg-[#0F6E8C] px-4 py-2.5 font-medium text-white hover:bg-[#0C5C74]"
          >
            Save Changes
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function NewOrderModal({
  customer,
  defaultCurrency,
  previousMeasurements,
  initialMeasurementProfile,
  onClose,
  onCreate,
}: {
  customer: Customer;
  defaultCurrency: CurrencyCode;
  previousMeasurements: CustomerMeasurementProfile[];
  initialMeasurementProfile?: CustomerMeasurementProfile | null;
  onClose: () => void;
  onCreate: (payload: {
    orderData: {
      customerId: string;
      assignedTo: string | null;
      orderNumber: string;
      status: OrderStatus;
      orderType: string;
      dueDate: Date | null;
      notes: string;
      subtotal: number;
      taxTotal: number;
      discountTotal: number;
      totalAmount: number;
      currency?: CurrencyCode;
      measurementSnapshot?: {
        chest?: number;
        waist?: number;
        hip?: number;
        shoulder?: number;
        sleeve?: number;
        neck?: number;
        bust?: number;
        backLength?: number;
        bustSpan?: number;
        armholeDepth?: number;
        skirtLength?: number;
        trouserLength?: number;
        notes?: string;
      };
    };
    saveAsLatestMeasurement: boolean;
    measurementProfile?: Omit<CustomerMeasurementProfile, 'id' | 'createdAt'>;
  }) => void;
}) {
  const latestMeasurement = initialMeasurementProfile || previousMeasurements[0];

  const [formData, setFormData] = useState({
    orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
    orderType: '',
    dueDate: '',
    notes: '',
    totalAmount: '',
    currency: defaultCurrency,
  });

  const [measurementData, setMeasurementData] = useState({
    chest: latestMeasurement?.chest?.toString() || '',
    waist: latestMeasurement?.waist?.toString() || '',
    hip: latestMeasurement?.hip?.toString() || '',
    shoulder: latestMeasurement?.shoulder?.toString() || '',
    sleeve: latestMeasurement?.sleeve?.toString() || '',
    neck: latestMeasurement?.neck?.toString() || '',
    bust: latestMeasurement?.bust?.toString() || '',
    backLength: latestMeasurement?.backLength?.toString() || '',
    bustSpan: latestMeasurement?.bustSpan?.toString() || '',
    armholeDepth: latestMeasurement?.armholeDepth?.toString() || '',
    skirtLength: latestMeasurement?.skirtLength?.toString() || '',
    trouserLength: latestMeasurement?.trouserLength?.toString() || '',
    notes: latestMeasurement?.notes || '',
    label: `Latest - ${format(new Date(), 'MMM d, yyyy')}`,
  });

  const [saveAsLatestMeasurement, setSaveAsLatestMeasurement] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!formData.orderType.trim()) {
      setError('Order type is required');
      return;
    }

    if (!formData.totalAmount || Number(formData.totalAmount) <= 0) {
      setError('Enter a valid amount');
      return;
    }

    const total = Number(formData.totalAmount);
    const measurementSnapshot = buildMeasurementSnapshot(measurementData);

    onCreate({
      orderData: {
        customerId: customer.id,
        assignedTo: null,
        orderNumber: formData.orderNumber,
        status: 'draft',
        orderType: formData.orderType,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
        notes: formData.notes,
        subtotal: total,
        taxTotal: 0,
        discountTotal: 0,
        totalAmount: total,
        currency: formData.currency,
        measurementSnapshot,
      },
      saveAsLatestMeasurement,
      measurementProfile: saveAsLatestMeasurement
        ? {
            customerId: customer.id,
            label: measurementData.label || `Latest - ${format(new Date(), 'MMM d, yyyy')}`,
            ...measurementSnapshot,
          }
        : undefined,
    });
  };

  return (
    <ModalShell title={`New Order for ${customer.fullName}`} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          Customer: <span className="font-semibold">{customer.fullName}</span>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Order Number
          </label>
          <input
            type="text"
            value={formData.orderNumber}
            onChange={(e) =>
              setFormData((f) => ({ ...f, orderNumber: e.target.value }))
            }
            className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Order Type *
          </label>
          <select
            value={formData.orderType}
            onChange={(e) =>
              setFormData((f) => ({ ...f, orderType: e.target.value }))
            }
            className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]"
          >
            <option value="">Select order type</option>
            {ORDER_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Due Date
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) =>
                setFormData((f) => ({ ...f, dueDate: e.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) =>
                setFormData((f) => ({
                  ...f,
                  currency: e.target.value as CurrencyCode,
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]"
            >
              <option value="GHS">GHS</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Amount *
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.totalAmount}
            onChange={(e) =>
              setFormData((f) => ({ ...f, totalAmount: e.target.value }))
            }
            placeholder="0.00"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]"
          />
        </div>

        <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Ruler className="h-4 w-4 text-[#0F6E8C]" />
            <h3 className="font-semibold text-slate-900">Measurements</h3>
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Measurement Label
            </label>
            <input
              type="text"
              value={measurementData.label}
              onChange={(e) =>
                setMeasurementData((m) => ({ ...m, label: e.target.value }))
              }
              placeholder="Latest - Mar 12, 2026"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <MeasurementInput label="Chest" value={measurementData.chest} onChange={(v) => setMeasurementData((m) => ({ ...m, chest: v }))} />
            <MeasurementInput label="Waist" value={measurementData.waist} onChange={(v) => setMeasurementData((m) => ({ ...m, waist: v }))} />
            <MeasurementInput label="Hip" value={measurementData.hip} onChange={(v) => setMeasurementData((m) => ({ ...m, hip: v }))} />
            <MeasurementInput label="Shoulder" value={measurementData.shoulder} onChange={(v) => setMeasurementData((m) => ({ ...m, shoulder: v }))} />
            <MeasurementInput label="Sleeve" value={measurementData.sleeve} onChange={(v) => setMeasurementData((m) => ({ ...m, sleeve: v }))} />
            <MeasurementInput label="Neck" value={measurementData.neck} onChange={(v) => setMeasurementData((m) => ({ ...m, neck: v }))} />
            <MeasurementInput label="Bust" value={measurementData.bust} onChange={(v) => setMeasurementData((m) => ({ ...m, bust: v }))} />
            <MeasurementInput label="Back Length" value={measurementData.backLength} onChange={(v) => setMeasurementData((m) => ({ ...m, backLength: v }))} />
            <MeasurementInput label="Bust Span" value={measurementData.bustSpan} onChange={(v) => setMeasurementData((m) => ({ ...m, bustSpan: v }))} />
            <MeasurementInput label="Armhole Depth" value={measurementData.armholeDepth} onChange={(v) => setMeasurementData((m) => ({ ...m, armholeDepth: v }))} />
            <MeasurementInput label="Skirt Length" value={measurementData.skirtLength} onChange={(v) => setMeasurementData((m) => ({ ...m, skirtLength: v }))} />
            <MeasurementInput label="Trouser Length" value={measurementData.trouserLength} onChange={(v) => setMeasurementData((m) => ({ ...m, trouserLength: v }))} />
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Measurement Notes
            </label>
            <textarea
              value={measurementData.notes}
              onChange={(e) =>
                setMeasurementData((m) => ({ ...m, notes: e.target.value }))
              }
              rows={2}
              placeholder="Fitted waist, extra ease on hip, customer changed size..."
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]"
            />
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={saveAsLatestMeasurement}
              onChange={(e) => setSaveAsLatestMeasurement(e.target.checked)}
            />
            Save these measurements as latest customer measurements
          </label>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Order Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData((f) => ({ ...f, notes: e.target.value }))
            }
            rows={3}
            placeholder="Style notes, fabric notes, delivery notes..."
            className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 rounded-xl bg-[#0F6E8C] px-4 py-2.5 font-medium text-white hover:bg-[#0C5C74]"
          >
            Create Order
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function CustomerDetailsModal({
  customer,
  orders,
  measurements,
  currency,
  onClose,
  onNewOrder,
  onNewOrderWithLatestMeasurements,
  onEdit,
}: {
  customer: Customer;
  orders: Order[];
  measurements: CustomerMeasurementProfile[];
  currency: CurrencyCode;
  onClose: () => void;
  onNewOrder: () => void;
  onNewOrderWithLatestMeasurements: (measurement: CustomerMeasurementProfile) => void;
  onEdit: () => void;
}) {
  const sortedOrders = useMemo(
    () =>
      [...orders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [orders]
  );

  const latestMeasurement = measurements[0];

  const activeOrders = sortedOrders.filter((order) =>
    ['draft', 'in_progress', 'ready'].includes(order.status)
  ).length;

  const deliveredOrders = sortedOrders.filter(
    (order) => order.status === 'delivered'
  ).length;

  return (
    <ModalShell title={customer.fullName} onClose={onClose} wide>
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

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <ProfileStatCard
              title="Total Orders"
              value={String(sortedOrders.length)}
              icon={ClipboardList}
              tone="brand"
            />
            <ProfileStatCard
              title="Active Orders"
              value={String(activeOrders)}
              icon={Clock3}
              tone="amber"
            />
            <ProfileStatCard
              title="Delivered"
              value={String(deliveredOrders)}
              icon={CheckCircle2}
              tone="green"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={onEdit}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              Edit Customer
            </button>
            <button
              onClick={onNewOrder}
              className="rounded-xl bg-[#0F6E8C] px-4 py-2 text-sm font-medium text-white hover:bg-[#0C5C74]"
            >
              New Order
            </button>
            {latestMeasurement && (
              <button
                onClick={() => onNewOrderWithLatestMeasurements(latestMeasurement)}
                className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
              >
                New Order with Latest Measurements
              </button>
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <Ruler className="h-4 w-4 text-[#0F6E8C]" />
            <h3 className="font-semibold text-slate-900">Latest Measurement</h3>
          </div>

          {latestMeasurement ? (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold text-slate-900">{latestMeasurement.label}</p>
                <p className="text-xs text-sky-600">
                  {format(new Date(latestMeasurement.createdAt), 'MMM d, yyyy')}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {renderCustomerMeasurementChips(latestMeasurement).map((item) => (
                  <span
                    key={item.label}
                    className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[#0F6E8C]"
                  >
                    {item.label}: {item.value}
                  </span>
                ))}
              </div>

              {latestMeasurement.notes && (
                <p className="mt-3 text-sm text-slate-700">{latestMeasurement.notes}</p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              No latest measurement yet.
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <Ruler className="h-4 w-4 text-[#0F6E8C]" />
            <h3 className="font-semibold text-slate-900">Measurement History</h3>
          </div>

          {measurements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              No measurement history yet.
            </div>
          ) : (
            <div className="space-y-3">
              {measurements.map((measurement) => (
                <div
                  key={measurement.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium text-slate-900">{measurement.label}</p>
                    <p className="text-xs text-slate-400">
                      {format(new Date(measurement.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {renderCustomerMeasurementChips(measurement).map((item) => (
                      <span
                        key={item.label}
                        className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-[#0F6E8C]"
                      >
                        {item.label}: {item.value}
                      </span>
                    ))}
                  </div>

                  {measurement.notes && (
                    <p className="mt-2 text-sm text-slate-500">{measurement.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <User className="h-4 w-4 text-[#0F6E8C]" />
            <h3 className="font-semibold text-slate-900">Order History</h3>
          </div>

          {sortedOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              No orders yet for this customer.
            </div>
          ) : (
            <div className="space-y-3">
              {sortedOrders.map((order) => (
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
                        {formatCurrency(
                          order.totalAmount,
                          safeCurrency(order.currency, currency)
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        {format(new Date(order.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
                    {order.dueDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Due {format(new Date(order.dueDate), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>

                  {order.measurementSnapshot && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {renderOrderMeasurementChips(order.measurementSnapshot).map((item) => (
                        <span
                          key={item.label}
                          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                        >
                          {item.label}: {item.value}
                        </span>
                      ))}
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

function ModalShell({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full rounded-[24px] bg-white shadow-xl ${wide ? 'max-w-4xl' : 'max-w-md'}`}>
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>
        <div className={wide ? 'max-h-[85vh] overflow-y-auto' : ''}>{children}</div>
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

function ProfileStatCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  icon: ElementType;
  tone: 'brand' | 'amber' | 'green';
}) {
  const tones = {
    brand: 'bg-sky-50 text-[#0F6E8C]',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-green-50 text-green-700',
  };

  return (
    <div className={`rounded-2xl p-4 ${tones[tone]}`}>
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white/70">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{title}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-sky-100 text-sky-700',
    ready: 'bg-green-100 text-green-700',
    delivered: 'bg-indigo-100 text-indigo-700',
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
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Full Name *
        </label>
        <input
          type="text"
          value={formData.fullName}
          onChange={(e) => setFormData((f) => ({ ...f, fullName: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]"
          placeholder="John Smith"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Phone
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]"
          placeholder="+233 24 000 0000"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]"
          placeholder="john@example.com"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Address
        </label>
        <textarea
          value={formData.address}
          onChange={(e) => setFormData((f) => ({ ...f, address: e.target.value }))}
          rows={2}
          className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]"
          placeholder="123 Main Street, City"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Notes
        </label>
        <textarea
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

function MeasurementInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type="number"
        step="0.1"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F6E8C]"
        placeholder="0"
      />
    </div>
  );
}

function buildMeasurementSnapshot(data: {
  chest: string;
  waist: string;
  hip: string;
  shoulder: string;
  sleeve: string;
  neck: string;
  bust: string;
  backLength: string;
  bustSpan: string;
  armholeDepth: string;
  skirtLength: string;
  trouserLength: string;
  notes: string;
}) {
  const toNumber = (value: string) => (value ? Number(value) : undefined);

  return {
    chest: toNumber(data.chest),
    waist: toNumber(data.waist),
    hip: toNumber(data.hip),
    shoulder: toNumber(data.shoulder),
    sleeve: toNumber(data.sleeve),
    neck: toNumber(data.neck),
    bust: toNumber(data.bust),
    backLength: toNumber(data.backLength),
    bustSpan: toNumber(data.bustSpan),
    armholeDepth: toNumber(data.armholeDepth),
    skirtLength: toNumber(data.skirtLength),
    trouserLength: toNumber(data.trouserLength),
    notes: data.notes || undefined,
  };
}

function renderCustomerMeasurementChips(measurement: CustomerMeasurementProfile) {
  const fields = [
    ['Chest', measurement.chest],
    ['Waist', measurement.waist],
    ['Hip', measurement.hip],
    ['Shoulder', measurement.shoulder],
    ['Sleeve', measurement.sleeve],
    ['Neck', measurement.neck],
    ['Bust', measurement.bust],
    ['Back', measurement.backLength],
    ['Bust Span', measurement.bustSpan],
    ['Armhole', measurement.armholeDepth],
    ['Skirt', measurement.skirtLength],
    ['Trouser', measurement.trouserLength],
  ];

  return fields
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([label, value]) => ({
      label: String(label),
      value: String(value),
    }));
}

function renderOrderMeasurementChips(
  measurementSnapshot: Record<string, unknown>
): Array<{ label: string; value: string }> {
  const labelMap: Record<string, string> = {
    chest: 'Chest',
    waist: 'Waist',
    hip: 'Hip',
    shoulder: 'Shoulder',
    sleeve: 'Sleeve',
    neck: 'Neck',
    bust: 'Bust',
    backLength: 'Back',
    bustSpan: 'Bust Span',
    armholeDepth: 'Armhole',
    skirtLength: 'Skirt',
    trouserLength: 'Trouser',
  };

  return Object.entries(measurementSnapshot)
    .filter(
      ([key, value]) =>
        key !== 'notes' && value !== undefined && value !== null && value !== ''
    )
    .map(([key, value]) => ({
      label: labelMap[key] || key,
      value: String(value),
    }));
}
