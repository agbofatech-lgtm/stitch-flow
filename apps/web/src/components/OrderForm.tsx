import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  ClipboardList,
  Layers,
  Package,
  Ruler,
  Save,
  Scissors,
  Shirt,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type {
  CustomerMeasurementProfile,
  GarmentMeasurements,
  GarmentType,
  Order,
  ProductionStage,
  ProductionStageCode,
} from '../types';

type OrderFormProps = {
  orderId?: string | null;
  customerId?: string | null;
  onClose?: () => void;
  onSaved?: (orderId: string) => void;
};

type OrderFormState = {
  customerId: string;
  selectedProfileId: string;
  garmentType: GarmentType;
  orderType: string;
  dueDate: string;
  notes: string;
  designInspirationId: string;
  selectedFabricId: string;
  subtotal: string;
  taxTotal: string;
  discountTotal: string;
  measurementSnapshot: Partial<GarmentMeasurements>;
};

type AlertTone = 'warning' | 'info';

type OrderFormAlert = {
  id: string;
  title: string;
  description: string;
  tone: AlertTone;
};

const GARMENT_OPTIONS: Array<{ value: GarmentType; label: string }> = [
  { value: 'bodice', label: 'Bodice' },
  { value: 'shirt', label: 'Shirt' },
  { value: 'trouser', label: 'Trouser' },
  { value: 'skirt', label: 'Skirt' },
  { value: 'kaftan', label: 'Kaftan' },
  { value: 'dress', label: 'Dress' },
  { value: 'gown', label: 'Gown' },
  { value: 'senator', label: 'Senator' },
  { value: 'agbada', label: 'Agbada' },
  { value: 'blouse', label: 'Blouse' },
  { value: 'custom', label: 'Custom' },
];

const SNAPSHOT_FIELDS: Array<{
  key: keyof GarmentMeasurements;
  label: string;
}> = [
  { key: 'bust', label: 'Bust' },
  { key: 'chest', label: 'Chest' },
  { key: 'waist', label: 'Waist' },
  { key: 'hip', label: 'Hip' },
  { key: 'neck', label: 'Neck' },
  { key: 'shoulder', label: 'Shoulder' },
  { key: 'sleeve', label: 'Sleeve' },
  { key: 'backLength', label: 'Back Length' },
  { key: 'bustSpan', label: 'Bust Span' },
  { key: 'armholeDepth', label: 'Armhole Depth' },
  { key: 'thigh', label: 'Thigh' },
  { key: 'knee', label: 'Knee' },
  { key: 'ankle', label: 'Ankle' },
  { key: 'trouserLength', label: 'Trouser Length' },
  { key: 'skirtLength', label: 'Skirt Length' },
  { key: 'fullLength', label: 'Full Length' },
];

const DEFAULT_PRODUCTION_STAGES: Array<{
  code: ProductionStageCode;
  label: string;
}> = [
  { code: 'measurement', label: 'Measurement' },
  { code: 'cutting', label: 'Cutting' },
  { code: 'sewing', label: 'Sewing' },
  { code: 'embroidery', label: 'Embroidery' },
  { code: 'first_fitting', label: '1st Fitting' },
  { code: 'second_fitting', label: '2nd Fitting' },
  { code: 'final_press', label: 'Final Press' },
  { code: 'ready', label: 'Ready' },
  { code: 'delivered', label: 'Delivered' },
];

