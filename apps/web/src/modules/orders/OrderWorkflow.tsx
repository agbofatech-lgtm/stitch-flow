/**
 * StitchFlow Order Workflow — Phase 18 · Stage 8.
 *
 * CUSTOMER → NEW ORDER → GARMENT → MEASUREMENTS → DESIGN → MATERIALS →
 * REVIEW → CONFIRM, implemented strictly on EXISTING verified contracts:
 *
 *  - addOrder(Omit<Order,'id'|'workspaceId'|'createdAt'>) — offline store
 *    (the same path the existing OrderForm uses; status 'in_progress').
 *    addOrder resolves the customer from the OFFLINE STORE, so an API-listed
 *    customer is first resolved/created there via the existing addCustomer
 *    contract (tier-gated — featureAccess.canCreateCustomer).
 *  - Measurement profiles: getCustomerMeasurementProfiles +
 *    applyMeasurementProfileToOrder(orderId, profileId) — the CANONICAL
 *    snapshot machinery (profile → order snapshot; historical orders never
 *    mutated — VERIFIED). Manual capture uses the same SNAPSHOT_FIELDS the
 *    existing form collects (canonical cm).
 *  - Design: designInspirations (Phase 14 store) → designInspirationId;
 *    analysis auto-attached by addOrder (VERIFIED).
 *  - Advanced customization → AFTER confirmation: selectOrder +
 *    setView('design-studio') — the EXISTING contextual entry (the Studio
 *    binds itself to the selected order; protected file untouched).
 *  - Materials: fabricRecords → selectedFabricId. Exact yardage is derived
 *    later by the deterministic Phase 15→16 chain; no parallel algorithm.
 *
 * Interruption honesty: pre-confirmation state is component state (same as
 * the existing OrderForm pre-save behaviour — VERIFIED architecture); the
 * Design Studio persists its own drafts after creation.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Scissors, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { useApp } from '../../context/AppContext';
import type { ApiCustomer } from '@shared/utils/customerApi';
import type { GarmentType, GarmentMeasurements } from '../../shared/types';
import {
  Button, Section, Body, Label, Numeric, Input, Textarea, Surface, ImageFrame, EmptyState, ErrorState, Badge,
} from '../../design-system';
import { StepIndicator } from '../../design-system/Navigation';
import { garmentImageSrc } from './assets';
import {
  CANONICAL_SNAPSHOT_FIELDS as SNAPSHOT_FIELDS,
  CONSUMPTION_CHAIN_STEPS,
  fabricRequirementStatus,
  fitRiskAdvisory,
  measurementReadiness,
} from '../intelligence/orderIntelligence';
import { IntelligenceCard, MissingDataNotice } from '../intelligence/IntelligenceCard';

/** VERIFIED order-domain taxonomy (shared/types GarmentType — 11 values).
 *  Stage 4 imagery covers 4; the rest render honest initial tiles. */
const GARMENTS: Array<{ value: GarmentType; label: string }> = [
  { value: 'shirt', label: 'Shirt' }, { value: 'trouser', label: 'Trouser' },
  { value: 'kaftan', label: 'Kaftan' }, { value: 'dress', label: 'Dress' },
  { value: 'gown', label: 'Gown' }, { value: 'blouse', label: 'Blouse' },
  { value: 'skirt', label: 'Skirt' }, { value: 'bodice', label: 'Bodice' },
  { value: 'senator', label: 'Senator' }, { value: 'agbada', label: 'Agbada' },
  { value: 'custom', label: 'Custom' },
];

const STEPS = [
  { id: 'garment', label: 'Garment' }, { id: 'measurements', label: 'Measurements' },
  { id: 'design', label: 'Design' }, { id: 'materials', label: 'Materials' }, { id: 'review', label: 'Review' },
];

