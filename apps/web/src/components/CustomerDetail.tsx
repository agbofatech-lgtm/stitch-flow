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
import type {
  BodyMeasurements,
  CustomerMeasurementProfile,
  GarmentMeasurements,
  MeasurementProfileType,
} from '../types';

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
  const m = profile.measurements || {};

  return {
    label: profile.label || '',
    bust: m.bust?.toString() || '',
    chest: m.chest?.toString() || '',
    waist: m.waist?.toString() || '',
    hip: m.hip?.toString() || '',
    neck: m.neck?.toString() || '',
    shoulder: m.shoulder?.toString() || '',
    sleeve: m.sleeve?.toString() || '',
    backLength: m.backLength?.toString() || '',
    bustSpan: m.bustSpan?.toString() || '',
    armholeDepth: m.armholeDepth?.toString() || '',
    thigh: m.thigh?.toString() || '',
    knee: m.knee?.toString() || '',
    ankle: m.ankle?.toString() || '',
    trouserLength: m.trouserLength?.toString() || '',
    skirtLength: m.skirtLength?.toString() || '',
    fullLength: m.fullLength?.toString() || '',
    inseam: m.inseam?.toString() || '',
    crotchDepth: m.crotchDepth?.toString() || '',
    shoulderToWaist: m.shoulderToWaist?.toString() || '',
    shoulderToHip: m.shoulderToHip?.toString() || '',
    sleeveOpening: m.sleeveOpening?.toString() || '',
    bicep: m.bicep?.toString() || '',
    wrist: m.aroundWrist?.toString() || '',
    notes: profile.notes || '',
  };
}

function parseNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function draftToMeasurements(draft: ProfileDraft): GarmentMeasurements {
  return {
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
    aroundWrist: parseNumber(draft.wrist),
  };
}

function draftToProfileInput(
  workspaceId: string,
  customerId: string,
  draft: ProfileDraft,
  profileType: MeasurementProfileType = 'custom'
): Omit<CustomerMeasurementProfile, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    workspaceId,
    customerId,
    label: draft.label.trim(),
    profileType,
    notes: draft.notes.trim() || undefined,
    measurements: draftToMeasurements(draft),
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
  const m = profile.measurements || {};

  if (typeof m.bust === 'number') highlights.push({ label: 'Bust', value: m.bust });
  if (typeof m.chest === 'number') highlights.push({ label: 'Chest', value: m.chest });
  if (typeof m.waist === 'number') highlights.push({ label: 'Waist', value: m.waist });
  if (typeof m.hip === 'number') highlights.push({ label: 'Hip', value: m.hip });
  if (typeof m.shoulder === 'number') {
    highlights.push({ label: 'Shoulder', value: m.shoulder });
  }
  if (typeof m.sleeve === 'number') {
    highlights.push({ label: 'Sleeve', value: m.sleeve });
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
    currentWorkspace,
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

    if (editingProfileId) {
      updateCustomerMeasurementProfile(editingProfileId, {
        label: draft.label.trim(),
        notes: draft.notes.trim() || undefined,
        measurements: draftToMeasurements(draft),
      });
    } else {
      addCustomerMeasurementProfile(
        draftToProfileInput(currentWorkspace.id, customerId, draft)
      );
    }

    closeForm();
  };

  const handleLoadIntoStudio = (profile: CustomerMeasurementProfile) => {
    const garmentMeasurements = profile.measurements || {};
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
      <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-8 text-center">
        <User className="mx-auto mb-3 h-8 w-8 text-slate-400" />
        <p className="font-semibold text-slate-800">Customer not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 w-full bg-[#0F6E8C]" />

        <div className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-[#0F6E8C]">
                <Ruler className="h-4 w-4" />
                Measurement Profiles
              </div>

              <h2 className="text-2xl font-bold text-slate-900">{customer.fullName}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Save multiple fit profiles for different garment types and reuse them in orders
                and Design Studio.
              </p>
            </div>

            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0F6E8C] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0C5C74]"
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
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {editingProfileId ? 'Edit Measurement Profile' : 'Create Measurement Profile'}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Name profiles by fit or garment use, like “Fitted Gown” or “Senator Set”.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
              aria-label="Close profile form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-300"
              />

              <label className="mt-4 mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-300"
              />

              <div className="mt-4 rounded-2xl bg-white p-3 text-xs leading-6 text-slate-500">
                This profile can be copied into an order snapshot, loaded into Design Studio,
                or reused for future orders.
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-center gap-2">
                <BadgeInfo className="h-4 w-4 text-sky-500" />
                <h4 className="text-sm font-semibold text-slate-900">Measurements</h4>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(MEASUREMENT_FIELDS ?? []).map((field) => (
                  <div
                    key={field.key}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-300"
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
                      ? 'bg-[#0F6E8C] text-white hover:bg-[#0C5C74]'
                      : 'cursor-not-allowed bg-slate-100 text-slate-400'
                  }`}
                >
                  <Save className="h-4 w-4" />
                  {editingProfileId ? 'Update Profile' : 'Save Profile'}
                </button>

                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Saved Profiles</h3>
            <p className="mt-1 text-sm text-slate-500">
              Reuse profiles across order creation, editing, and studio drafting.
            </p>
          </div>
        </div>

        {profiles.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-sky-200 bg-sky-50/60 p-10 text-center">
            <Ruler className="mx-auto mb-3 h-8 w-8 text-sky-500" />
            <p className="font-semibold text-slate-800">No measurement profiles yet</p>
            <p className="mt-2 text-sm text-slate-500">
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
                  className="rounded-[24px] border border-slate-200 bg-slate-50/50 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-[#0F6E8C]">
                          {profile.label}
                        </span>
                        <span className="text-xs text-slate-400">
                          Saved {new Date(profile.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {highlights.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {(highlights ?? []).map((item) => (
                            <span
                              key={`${profile.id}-${item.label}`}
                              className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                            >
                              {item.label}: {item.value}
                            </span>
                          ))}
                        </div>
                      )}

                      {profile.notes && (
                        <p className="mt-3 text-sm leading-6 text-slate-600">{profile.notes}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleLoadIntoStudio(profile)}
                        className="rounded-xl bg-[#0F6E8C] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0C5C74]"
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
                            : 'cursor-not-allowed bg-slate-100 text-slate-400'
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
                            : 'cursor-not-allowed bg-slate-100 text-slate-400'
                        }`}
                      >
                        Use for New Order
                      </button>

                      <button
                        type="button"
                        onClick={() => startEdit(profile)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
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
    brand: 'bg-sky-50 text-[#0F6E8C]',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