function titleCase(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDateInput(value?: Date | string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function buildOrderNumber() {
  const now = new Date();
  const datePart = `${now.getFullYear().toString().slice(-2)}${String(
    now.getMonth() + 1
  ).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const timePart = `${String(now.getHours()).padStart(2, '0')}${String(
    now.getMinutes()
  ).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  return `SF-${datePart}-${timePart}`;
}

function parseAmount(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function countMeasurements(snapshot?: Partial<GarmentMeasurements> | null) {
  if (!snapshot) return 0;

  return Object.entries(snapshot).filter(([key, value]) => {
    if (key === 'notes') return false;
    return value !== undefined && value !== null && value !== '';
  }).length;
}

function profileToSnapshot(profile?: CustomerMeasurementProfile | null): Partial<GarmentMeasurements> {
  if (!profile) return {};

  return {
    bust: profile.bust,
    chest: profile.chest,
    waist: profile.waist,
    hip: profile.hip,
    neck: profile.neck,
    shoulder: profile.shoulder,
    sleeve: profile.sleeve,
    backLength: profile.backLength,
    bustSpan: profile.bustSpan,
    armholeDepth: profile.armholeDepth,
    thigh: profile.thigh,
    knee: profile.knee,
    ankle: profile.ankle,
    trouserLength: profile.trouserLength,
    skirtLength: profile.skirtLength,
    fullLength: profile.fullLength,
    inseam: profile.inseam,
    crotchDepth: profile.crotchDepth,
    shoulderToWaist: profile.shoulderToWaist,
    shoulderToHip: profile.shoulderToHip,
    sleeveOpening: profile.sleeveOpening,
    bicep: profile.bicep,
    wrist: profile.wrist,
    notes: profile.notes,
  };
}

function buildInitialStages(existing?: ProductionStage[] | null): ProductionStage[] {
  if (existing?.length) {
    return (DEFAULT_PRODUCTION_STAGES ?? []).map((stage, index) => {
      const found = existing.find((item) => item.code === stage.code);
      return (
        found || {
          code: stage.code,
          label: stage.label,
          status: index === 0 ? 'active' : 'pending',
          startedAt: index === 0 ? new Date() : null,
          completedAt: null,
          skippedAt: null,
          reopenedAt: null,
          notes: '',
        }
      );
    });
  }

  return (DEFAULT_PRODUCTION_STAGES ?? []).map((stage, index) => ({
    code: stage.code,
    label: stage.label,
    status: index === 0 ? 'active' : 'pending',
    startedAt: index === 0 ? new Date() : null,
    completedAt: null,
    skippedAt: null,
    reopenedAt: null,
    notes: '',
  }));
}

function getOrderFormAlerts(params: {
  measurementSnapshot: Partial<GarmentMeasurements>;
  designInspirationId: string;
  selectedFabricId: string;
  hasProductionPlan: boolean;
  garmentType: GarmentType;
  dueDate: string;
}): OrderFormAlert[] {
  const alerts: OrderFormAlert[] = [];

  if (countMeasurements(params.measurementSnapshot) === 0) {
    alerts.push({
      id: 'missing-measurements',
      title: 'Measurements missing',
      description: 'This order does not yet have a measurement snapshot.',
      tone: 'warning',
    });
  }

  if (!params.designInspirationId) {
    alerts.push({
      id: 'missing-inspiration',
      title: 'Inspiration not linked',
      description: 'Design reference is still missing for this order.',
      tone: 'warning',
    });
  }

  if (!params.selectedFabricId) {
    alerts.push({
      id: 'missing-fabric',
      title: 'Fabric not selected',
      description: 'Material choice is still missing and may block cutting.',
      tone: 'warning',
    });
  }

  if (!params.hasProductionPlan) {
    alerts.push({
      id: 'missing-production-plan',
      title: 'Production plan not generated',
      description: 'Save this order to Design Studio to generate its production plan.',
      tone: 'info',
    });
  }

  if (
    ['dress', 'gown', 'blouse', 'bodice'].includes(params.garmentType) &&
    params.dueDate
  ) {
    alerts.push({
      id: 'fitting-reminder',
      title: 'Fitting likely required',
      description: 'This garment type usually needs at least one fitting checkpoint.',
      tone: 'info',
    });
  }

  return alerts;
}

function buildInitialState(order?: Order | null, customerId?: string | null): OrderFormState {
  return {
    customerId: order?.customerId || customerId || '',
    selectedProfileId: '',
    garmentType: order?.garmentType || 'dress',
    orderType: order?.orderType || titleCase(order?.garmentType || 'dress'),
    dueDate: formatDateInput(order?.dueDate),
    notes: order?.notes || '',
    designInspirationId: order?.designInspirationId || '',
    selectedFabricId: order?.selectedFabricId || '',
    subtotal: String(order?.subtotal ?? ''),
    taxTotal: String(order?.taxTotal ?? ''),
    discountTotal: String(order?.discountTotal ?? ''),
    measurementSnapshot: order?.measurementSnapshot || order?.garmentMeasurements || {},
  };
}

export function OrderForm({
  orderId = null,
  customerId = null,
  onClose,
  onSaved,
}: OrderFormProps) {
  const {
    customers,
    orders,
    designInspirations,
    fabricRecords,
    currentWorkspace,
    getCustomerMeasurementProfiles,
    addOrder,
    updateOrder,
    selectOrder,
    setView,
  } = useApp();

  const editingOrder = orderId ? orders.find((order) => order.id === orderId) || null : null;

  const [form, setForm] = useState<OrderFormState>(() =>
    buildInitialState(editingOrder, customerId)
  );

  useEffect(() => {
    setForm(buildInitialState(editingOrder, customerId));
  }, [editingOrder, customerId]);

  const profiles = useMemo(
    () => (form.customerId ? getCustomerMeasurementProfiles(form.customerId) : []),
    [form.customerId, getCustomerMeasurementProfiles]
  );

  const selectedProfile =
    profiles.find((profile) => profile.id === form.selectedProfileId) || null;

  const totalAmount =
    parseAmount(form.subtotal) + parseAmount(form.taxTotal) - parseAmount(form.discountTotal);

  const alerts = getOrderFormAlerts({
    measurementSnapshot: form.measurementSnapshot,
    designInspirationId: form.designInspirationId,
    selectedFabricId: form.selectedFabricId,
    hasProductionPlan: !!editingOrder?.productionPlan,
    garmentType: form.garmentType,
    dueDate: form.dueDate,
  });

  const handleCustomerChange = (nextCustomerId: string) => {
    setForm((prev) => ({
      ...prev,
      customerId: nextCustomerId,
      selectedProfileId: '',
      measurementSnapshot: {},
    }));
  };

  const handleProfileChange = (profileId: string) => {
    const profile = profiles.find((item) => item.id === profileId) || null;

    setForm((prev) => ({
      ...prev,
      selectedProfileId: profileId,
      measurementSnapshot: profileToSnapshot(profile),
    }));
  };

  const handleMeasurementChange = (
    key: keyof GarmentMeasurements,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      measurementSnapshot: {
        ...prev.measurementSnapshot,
        [key]: value.trim() === '' ? undefined : Number(value),
      },
    }));
  };

  const handleSubmit = (openStudioAfterSave = false) => {
    if (!form.customerId) return;

    const basePayload: Omit<Order, 'id' | 'workspaceId' | 'createdAt'> = {
      customerId: form.customerId,
      customer: customers.find((item) => item.id === form.customerId),
      assignedTo: editingOrder?.assignedTo || null,
      orderNumber: editingOrder?.orderNumber || buildOrderNumber(),
      status: editingOrder?.status || 'in_progress',
      orderType: form.orderType.trim() || titleCase(form.garmentType),
      dueDate: form.dueDate ? new Date(`${form.dueDate}T00:00:00`) : null,
      notes: form.notes,
      designInspirationId: form.designInspirationId || null,
      selectedFabricId: form.selectedFabricId || null,
      selectedPatternId: editingOrder?.selectedPatternId || null,
      fitType: editingOrder?.fitType,
      styleNotes: editingOrder?.styleNotes,
      garmentType: form.garmentType,
      garmentMeasurements: form.measurementSnapshot,
      measurementSnapshot: form.measurementSnapshot,
      productionPlan: editingOrder?.productionPlan || null,
      inspirationAnalysis: editingOrder?.inspirationAnalysis || null,
      productionStages: buildInitialStages(editingOrder?.productionStages),
      subtotal: parseAmount(form.subtotal),
      taxTotal: parseAmount(form.taxTotal),
      discountTotal: parseAmount(form.discountTotal),
      totalAmount,
      currency: editingOrder?.currency || currentWorkspace.defaultCurrency || 'GHS',
    };

    if (editingOrder) {
      updateOrder(editingOrder.id, basePayload);
      selectOrder(editingOrder.id);
      onSaved?.(editingOrder.id);

      if (openStudioAfterSave) {
        setView('design-studio');
      }

      onClose?.();
      return;
    }

    const newOrderId = addOrder(basePayload);
    if (!newOrderId) return;

    selectOrder(newOrderId);
    onSaved?.(newOrderId);

    if (openStudioAfterSave) {
      setView('design-studio');
    }

    onClose?.();
  };

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="h-1.5 w-full bg-[#0F6E8C]" />

      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-[#0F6E8C]">
              <ClipboardList className="h-4 w-4" />
              Order Form
            </div>

            <h2 className="text-2xl font-bold text-slate-900">
              {editingOrder ? `Edit ${editingOrder.orderNumber}` : 'Create New Order'}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Capture garment production data, attach a reusable profile, and prepare the order
              for Design Studio and Production Board.
            </p>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
              aria-label="Close order form"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 p-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="rounded-[24px] border border-slate-200 bg-slate-50/60 p-4">
            <div className="mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-sky-500" />
              <h3 className="text-sm font-semibold text-slate-900">Customer + Order Setup</h3>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Customer">
                <select
                  value={form.customerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                >
                  <option value="">Select customer</option>
                  {(customers ?? []).map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.fullName}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Garment Type">
                <select
                  value={form.garmentType}
                  onChange={(e) => {
                    const nextGarmentType = e.target.value as GarmentType;
                    setForm((prev) => ({
                      ...prev,
                      garmentType: nextGarmentType,
                      orderType:
                        !prev.orderType || prev.orderType === titleCase(prev.garmentType)
                          ? titleCase(nextGarmentType)
                          : prev.orderType,
                    }));
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                >
                  {(GARMENT_OPTIONS ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Order Title / Type">
                <input
                  value={form.orderType}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      orderType: e.target.value,
                    }))
                  }
                  placeholder="e.g. Fitted Bridal Gown"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                />
              </Field>

              <Field label="Due Date">
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        dueDate: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                  />
                </div>
              </Field>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Subtotal">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.subtotal}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      subtotal: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                />
              </Field>

              <Field label="Tax">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.taxTotal}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      taxTotal: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                />
              </Field>

              <Field label="Discount">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discountTotal}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      discountTotal: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                />
              </Field>
            </div>

            <div className="mt-4 rounded-2xl bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total Amount
              </p>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {(totalAmount ?? 0).toFixed(2)} {currentWorkspace.defaultCurrency || 'GHS'}
              </p>
            </div>

            <div className="mt-4">
              <Field label="Notes">
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Special instructions, fitting notes, delivery notes..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-slate-50/60 p-4">
            <div className="mb-4 flex items-center gap-2">
              <Ruler className="h-4 w-4 text-sky-500" />
              <h3 className="text-sm font-semibold text-slate-900">Measurement Profile + Snapshot</h3>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Measurement Profile">
                <select
                  value={form.selectedProfileId}
                  onChange={(e) => handleProfileChange(e.target.value)}
                  disabled={!form.customerId}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-300 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">Select profile</option>
                  {(profiles ?? []).map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Snapshot Coverage
                </p>
                <p className="mt-2 text-xl font-bold text-slate-900">
                  {countMeasurements(form.measurementSnapshot)} fields
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Selected profile copies values into the order snapshot.
                </p>
              </div>
            </div>

            {selectedProfile?.notes && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
                <span className="font-semibold text-slate-800">Profile notes:</span>{' '}
                {selectedProfile.notes}
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(SNAPSHOT_FIELDS ?? []).map((field) => (
                <div
                  key={field.key}
                  className="rounded-2xl border border-slate-200 bg-white p-3"
                >
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {field.label}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={
                      typeof form.measurementSnapshot[field.key] === 'number'
                        ? String(form.measurementSnapshot[field.key] as number)
                        : ''
                    }
                    onChange={(e) => handleMeasurementChange(field.key, e.target.value)}
                    placeholder="0.0"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-slate-50/60 p-4">
            <div className="mb-4 flex items-center gap-2">
              <Layers className="h-4 w-4 text-sky-500" />
              <h3 className="text-sm font-semibold text-slate-900">Inspiration + Fabric</h3>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Design Inspiration">
                <select
                  value={form.designInspirationId}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      designInspirationId: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                >
                  <option value="">No inspiration linked</option>
                  {(designInspirations ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Fabric">
                <select
                  value={form.selectedFabricId}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      selectedFabricId: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-300"
                >
                  <option value="">No fabric selected</option>
                  {(fabricRecords ?? []).map((fabric) => (
                    <option key={fabric.id} value={fabric.id}>
                      {fabric.name} • {titleCase(fabric.fabricType)} • {fabric.quantityInStock}{' '}
                      {fabric.unit}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-900">Production Alerts Preview</h3>
            </div>

            {alerts.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                This order has the basic information needed to move into production setup.
              </div>
            ) : (
              <div className="space-y-3">
                {(alerts ?? []).map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-2xl border p-4 ${
                      alert.tone === 'warning'
                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                        : 'border-sky-200 bg-sky-50 text-sky-800'
                    }`}
                  >
                    <p className="font-semibold">{alert.title}</p>
                    <p className="mt-1 text-sm">{alert.description}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Scissors className="h-4 w-4 text-sky-500" />
              <h3 className="text-sm font-semibold text-slate-900">Workflow Initialization</h3>
            </div>

            <div className="space-y-3">
              {(DEFAULT_PRODUCTION_STAGES ?? []).map((stage, index) => (
                <div
                  key={stage.code}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{stage.label}</p>
                    <p className="text-xs text-slate-400">{stage.code}</p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      index === 0
                        ? 'bg-sky-100 text-[#0F6E8C]'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {index === 0 ? 'Active on save' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-sky-500" />
              <h3 className="text-sm font-semibold text-slate-900">Next Steps</h3>
            </div>

            <div className="space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-4">
                Save the order now to initialize production stages and preserve the measurement
                snapshot.
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                Open Design Studio after save to generate the production plan and attach AI
                production intelligence.
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                Production Board will later use these measurements and missing-data checks to flag
                overdue or blocked orders.
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={!form.customerId || !form.orderType.trim()}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition ${
                  form.customerId && form.orderType.trim()
                    ? 'bg-[#0F6E8C] text-white hover:bg-[#0C5C74]'
                    : 'cursor-not-allowed bg-slate-100 text-slate-400'
                }`}
              >
                <Save className="h-4 w-4" />
                {editingOrder ? 'Update Order' : 'Create Order'}
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={!form.customerId || !form.orderType.trim()}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition ${
                  form.customerId && form.orderType.trim()
                    ? 'border border-slate-200 bg-white text-slate-700 hover:bg-sky-50'
                    : 'cursor-not-allowed bg-slate-100 text-slate-400'
                }`}
              >
                <Shirt className="h-4 w-4" />
                Save and Open Design Studio
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}