function buildOrderNumber(): string {
  const now = new Date();
  const d = `${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const t = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  return `SF-${d}-${t}`;
}

export function OrderWorkflow({ customer, onExit, onCompleted }: {
  customer: ApiCustomer; onExit: () => void; onCompleted: (orderId: string) => void;
}) {
  const {
    addOrder, addCustomer, applyMeasurementProfileToOrder, selectOrder, setView, customers,
    getCustomerMeasurementProfiles, designInspirations, fabricRecords, currentWorkspace,
  } = useApp();

  const [step, setStep] = useState(0);
  const [garment, setGarment] = useState<GarmentType | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Partial<Record<keyof GarmentMeasurements, number>>>({});
  const [inspirationId, setInspirationId] = useState<string | null>(null);
  const [fabricId, setFabricId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [subtotal, setSubtotal] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState<{ id: string; orderNumber: string } | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const profiles = useMemo(() => getCustomerMeasurementProfiles(customer.id), [customer.id, getCustomerMeasurementProfiles]);
  const inspirations = useMemo(() => designInspirations.slice(0, 12), [designInspirations]);
  const fabrics = useMemo(() => fabricRecords.filter((f) => f.isActive !== false), [fabricRecords]);

  const snapshotCount = Object.values(snapshot).filter((v) => v !== undefined).length;
  const measurementsReady = !!profileId || snapshotCount > 0;
  const stepReady = [!!garment, measurementsReady, true, true, true];
  const [advisoryDismissed, setAdvisoryDismissed] = useState(false);

  /* ── Stage 9 contextual intelligence (deterministic engines + Phase 17
     advisory, consumed via thin adapters — never recomputed here) ──────── */
  const attachedProfile = profiles.find((p) => p.id === profileId) ?? null;
  const effectiveMeasurements = (attachedProfile?.measurements ?? snapshot) as Partial<Record<keyof GarmentMeasurements, number>>;
  const readiness = useMemo(
    () => (garment ? measurementReadiness(garment, effectiveMeasurements) : null),
    [garment, effectiveMeasurements],
  );
  const inspiration = inspirations.find((d) => d.id === inspirationId) ?? null;
  const advisory = useMemo(
    () => (garment ? fitRiskAdvisory(garment, effectiveMeasurements, inspiration) : { warnings: [] }),
    [garment, effectiveMeasurements, inspiration],
  );
  const selectedFabric = fabrics.find((f) => f.id === fabricId) ?? null;
  const fabricStatus = fabricRequirementStatus(selectedFabric);

  /** Resolve the API customer in the offline store (existing contracts only):
   *  match by id, else by identity. Creation (addCustomer, tier-gated) updates
   *  context state asynchronously, so confirmation completes via the effect
   *  below once the new store customer appears (no stale-closure lookup). */
  const storeCustomerId = useMemo(
    () => customers.find((c) => c.id === customer.id)?.id
      ?? customers.find((c) => c.fullName === customer.fullName && (c.phone || '') === (customer.phone || ''))?.id
      ?? null,
    [customers, customer.id, customer.fullName, customer.phone],
  );
  const pendingOrderRef = useRef<{ orderNumber: string; profileId: string | null } | null>(null);
  const [awaitingCustomer, setAwaitingCustomer] = useState(false);

  const persistOrder = (orderNumber: string, resolvedId: string, profile: string | null) => {
    if (!garment) return;
    const createdId = addOrder({
      customerId: resolvedId,
      assignedTo: null,
      orderNumber,
      status: 'in_progress',
      orderType: garment.charAt(0).toUpperCase() + garment.slice(1),
      dueDate: dueDate ? new Date(`${dueDate}T00:00:00`) : null,
      notes,
      designInspirationId: inspirationId,
      selectedFabricId: fabricId,
      selectedPatternId: null,
      fitType: null,
      styleNotes: null,
      garmentType: garment,
      garmentMeasurements: (snapshotCount ? snapshot : null) as GarmentMeasurements | null,
      measurementSnapshot: (snapshotCount ? snapshot : null) as GarmentMeasurements | null,
      productionPlan: null,
      inspirationAnalysis: null,
      productionStages: [],
      subtotal: Number(subtotal) || 0,
      taxTotal: 0,
      discountTotal: 0,
      totalAmount: Number(subtotal) || 0,
      currency: currentWorkspace?.defaultCurrency || 'GHS',
    } as never);
    if (!createdId) { setConfirmError('The order could not be saved on this device. Nothing was lost — please retry.'); return; }
    // Canonical profile→snapshot machinery (historical orders untouched):
    if (profile) applyMeasurementProfileToOrder(createdId, profile);
    setConfirmed({ id: createdId, orderNumber });
  };

  // Completes a confirmation that was waiting for the store customer to appear.
  useEffect(() => {
    if (!awaitingCustomer || !storeCustomerId || !pendingOrderRef.current) return;
    const { orderNumber, profileId: profile } = pendingOrderRef.current;
    pendingOrderRef.current = null;
    setAwaitingCustomer(false);
    persistOrder(orderNumber, storeCustomerId, profile);
  }, [awaitingCustomer, storeCustomerId]); // persistOrder reads latest state via closure at effect time

  const confirm = () => {
    setConfirmError(null);
    if (!garment) return;
    const orderNumber = buildOrderNumber();
    if (storeCustomerId) { persistOrder(orderNumber, storeCustomerId, profileId); return; }
    const res = addCustomer({ fullName: customer.fullName, phone: customer.phone || '', email: customer.email || '', address: '', notes: '' });
    if (!res.success) { setConfirmError(res.error || 'This customer is not on this device and your plan does not allow adding them here.'); return; }
    pendingOrderRef.current = { orderNumber, profileId };
    setAwaitingCustomer(true); // effect completes once the store customer renders
  };

  /* ── Success ──────────────────────────────────────────────────────────── */
  if (confirmed) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 py-10 text-center" data-view="order-confirmed">
        <span className="grid size-14 place-items-center rounded-full bg-ds-success-surface text-ds-success" aria-hidden="true"><Check className="h-7 w-7" /></span>
        <Section>Order confirmed</Section>
        <Body className="max-w-md text-ink-soft">
          {customer.fullName} · <span className="capitalize">{garment}</span> order <Numeric>{confirmed.orderNumber}</Numeric> is saved on this device.
        </Body>
        <Surface data-intelligence="snapshot" className="flex w-full flex-col gap-2 p-5 text-left">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-ink">Order snapshot</Label>
            <Badge tone="neutral">Snapshot</Badge>
          </div>
          <div className="flex flex-col gap-1 text-sm text-ink-soft">
            <span>Garment: <span className="capitalize text-ink">{garment}</span></span>
            <span>Measurements: {profileId
              ? `${profiles.find((p) => p.id === profileId)?.label ?? 'attached profile'} — profile snapshotted`
              : snapshotCount ? `${snapshotCount} ${snapshotCount === 1 ? 'value' : 'values'} captured` : 'not set'}</span>
            <span>Design: {inspirations.find((d) => d.id === inspirationId)?.title ?? 'to be designed in the Studio'}</span>
            <span>Fabric: {fabrics.find((f) => f.id === fabricId)?.name ?? 'not assigned'}</span>
          </div>
          <Body className="text-xs text-ink-mute">
            Frozen at confirm: later customer-profile edits never rewrite this order — deterministic results for it always read this snapshot, not today&rsquo;s profile.
          </Body>
        </Surface>
        <div className="flex flex-wrap justify-center gap-2">
          {/* EXISTING contextual Studio entry: binds to the selected order */}
          <Button variant="primary" data-action="open-studio" onClick={() => { selectOrder(confirmed.id); setView('design-studio'); }}>
            <Sparkles className="h-4 w-4" aria-hidden="true" /> Open Design Studio
          </Button>
          <Button variant="secondary" data-action="view-orders" onClick={() => onCompleted(confirmed.id)}>View orders</Button>
          <Button variant="tertiary" onClick={onExit}>Back to customer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-24 sm:pb-6" data-view="order-workflow" data-step={STEPS[step].id}>
      <div className="flex flex-col gap-3">
        <Button variant="tertiary" className="w-fit px-0" onClick={onExit} data-action="exit-workflow">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to {customer.fullName}
        </Button>
        <div>
          <Label>New order · {customer.fullName}</Label>
          <Section>New order</Section>
        </div>
        <StepIndicator steps={STEPS} current={step} />
      </div>

      {/* STEP 1 — Garment */}
      {step === 0 && (
        <section aria-label="Choose garment" className="flex flex-col gap-3">
          <Body className="text-ink-mute">What are we making?</Body>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {GARMENTS.map((g) => {
              const selected = garment === g.value;
              const src = garmentImageSrc(g.value);
              return (
                <button key={g.value} type="button" data-garment={g.value} aria-pressed={selected}
                  onClick={() => setGarment(g.value)}
                  className={clsx('ds-motion-micro rounded-2xl border p-2 text-left',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-focus',
                    selected ? 'border-ds-focus ring-2 ring-ds-focus' : 'border-line hover:bg-ds-subtle')}>
                  {src ? (
                    <ImageFrame variant="garment" src={src} alt={`Reference style: ${g.label.toLowerCase()}`} className="w-full" />
                  ) : (
                    <div title="No reference image available" className="grid aspect-[3/4] w-full place-items-center rounded-xl border border-dashed border-line bg-ds-subtle">
                      <span className="font-display text-2xl font-semibold text-ink-mute" aria-hidden="true">{g.label[0]}</span>
                    </div>
                  )}
                  <span className="mt-2 flex items-center justify-between px-1 pb-1">
                    <span className="text-sm font-medium text-ink">{g.label}</span>
                    {selected && <Check className="h-4 w-4 text-gold-dark" aria-hidden="true" />}
                  </span>
                </button>
              );
            })}
          </div>
          <Body className="text-xs text-ink-mute">Reference photos are style examples — not design specifications.</Body>
        </section>
      )}

      {/* STEP 2 — Measurements */}
      {step === 1 && (
        <section aria-label="Measurements" className="flex flex-col gap-4">
          <Body className="text-ink-mute">Attach a saved measurement profile, or capture the key values now.</Body>
          {readiness && (
            <IntelligenceCard
              kind="deterministic"
              title="Measurement readiness"
              ready={readiness.complete}
              basedOn={[
                attachedProfile ? `Profile: ${attachedProfile.label || 'attached'}` : 'Values captured in this order',
                `Garment: ${GARMENTS.find((g) => g.value === garment)?.label} → ${readiness.kindLabel} pattern foundation`,
              ]}
              disclosure={{
                summary: 'How this is calculated',
                body: (
                  <>The pattern adapter (Phase 14) checks every required and recommended measurement for the {readiness.kindLabel.toLowerCase()} foundation against what is captured. Missing required values mean the engine could only proceed with its documented defaults — your decision, not a silent guess.</>
                ),
              }}
            >
              <Body className="text-sm text-ink">
                {readiness.requiredCaptured} of {readiness.requiredTotal} required measurements for a {readiness.kindLabel.toLowerCase()} pattern are captured
                {readiness.recommendedTotal > 0 ? `, plus ${readiness.recommendedCaptured} of ${readiness.recommendedTotal} recommended` : ''}.
              </Body>
              {!readiness.mapped && readiness.mappingNote && (
                <Body className="text-sm text-ink-soft">Pattern mapping: {readiness.mappingNote}</Body>
              )}
              {readiness.requiredMissing.length > 0 && (
                <MissingDataNotice>Additional measurements required for this garment: {readiness.requiredMissing.map((m) => m.label).join(', ')}.</MissingDataNotice>
              )}
            </IntelligenceCard>
          )}
          {profiles.length > 0 ? (
            <Surface className="divide-y divide-line">
              {profiles.map((p) => (
                <button key={p.id} type="button" data-profile={p.id} aria-pressed={profileId === p.id}
                  onClick={() => setProfileId(profileId === p.id ? null : p.id)}
                  className={clsx('ds-motion-micro flex min-h-[var(--ds-touch-min)] w-full items-center justify-between gap-3 px-4 py-3 text-left',
                    profileId === p.id ? 'bg-ds-subtle' : 'hover:bg-ds-subtle')}>
                  <span>
                    <span className="block text-sm font-medium text-ink">{p.label || 'Measurement profile'}</span>
                    <span className="block text-xs capitalize text-ink-mute">{p.profileType} profile{p.updatedAt ? ` · updated ${new Date(p.updatedAt).toLocaleDateString()}` : ''}</span>
                  </span>
                  {profileId === p.id && <Check className="h-4 w-4 text-gold-dark" aria-hidden="true" />}
                </button>
              ))}
            </Surface>
          ) : (
            <EmptyState title="No saved profiles" message={`${customer.fullName} has no measurement profiles yet — capture the key values below (a full profile can be added in the customer workspace).`} />
          )}
          <div>
            <Label className="mb-2">Capture now {profileId ? '(optional — profile attached)' : ''}</Label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SNAPSHOT_FIELDS.map((f) => (
                <label key={f.key} className="flex flex-col gap-1">
                  <span className="ds-label">{f.label} <span className="normal-case tracking-normal text-ink-mute">[cm]</span></span>
                  <Input numeric aria-label={`${f.label} in centimetres`} placeholder="—"
                    value={snapshot[f.key] ?? ''}
                    onChange={(e) => setSnapshot((s) => {
                      const next = { ...s };
                      if (e.target.value === '') delete next[f.key]; else next[f.key] = Number(e.target.value);
                      return next;
                    })} />
                </label>
              ))}
            </div>
          </div>
          <Body className="text-xs text-ink-mute">Attached profiles are snapshotted onto the order — later profile edits never change past orders.</Body>
        </section>
      )}

      {/* STEP 3 — Design */}
      {step === 2 && (
        <section aria-label="Design" className="flex flex-col gap-3">
          <Body className="text-ink-mute">Start from a saved inspiration, or design after confirmation in the Design Studio.</Body>
          {inspirations.length === 0 ? (
            <EmptyState title="No saved inspirations" message="Continue without a design reference — you can open the Design Studio right after confirming to design from scratch."
              primaryAction={<Button variant="secondary" onClick={() => setStep(3)}>Continue without design</Button>} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {inspirations.map((d) => (
                <button key={d.id} type="button" data-inspiration={d.id} aria-pressed={inspirationId === d.id}
                  onClick={() => setInspirationId(inspirationId === d.id ? null : d.id)}
                  className={clsx('ds-motion-micro rounded-2xl border p-2 text-left',
                    inspirationId === d.id ? 'border-ds-focus ring-2 ring-ds-focus' : 'border-line hover:bg-ds-subtle')}>
                  <ImageFrame variant="editorial" src={d.imageUrl || undefined} alt={d.title} className="w-full" />
                  <span className="mt-2 block px-1 pb-1 text-sm font-medium text-ink">{d.title}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* STEP 4 — Materials */}
      {step === 3 && (
        <section aria-label="Materials" className="flex flex-col gap-3">
          <Body className="text-ink-mute">Which fabric is this order made from? Exact requirements are calculated during pattern &amp; cutting preparation.</Body>
          {fabrics.length === 0 ? (
            <EmptyState title="No fabrics in your library" message="You can continue and assign fabric later from materials."
              primaryAction={<Button variant="secondary" onClick={() => setStep(4)}>Continue without fabric</Button>} />
          ) : (
            <Surface className="divide-y divide-line">
              {fabrics.map((f) => (
                <button key={f.id} type="button" data-fabric={f.id} aria-pressed={fabricId === f.id}
                  onClick={() => setFabricId(fabricId === f.id ? null : f.id)}
                  className={clsx('ds-motion-micro flex min-h-[var(--ds-touch-min)] w-full items-center justify-between gap-3 px-4 py-3 text-left',
                    fabricId === f.id ? 'bg-ds-subtle' : 'hover:bg-ds-subtle')}>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{f.name}</span>
                    <span className="block text-xs text-ink-mute">{f.fabricType} · {f.color}{typeof f.quantityInStock === 'number' ? ` · ${f.quantityInStock} ${f.unit} in stock` : ''}</span>
                  </span>
                  {fabricId === f.id && <Check className="h-4 w-4 shrink-0 text-gold-dark" aria-hidden="true" />}
                </button>
              ))}
            </Surface>
          )}
          <Body className="text-xs text-ink-mute">Stock shown is your library record — required yardage is a separate calculation, confirmed at cutting preparation.</Body>
          <IntelligenceCard
            kind="missing"
            title="Material requirement"
            basedOn={[
              selectedFabric ? `Fabric: ${selectedFabric.name}` : 'No fabric selected',
              'Deterministic calculation: pattern & cutting preparation (Phase 15→16)',
            ]}
            disclosure={{
              summary: 'What the calculation includes',
              body: (
                <ul className="list-disc pl-4">
                  {CONSUMPTION_CHAIN_STEPS.map((step) => (<li key={step}>{step}</li>))}
                </ul>
              ),
            }}
          >
            {fabricStatus.state === 'width_unknown' ? (
              <MissingDataNotice>Material requirement cannot be finalized until fabric width is known — width is not on this fabric&rsquo;s library record yet. It is settled when the cutting layout is prepared.</MissingDataNotice>
            ) : (
              <MissingDataNotice>No fabric is selected, so nothing is being calculated. You can assign fabric after confirmation.</MissingDataNotice>
            )}
          </IntelligenceCard>
        </section>
      )}

      {/* STEP 5 — Review & confirm */}
      {step === 4 && (
        <section aria-label="Review order" className="flex flex-col gap-4">
          {confirmError && <ErrorState title="Order not confirmed" message={confirmError} />}
          <Surface className="flex flex-col gap-3 p-5">
            <div><Label>Customer</Label><Body className="text-ink">{customer.fullName}{customer.phone ? ` · ${customer.phone}` : ''}</Body></div>

            <div><Label>Garment</Label><Body className="text-ink">{garment ? GARMENTS.find((g) => g.value === garment)?.label : '—'}</Body></div>
            <div>
              <Label>Measurements</Label>
              <Body className="text-ink">{profileId ? `Profile: ${profiles.find((p) => p.id === profileId)?.label ?? 'attached'} (snapshotted on confirm)` : snapshotCount ? `${snapshotCount} ${snapshotCount === 1 ? 'value' : 'values'} captured` : 'Not set'}</Body>
            </div>
            <div><Label>Design</Label><Body className="text-ink">{inspirations.find((d) => d.id === inspirationId)?.title ?? 'To be designed in Studio'}</Body></div>
            <div><Label>Fabric</Label><Body className="text-ink">{fabrics.find((f) => f.id === fabricId)?.name ?? 'Not assigned'}</Body></div>
          </Surface>
          <IntelligenceCard
            kind="advisory"
            title="Fit-risk advisory"
            basedOn={[
              `Garment: ${GARMENTS.find((g) => g.value === garment)?.label ?? '—'}`,
              attachedProfile ? `Profile: ${attachedProfile.label || 'attached'}` : (snapshotCount ? `${snapshotCount} values captured` : 'No measurements yet'),
              inspiration ? `Inspiration: ${inspiration.title}` : 'No design reference yet',
            ]}
            disclosure={{
              summary: 'Where this comes from',
              body: (<>On-device rule-based assistant (Phase 17). Advisory only — it never changes measurements, fabric, or material requirements, and every captured value above stays exactly as you entered it.</>),
            }}
            className="border border-ds-advisory/30"
          >
            {advisoryDismissed ? (
              <Body className="text-sm text-ink-mute">Advisory dismissed for this order.</Body>
            ) : advisory.warnings.length === 0 ? (
              <Body className="text-sm text-ink-soft">No fit risks flagged for this combination.</Body>
            ) : (
              <ul className="flex flex-col gap-2" data-advisory-list>
                {advisory.warnings.map((w, i) => (
                  <li key={i} className="rounded-xl border border-line bg-ds-subtle p-3">
                    <span className="ds-label">{w.severity === 'high' ? 'High' : w.severity === 'medium' ? 'Medium' : 'Low'} risk</span>
                    <span className="block text-sm font-medium text-ink">{w.title}</span>
                    <span className="block text-sm text-ink-soft">{w.description}</span>
                    {w.recommendation && <span className="mt-1 block text-sm text-ink">Recommendation: {w.recommendation}</span>}
                  </li>
                ))}
              </ul>
            )}
            {!advisoryDismissed && (
              <Button variant="tertiary" className="w-fit px-0" data-action="dismiss-advisory" onClick={() => setAdvisoryDismissed(true)}>Dismiss advisory</Button>
            )}
          </IntelligenceCard>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1"><span className="ds-label">Due date</span>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
            <label className="flex flex-col gap-1"><span className="ds-label">Price [{currentWorkspace?.defaultCurrency || 'GHS'}]</span>
              <Input numeric value={subtotal} onChange={(e) => setSubtotal(e.target.value)} placeholder="0.00" /></label>
          </div>
          <label className="flex flex-col gap-1"><span className="ds-label">Notes</span>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Construction or style notes…" /></label>
        </section>
      )}

      {/* Sticky mobile action bar (thumb zone) / inline desktop */}
      <div className="sticky bottom-0 -mx-4 z-[var(--sf-z-sticky)] flex items-center justify-between gap-2 border-t border-line bg-ds-surface/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:mx-0 sm:border-0 sm:p-0"
        role="group" aria-label="Workflow actions">
        <Button variant="tertiary" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))} data-action="prev-step">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </Button>
        {step < 4 ? (
          <Button variant="primary" disabled={!stepReady[step]} data-action="next-step" onClick={() => setStep((s) => Math.min(4, s + 1))}>
            Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button variant="primary" data-action="confirm-order" disabled={!garment || !measurementsReady} onClick={confirm}>
            <Scissors className="h-4 w-4" aria-hidden="true" /> Confirm order
          </Button>
        )}
      </div>
    </div>
  );
}
