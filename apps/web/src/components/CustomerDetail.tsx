import { useMemo, useState } from 'react';
import {
  BadgeInfo,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Plus,
  Ruler,
  Save,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { BodyMeasurements, CustomerMeasurementProfile, GarmentMeasurements } from '../types';

type CustomerDetailProps = {
  customerId: string;
  onCreateOrderFromProfile?: (profile: CustomerMeasurementProfile) => void;
};

type ProfileDraft = {
  label: string;
  bust: string;
  chest: string;
  waist: string;
  hip: string;
  neck: string;
  shoulder: string;
  sleeve: string;
  backLength: string;
  bustSpan: string;
  armholeDepth: string;
  thigh: string;
  knee: string;
  ankle: string;
  trouserLength: string;
  skirtLength: string;
  fullLength: string;
  inseam: string;
  crotchDepth: string;
  shoulderToWaist: string;
  shoulderToHip: string;
  sleeveOpening: string;
  bicep: string;
  wrist: string;
  notes: string;
};

const MEASUREMENT_FIELDS: Array<{
  key: Exclude<keyof ProfileDraft, 'label' | 'notes'>;
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
  { key: 'inseam', label: 'Inseam' },
  { key: 'crotchDepth', label: 'Crotch Depth' },
  { key: 'shoulderToWaist', label: 'Shoulder to Waist' },
  { key: 'shoulderToHip', label: 'Shoulder to Hip' },
  { key: 'sleeveOpening', label: 'Sleeve Opening' },
  { key: 'bicep', label: 'Bicep' },
  { key: 'wrist', label: 'Wrist' },
];

function createEmptyDraft(): ProfileDraft {
  return {
    label: '',
    bust: '',
    chest: '',
    waist: '',
    hip: '',
    neck: '',
    shoulder: '',
    sleeve: '',
    backLength: '',
    bustSpan: '',
    armholeDepth: '',
    thigh: '',
    knee: '',
    ankle: '',
    trouserLength: '',
    skirtLength: '',
    fullLength: '',
    inseam: '',
    crotchDepth: '',
    shoulderToWaist: '',
    shoulderToHip: '',
    sleeveOpening: '',
    bicep: '',
    wrist: '',
    notes: '',
  };
}

function toDraft(profile: CustomerMeasurementProfile): ProfileDraft {
  return {
    label: profile.label || '',
    bust: profile.bust?.toString() || '',
    chest: profile.chest?.toString() || '',
    waist: profile.waist?.toString() || '',
    hip: profile.hip?.toString() || '',
    neck: profile.neck?.toString() || '',
    shoulder: profile.shoulder?.toString() || '',
    sleeve: profile.sleeve?.toString() || '',
    backLength: profile.backLength?.toString() || '',
    bustSpan: profile.bustSpan?.toString() || '',
    armholeDepth: profile.armholeDepth?.toString() || '',
    thigh: profile.thigh?.toString() || '',
    knee: profile.knee?.toString() || '',
    ankle: profile.ankle?.toString() || '',
    trouserLength: profile.trouserLength?.toString() || '',
    skirtLength: profile.skirtLength?.toString() || '',
    fullLength: profile.fullLength?.toString() || '',
    inseam: profile.inseam?.toString() || '',
    crotchDepth: profile.crotchDepth?.toString() || '',
    shoulderToWaist: profile.shoulderToWaist?.toString() || '',
    shoulderToHip: profile.shoulderToHip?.toString() || '',
    sleeveOpening: profile.sleeveOpening?.toString() || '',
    bicep: profile.bicep?.toString() || '',
    wrist: profile.wrist?.toString() || '',
    notes: profile.notes || '',
  };
}

function parseNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function draftToProfileInput(
  customerId: string,
  draft: ProfileDraft
): Omit<CustomerMeasurementProfile, 'id' | 'createdAt'> {
  return {
    customerId,
    label: draft.label.trim(),
    bust: parseNumber(draft.bust),
    chest: parseNumber(draft.chest),
    waist: parseNumber(draft.waist),
    hip: parseNumber(draft.hip),
    neck: parseNumber(draft.neck),
    shoulder: parseNumber(draft.shoulder),
    sleeve: parseNumber(draft.sleeve),
    backLength: parseNumber(draft.backLength),
    bustSpan: parseNumber(draft.bustSpan),
    armholeDepth: parseNumber(draft.armholeDepth),
    thigh: parseNumber(draft.thigh),
    knee: parseNumber(draft.knee),
    ankle: parseNumber(draft.ankle),
    trouserLength: parseNumber(draft.trouserLength),
    skirtLength: parseNumber(draft.skirtLength),
    fullLength: parseNumber(draft.fullLength),
    inseam: parseNumber(draft.inseam),
    crotchDepth: parseNumber(draft.crotchDepth),
    shoulderToWaist: parseNumber(draft.shoulderToWaist),
    shoulderToHip: parseNumber(draft.shoulderToHip),
    sleeveOpening: parseNumber(draft.sleeveOpening),
    bicep: parseNumber(draft.bicep),
    wrist: parseNumber(draft.wrist),
    notes: draft.notes.trim() || undefined,
  };
}

function toBodyMeasurementUpdates(
  source: Partial<GarmentMeasurements>
): Partial<BodyMeasurements> {
  return {
    bust:
      typeof source.bust === 'number'
        ? source.bust
        : typeof source.chest === 'number'
        ? source.chest
        : undefined,
    waist: source.waist,
    neck: source.neck,
    shoulder: source.shoulder,
    backLength: source.backLength,
    bustSpan: source.bustSpan,
    armholeDepth: source.armholeDepth,
  };
}

function getProfileHighlights(profile: CustomerMeasurementProfile) {
  const highlights: Array<{ label: string; value: number }> = [];

  if (typeof profile.bust === 'number') highlights.push({ label: 'Bust', value: profile.bust });
  if (typeof profile.chest === 'number') highlights.push({ label: 'Chest', value: profile.chest });
  if (typeof profile.waist === 'number') highlights.push({ label: 'Waist', value: profile.waist });
  if (typeof profile.hip === 'number') highlights.push({ label: 'Hip', value: profile.hip });
  if (typeof profile.shoulder === 'number') {
    highlights.push({ label: 'Shoulder', value: profile.shoulder });
  }
  if (typeof profile.sleeve === 'number') {
    highlights.push({ label: 'Sleeve', value: profile.sleeve });
  }

  return highlights.slice(0, 6);
}

export function CustomerDetail({
  customerId,
  onCreateOrderFromProfile,
}: CustomerDetailProps) {
  const {
    customers,
    orders,
    selectedOrderId,
    getCustomerMeasurementProfiles,
    addCustomerMeasurementProfile,
    updateCustomerMeasurementProfile,
    deleteCustomerMeasurementProfile,
    applyMeasurementProfileToOrder,
    setDesignMeasurements,
    setGarmentMeasurements,
    setView,
  } = useApp();

  const customer = customers.find((item) => item.id === customerId) || null;
  const profiles = getCustomerMeasurementProfiles(customerId);

  const selectedOrder =
    selectedOrderId && orders.find((item) => item.id === selectedOrderId)
      ? orders.find((item) => item.id === selectedOrderId) || null
      : null;

  const selectedOrderMatchesCustomer =
    !!selectedOrder && selectedOrder.customerId === customerId;

  const [draft, setDraft] = useState<ProfileDraft>(createEmptyDraft());
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const customerOrders = useMemo(
    () => orders.filter((order) => order.customerId === customerId),
    [orders, customerId]
  );

  const startCreate = () => {
    setDraft(createEmptyDraft());
    setEditingProfileId(null);
    setShowForm(true);
  };

  const startEdit = (profile: CustomerMeasurementProfile) => {
    setDraft(toDraft(profile));
    setEditingProfileId(profile.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setDraft(createEmptyDraft());
    setEditingProfileId(null);
    setShowForm(false);
  };

  const handleSave = () => {
    if (!draft.label.trim()) return;

    const payload = draftToProfileInput(customerId, draft);

    if (editingProfileId) {
      updateCustomerMeasurementProfile(editingProfileId, {
        label: payload.label,
        bust: payload.bust,
        chest: payload.chest,
        waist: payload.waist,
        hip: payload.hip,
        neck: payload.neck,
        shoulder: payload.shoulder,
        sleeve: payload.sleeve,
        backLength: payload.backLength,
        bustSpan: payload.bustSpan,
        armholeDepth: payload.armholeDepth,
        thigh: payload.thigh,
        knee: payload.knee,
        ankle: payload.ankle,
        trouserLength: payload.trouserLength,
        skirtLength: payload.skirtLength,
        fullLength: payload.fullLength,
        inseam: payload.inseam,
        crotchDepth: payload.crotchDepth,
        shoulderToWaist: payload.shoulderToWaist,
        shoulderToHip: payload.shoulderToHip,
        sleeveOpening: payload.sleeveOpening,
        bicep: payload.bicep,
        wrist: payload.wrist,
        notes: payload.notes,
      });
    } else {
      addCustomerMeasurementProfile(payload);
    }

    closeForm();
  };

  const handleLoadIntoStudio = (profile: CustomerMeasurementProfile) => {
    const garmentMeasurements = draftToProfileInput(customerId, toDraft(profile));
    setGarmentMeasurements(garmentMeasurements);
    setDesignMeasurements(toBodyMeasurementUpdates(garmentMeasurements));
    setView('design-studio');
  };

  const handleApplyToSelectedOrder = (profileId: string) => {
    if (!selectedOrder || !selectedOrderMatchesCustomer) return;
    applyMeasurementProfileToOrder(selectedOrder.id, profileId);
  };

  if (!customer) {
    return (
      <div className="rounded-sf-lg border border-dashed border-line bg-surface-panel p-8 text-center">
        <User className="mx-auto mb-3 h-8 w-8 text-ink-muted" />
        <p className="font-semibold text-ink-primary">Customer not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-sf-workspace border border-line bg-surface-panel shadow-sm">
        <div className="h-1.5 w-full bg-action-primary" />

        <div className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-action-secondary px-3 py-1 text-sm font-medium text-action-primary">
                <Ruler className="h-4 w-4" />
                Measurement Profiles
              </div>

              <h2 className="text-2xl font-bold text-ink-primary">{customer.fullName}</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Save multiple fit profiles for different garment types and reuse them in orders
                and Design Studio.
              </p>
            </div>

            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-action-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-action-hover"
            >
              <Plus className="h-4 w-4" />
              New Profile
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard
              icon={ClipboardList}
              label="Profiles"
              value={String(profiles.length)}
              tone="brand"
            />
            <StatCard
              icon={CheckCircle2}
              label="Orders"
              value={String(customerOrders.length)}
              tone="emerald"
            />
            <StatCard
              icon={Sparkles}
              label="Selected Order"
              value={
                selectedOrderMatchesCustomer && selectedOrder
                  ? selectedOrder.orderNumber
                  : 'None'
              }
              tone="amber"
            />
          </div>

          {!selectedOrderMatchesCustomer && selectedOrder && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              The currently selected order belongs to another customer. You can still load a
              profile into Design Studio or use the profile when creating a new order.
            </div>
          )}
        </div>
      </section>

      {showForm && (
        <section className="rounded-sf-workspace border border-line bg-surface-panel p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-ink-primary">
                {editingProfileId ? 'Edit Measurement Profile' : 'Create Measurement Profile'}
              </h3>
              <p className="mt-1 text-sm text-ink-muted">
                Name profiles by fit or garment use, like “Fitted Gown” or “Senator Set”.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl border border-line p-2 text-ink-muted transition hover:bg-surface-workspace"
              aria-label="Close profile form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
            <div className="rounded-sf-lg border border-line bg-surface-workspace p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Profile Label
              </label>
              <input
                value={draft.label}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    label: e.target.value,
                  }))
                }
                placeholder="e.g. Fitted Gown"
                className="w-full rounded-xl border border-line bg-surface-panel px-3 py-2.5 text-sm text-ink-secondary outline-none transition focus:border-action-primary"
              />

              <label className="mt-4 mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Notes
              </label>
              <textarea
                value={draft.notes}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                rows={6}
                placeholder="Special fit notes, posture notes, fitting preferences..."
                className="w-full resize-none rounded-xl border border-line bg-surface-panel px-3 py-2.5 text-sm text-ink-secondary outline-none transition focus:border-action-primary"
              />

              <div className="mt-4 rounded-2xl bg-surface-panel p-3 text-xs leading-6 text-ink-muted">
                This profile can be copied into an order snapshot, loaded into Design Studio,
                or reused for future orders.
              </div>
            </div>

            <div className="rounded-sf-lg border border-line bg-surface-panel p-4">
              <div className="mb-4 flex items-center gap-2">
                <BadgeInfo className="h-4 w-4 text-action-primary" />
                <h4 className="text-sm font-semibold text-ink-primary">Measurements</h4>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(MEASUREMENT_FIELDS ?? []).map((field) => (
                  <div
                    key={field.key}
                    className="rounded-2xl border border-line bg-surface-workspace p-3"
                  >
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      {field.label}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={draft[field.key]}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      placeholder="0.0"
                      className="w-full rounded-xl border border-line bg-surface-panel px-3 py-2.5 text-sm text-ink-secondary outline-none transition focus:border-action-primary"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!draft.label.trim()}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    draft.label.trim()
                      ? 'bg-action-primary text-white hover:bg-action-hover'
                      : 'cursor-not-allowed bg-action-secondary text-ink-muted'
                  }`}
                >
                  <Save className="h-4 w-4" />
                  {editingProfileId ? 'Update Profile' : 'Save Profile'}
                </button>

                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-2xl border border-line bg-surface-panel px-4 py-3 text-sm font-semibold text-ink-secondary transition hover:bg-surface-workspace"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-sf-workspace border border-line bg-surface-panel p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-ink-primary">Saved Profiles</h3>
            <p className="mt-1 text-sm text-ink-muted">
              Reuse profiles across order creation, editing, and studio drafting.
            </p>
          </div>
        </div>

        {profiles.length === 0 ? (
          <div className="rounded-sf-lg border border-dashed border-line bg-action-secondary/60 p-10 text-center">
            <Ruler className="mx-auto mb-3 h-8 w-8 text-action-primary" />
            <p className="font-semibold text-ink-primary">No measurement profiles yet</p>
            <p className="mt-2 text-sm text-ink-muted">
              Create a reusable fit profile for this customer to speed up orders and drafting.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {(profiles ?? []).map((profile) => {
              const highlights = getProfileHighlights(profile);

              return (
                <div
                  key={profile.id}
                  className="rounded-sf-lg border border-line bg-surface-workspace/50 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-action-secondary px-3 py-1 text-xs font-semibold text-action-primary">
                          {profile.label}
                        </span>
                        <span className="text-xs text-ink-muted">
                          Saved {new Date(profile.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {highlights.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {(highlights ?? []).map((item) => (
                            <span
                              key={`${profile.id}-${item.label}`}
                              className="rounded-full bg-surface-panel px-2.5 py-1 text-xs font-medium text-ink-secondary ring-1 ring-line"
                            >
                              {item.label}: {item.value}
                            </span>
                          ))}
                        </div>
                      )}

                      {profile.notes && (
                        <p className="mt-3 text-sm leading-6 text-ink-secondary">{profile.notes}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleLoadIntoStudio(profile)}
                        className="rounded-xl bg-action-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-action-hover"
                      >
                        Load into Studio
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyToSelectedOrder(profile.id)}
                        disabled={!selectedOrderMatchesCustomer}
                        className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                          selectedOrderMatchesCustomer
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'cursor-not-allowed bg-action-secondary text-ink-muted'
                        }`}
                      >
                        {selectedOrderMatchesCustomer && selectedOrder
                          ? `Apply to ${selectedOrder.orderNumber}`
                          : 'Apply to Selected Order'}
                      </button>

                      <button
                        type="button"
                        onClick={() => onCreateOrderFromProfile?.(profile)}
                        disabled={!onCreateOrderFromProfile}
                        className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                          onCreateOrderFromProfile
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'cursor-not-allowed bg-action-secondary text-ink-muted'
                        }`}
                      >
                        Use for New Order
                      </button>

                      <button
                        type="button"
                        onClick={() => startEdit(profile)}
                        className="rounded-xl border border-line bg-surface-panel px-3 py-2 text-xs font-semibold text-ink-secondary transition hover:bg-surface-workspace"
                      >
                        <Edit3 className="mr-1 inline h-3.5 w-3.5" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteCustomerMeasurementProfile(profile.id)}
                        className="rounded-xl bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-200"
                      >
                        <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Ruler;
  label: string;
  value: string;
  tone: 'brand' | 'emerald' | 'amber';
}) {
  const tones = {
    brand: 'bg-action-secondary text-action-primary',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="rounded-sf-lg border border-line bg-surface-panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">{label}</p>
          <p className="mt-1 text-2xl font-bold text-ink-primary">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
