/**
 * StitchFlow Production Workflow — Phase 18 · Stage 10.
 *
 * Evidence-first surface over VERIFIED contracts only:
 *  - Canonical 9-stage lifecycle + start/complete/skip/reopen semantics:
 *    apps/backend/src/services/productionStageService.ts (audit events
 *    recorded server-side; workspace-scoped; auto-advance on complete/skip;
 *    reopen cascades to all later stages). The web client mirrors it in
 *    shared/api/productionStages.ts — consumed here, never reimplemented.
 *  - NO delivery-payment gate exists in the backend (VERIFIED absence) —
 *    delivery is a pure production action here; business policy UNRESOLVED,
 *    not invented (§23).
 *  - Production ≠ Finance: payment state is displayed as CONTEXT from the
 *    invoice contract only; no financial workflow lives here.
 *  - Stage 9 intelligence consumed read-only (fit-risk advisory, snapshot
 *    drift) — advisory can never transition a stage (§28).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, ArrowRight, Check, RotateCcw, SkipForward, Play } from 'lucide-react';
import { clsx } from 'clsx';
import { fetchOrders, type ApiOrder } from '@shared/api/orders';
import {
  fetchOrderProductionStages, transitionOrderProductionStage, addOrderProductionStageNote,
  type ApiProductionStage,
} from '@shared/api/productionStages';
import { fetchInvoices, type ApiInvoice } from '@shared/api/invoices';
import { getCustomers, type ApiCustomer } from '@shared/utils/customerApi';
import { formatCurrency } from '@shared/utils/currency';
import { useApp } from '../../context/AppContext';
import type { GarmentType, GarmentMeasurements } from '../../shared/types';
import {
  Button, Badge, Body, Label, Numeric, Section, Surface, Skeleton, EmptyState, ErrorState, Input, Textarea,
} from '../../design-system';
import { Timeline, ActionBar } from '../../design-system/Workflow';
import { IntelligenceCard, MissingDataNotice } from '../intelligence/IntelligenceCard';
import { fitRiskAdvisory, snapshotDrift, CANONICAL_SNAPSHOT_FIELDS } from '../intelligence/orderIntelligence';
import { emptyStateSrc } from '../workspace/assets';

/** VERIFIED canonical sequence — identical codes to the backend service and
 *  design-system Status.tsx CANONICAL_STAGES. Labels are presentation-only. */
const CANONICAL: Array<{ code: string; label: string }> = [
  { code: 'measurement', label: 'Measurement' },
  { code: 'cutting', label: 'Cutting' },
  { code: 'sewing', label: 'Sewing' },
  { code: 'embroidery', label: 'Embroidery' },
  { code: 'first_fitting', label: 'First Fitting' },
  { code: 'second_fitting', label: 'Second Fitting' },
  { code: 'final_press', label: 'Final Press' },
  { code: 'ready', label: 'Ready' },
  { code: 'delivered', label: 'Delivered' },
];

/** Visual grouping (§5: presentation only — canonical codes are never merged;
 *  the Fitting group keeps first_fitting and second_fitting distinct). */
const BOARD_GROUPS: Array<{ id: string; label: string; codes: string[] }> = [
  { id: 'measurement', label: 'Measurement', codes: ['measurement'] },
  { id: 'cutting', label: 'Cutting', codes: ['cutting'] },
  { id: 'sewing', label: 'Sewing', codes: ['sewing'] },
  { id: 'embroidery', label: 'Embroidery', codes: ['embroidery'] },
  { id: 'fitting', label: 'Fitting', codes: ['first_fitting', 'second_fitting'] },
  { id: 'final_press', label: 'Final Press', codes: ['final_press'] },
  { id: 'ready', label: 'Ready', codes: ['ready'] },
  { id: 'delivered', label: 'Delivered', codes: ['delivered'] },
];

const STAGE_STATUS_META: Record<string, { label: string; shape: string }> = {
  pending: { label: 'Pending', shape: '○' },
  active: { label: 'Active', shape: '◐' },
  completed: { label: 'Completed', shape: '●' },
  skipped: { label: 'Skipped', shape: '⊘' },
};

type StageMap = Record<string, ApiProductionStage>;

function normalizeStages(raw: unknown): ApiProductionStage[] {
  if (!Array.isArray(raw)) return [];
  return (raw as ApiProductionStage[])
    .slice()
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
}

/** Mirrors the backend's open-stage rule: first stage (by sequence) that is
 *  pending or active; else delivered if completed; else null. */
function currentOpenStage(stages: ApiProductionStage[]): ApiProductionStage | null {
  const open = stages.find((s) => s.status === 'pending' || s.status === 'active');
  if (open) return open;
  const delivered = stages.find((s) => s.code === 'delivered' && s.status === 'completed');
  return delivered ?? null;
}

export function ProductionView() {
  const { setView, getCustomerMeasurementProfiles } = useApp();
  const [orders, setOrders] = useState<ApiOrder[] | null>(null);
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');

  const load = useCallback(() => {
    setLoadError(false);
    Promise.all([fetchOrders(), getCustomers().catch(() => [] as ApiCustomer[]), fetchInvoices()])
      .then(async ([o, c, i]) => {
        setCustomers(c); setInvoices(i);
        // Lazy stage initialisation is the VERIFIED backend contract: orders
        // can carry no stages until first touched, and GET production-stages
        // seeds the canonical nine from the order status. Hydrate those once
        // per load (bounded: one request per stage-less order, no loops).
        const needsStages = o.filter((ord) => !Array.isArray(ord.productionStages) || ord.productionStages.length === 0);
        const seeded = await Promise.all(needsStages.map((ord) => fetchOrderProductionStages(ord.id).catch(() => null)));
        const seedByOrder = new Map(needsStages.map((ord, idx) => [ord.id, seeded[idx]]));
        setOrders(o.map((ord) => {
          const seed = seedByOrder.get(ord.id);
          return seed && seed.length > 0 ? { ...ord, productionStages: seed } : ord;
        }));
      })
      .catch(() => setLoadError(true));
  }, []);
  useEffect(load, [load]);

  const stageMaps = useMemo(() => {
    const maps: Record<string, StageMap> = {};
    for (const order of orders ?? []) {
      const stages = normalizeStages(order.productionStages);
      maps[order.id] = Object.fromEntries(stages.map((s) => [s.code, s]));
    }
    return maps;
  }, [orders]);

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const invoiceByOrderId = useMemo(() => {
    const map = new Map<string, ApiInvoice>();
    for (const inv of invoices) if (inv.orderId) map.set(inv.orderId, inv);
    return map;
  }, [invoices]);

  const productionOrders = useMemo(
    () => (orders ?? []).filter((o) => !['draft', 'cancelled'].includes(o.status)),
    [orders],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return productionOrders.filter((o) => {
      const open = currentOpenStage(normalizeStages(o.productionStages));
      const group = BOARD_GROUPS.find((g) => open && g.codes.includes(open.code));
      if (stageFilter !== 'all' && group?.id !== stageFilter) return false;
      if (!q) return true;
      const customer = customerById.get(o.customerId);
      return o.orderNumber.toLowerCase().includes(q) || (customer?.fullName ?? '').toLowerCase().includes(q);
    });
  }, [productionOrders, search, stageFilter, customerById]);

  const selected = useMemo(() => (orders ?? []).find((o) => o.id === selectedId) ?? null, [orders, selectedId]);

  /* ── Detail workspace (context composition, not duplicated systems) ───── */
  const detail = useMemo(() => {
    if (!selected) return null;
    const stages = normalizeStages(selected.productionStages);
    const open = currentOpenStage(stages);
    const openIndex = open ? CANONICAL.findIndex((c) => c.code === open.code) : -1;
    const next = openIndex >= 0 && openIndex < CANONICAL.length - 1 ? CANONICAL[openIndex + 1] : null;
    return { stages, open, next };
  }, [selected]);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [reopenCode, setReopenCode] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => { setActionError(null); setNoteDraft(detail?.open?.notes ?? ''); setNoteSaved(false); setConfirmSkip(false); setReopenCode(null); }, [selectedId, detail?.open?.code]);

  const runTransition = async (stageCode: string, action: 'start' | 'complete' | 'skip' | 'reopen', note?: string) => {
    if (!selected) return;
    setBusy(true); setActionError(null);
    try {
      const result = note !== undefined
        ? await transitionOrderProductionStage(selected.id, stageCode, action, note)
        : await transitionOrderProductionStage(selected.id, stageCode, action);
      // Authoritative response consumed directly — no optimistic local maths.
      setOrders((prev) => (prev ?? []).map((o) => (o.id === selected.id ? { ...o, status: result.orderStatus, productionStages: result.productionStages } : o)));
      setConfirmSkip(false); setReopenCode(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'The stage could not be updated. Nothing was changed — please retry.');
    } finally { setBusy(false); }
  };

  const saveNote = async () => {
    if (!selected || !detail?.open) return;
    setBusy(true); setActionError(null);
    try {
      const result = await addOrderProductionStageNote(selected.id, detail.open.code, noteDraft);
      setOrders((prev) => (prev ?? []).map((o) => (o.id === selected.id ? { ...o, productionStages: result.productionStages } : o)));
      setNoteSaved(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'The note could not be saved. Please retry.');
    } finally { setBusy(false); }
  };

  /* Stage 9 intelligence — read-only, subordinate (§28–§30). */
  const intelligence = useMemo(() => {
    if (!selected) return null;
    const snapshot = (selected.measurementSnapshot ?? null) as Partial<Record<keyof GarmentMeasurements, number>> & { profileLabel?: string | null } | null;
    const numeric: Partial<Record<keyof GarmentMeasurements, number>> = {};
    let captured = 0;
    for (const { key } of CANONICAL_SNAPSHOT_FIELDS) {
      const v = (snapshot as Record<string, unknown>)?.[key];
      if (typeof v === 'number' && !Number.isNaN(v)) { numeric[key] = v; captured += 1; }
    }
    const profiles = getCustomerMeasurementProfiles(selected.customerId);
    const latest = profiles[0] ?? null;
    const drift = snapshotDrift(numeric, latest);
    const advisory = selected.garmentType
      ? fitRiskAdvisory(selected.garmentType as GarmentType, numeric, null)
      : { warnings: [] };
    return { profileLabel: snapshot?.profileLabel ?? null, captured, numeric, latest, drift, advisory };
  }, [selected, getCustomerMeasurementProfiles]);

  const invoice = selected ? invoiceByOrderId.get(selected.id) ?? null : null;

  /* ── Render ───────────────────────────────────────────────────────────── */
  if (loadError) {
    return (
      <div data-view="production" className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <Section>Production</Section>
        <ErrorState title="Production could not be loaded" message="Orders and stages could not be fetched right now. Nothing was changed. Retry when connected." onRetry={load} errorId="production/load" />
      </div>
    );
  }
  if (orders === null) {
    return (
      <div data-view="production" className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <Section>Production</Section>
        <Skeleton label="Production board" />
      </div>
    );
  }

  return (
    <div data-view="production" className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Label>Operational execution</Label>
          <Section>Production</Section>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input aria-label="Search production by customer or order number" placeholder="Search customer or order…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
          <select aria-label="Filter by stage" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}
            className="ds-input h-[var(--ds-touch-min)] rounded-xl border border-line bg-ds-surface px-3 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-focus">
            <option value="all">All stages</option>
            {BOARD_GROUPS.map((g) => (<option key={g.id} value={g.id}>{g.label}</option>))}
          </select>
        </div>
      </div>

      {selected && detail ? (
        /* ── Detail workspace ─────────────────────────────────────────── */
        <div data-pane="production-detail" className="flex flex-col gap-4">
          <Button variant="tertiary" className="w-fit px-0" onClick={() => setSelectedId(null)}>
            ← All production
          </Button>
          <Surface className="flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Section>{selected.orderNumber}</Section>
                <Body className="text-ink-soft">
                  {customerById.get(selected.customerId)?.fullName ?? 'Customer not on this device'}
                  {selected.garmentType ? ` · ${selected.garmentType}` : ''}
                  {selected.dueDate ? ` · due ${format(new Date(selected.dueDate), 'd MMM yyyy')}` : ''}
                </Body>
              </div>
              <Badge tone="info">Order: {selected.status.replace('_', ' ')}</Badge>
            </div>
            {actionError && <ErrorState title="Stage not updated" message={actionError} errorId="production/transition" />}
            <ActionBar label="Stage actions">
              {detail.open ? (
                <>
                  {detail.open.status === 'pending' && (
                    <Button variant="primary" data-action="start-stage" disabled={busy} onClick={() => runTransition(detail.open!.code, 'start')}>
                      <Play className="h-4 w-4" aria-hidden="true" /> Start {CANONICAL.find((c) => c.code === detail.open!.code)?.label}
                    </Button>
                  )}
                  {detail.open.status === 'active' && (
                    <Button variant="primary" data-action="complete-stage" disabled={busy} onClick={() => runTransition(detail.open!.code, 'complete')}>
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Complete {CANONICAL.find((c) => c.code === detail.open!.code)?.label}
                      {detail.next ? ` — ${detail.next.label} becomes active` : ''}
                    </Button>
                  )}
                  <Button variant="secondary" data-action="skip-stage" disabled={busy} onClick={() => setConfirmSkip(true)}>
                    <SkipForward className="h-4 w-4" aria-hidden="true" /> Skip {CANONICAL.find((c) => c.code === detail.open!.code)?.label}
                  </Button>
                </>
              ) : (
                <Body className="text-sm text-ink-mute">No open stage — every stage is completed or skipped.</Body>
              )}
            </ActionBar>
            {confirmSkip && detail.open && (
              <Surface data-dialog="confirm-skip" role="alertdialog" aria-label="Confirm skip" className="flex flex-col gap-3 border border-ds-warning/40 p-4">
                <Body className="text-ink">Skip {CANONICAL.find((c) => c.code === detail.open!.code)?.label} for {selected.orderNumber}?</Body>
                <Body className="text-sm text-ink-soft">The stage is marked skipped (with a timestamp) and {detail.next ? `${detail.next.label} becomes active` : 'the sequence closes'}. A skipped stage can be reopened later — reopening also reopens every stage after it.</Body>
                <div className="flex gap-2">
                  <Button variant="primary" data-action="confirm-skip" disabled={busy} onClick={() => runTransition(detail.open!.code, 'skip')}>Skip stage</Button>
                  <Button variant="tertiary" onClick={() => setConfirmSkip(false)}>Cancel</Button>
                </div>
              </Surface>
            )}
            {reopenCode && (
              <Surface data-dialog="confirm-reopen" role="alertdialog" aria-label="Confirm reopen" className="flex flex-col gap-3 border border-ds-warning/40 p-4">
                <Body className="text-ink">Reopen {CANONICAL.find((c) => c.code === reopenCode)?.label}?</Body>
                <Body className="text-sm text-ink-soft">This clears {CANONICAL.find((c) => c.code === reopenCode)?.label} and every stage after it back to pending (rework). Their completion timestamps are replaced with reopen timestamps. This is the backend's documented reopen behaviour.</Body>
                <div className="flex gap-2">
                  <Button variant="primary" data-action="confirm-reopen" disabled={busy} onClick={() => runTransition(reopenCode, 'reopen')}>Reopen for rework</Button>
                  <Button variant="tertiary" onClick={() => setReopenCode(null)}>Cancel</Button>
                </div>
              </Surface>
            )}
          </Surface>

          {/* Canonical timeline — all nine stages, individually identified */}
          <Surface className="p-5">
            <Label>Production timeline — canonical sequence</Label>
            <Timeline items={detail.stages.length > 0 ? CANONICAL.map((c) => {
              const stage = detail.stages.find((s) => s.code === c.code);
              const meta = STAGE_STATUS_META[stage?.status ?? 'pending'] ?? STAGE_STATUS_META.pending;
              return {
                title: `${meta.shape} ${c.label} — ${meta.label}`,
                meta: [
                  stage?.completedAt ? `completed ${format(new Date(stage.completedAt), 'd MMM, HH:mm')}` : null,
                  stage?.reopenedAt ? `reopened ${format(new Date(stage.reopenedAt), 'd MMM, HH:mm')}` : null,
                ].filter(Boolean).join(' · ') || undefined,
                body: (
                  <span className="flex flex-wrap items-center gap-2" data-stage-code={c.code}>
                    <span className="text-xs text-ink-mute">canonical code: {c.code}</span>
                    {stage?.notes ? <span className="text-xs text-ink-soft">note: {stage.notes}</span> : null}
                    {(stage?.status === 'completed' || stage?.status === 'skipped') && (
                      <Button variant="tertiary" className="min-h-0 px-2 py-1 text-xs" data-action={`reopen-${c.code}`} disabled={busy} onClick={() => setReopenCode(c.code)}>
                        <RotateCcw className="h-3 w-3" aria-hidden="true" /> Reopen
                      </Button>
                    )}
                  </span>
                ),
                done: stage?.status === 'completed' || stage?.status === 'skipped',
                current: stage?.status === 'active' || stage?.status === 'pending',
              };
            }) : [{ title: 'No stages on record yet', body: <span className="text-xs text-ink-mute">Stages are created by the backend the first time this order is transitioned (lazy initialisation — VERIFIED ensureOrderProductionStages).</span> }]} />
          </Surface>

          {/* Current-stage note (fitting notes land here when fittings are current) */}
          {detail.open && (
            <Surface className="flex flex-col gap-2 p-5">
              <Label>Note — {CANONICAL.find((c) => c.code === detail.open!.code)?.label}</Label>
              <Textarea rows={2} value={noteDraft} onChange={(e) => { setNoteDraft(e.target.value); setNoteSaved(false); }} placeholder="Fitting observations, adjustments to review…" aria-label={`Note for ${CANONICAL.find((c) => c.code === detail.open!.code)?.label}`} />
              <div className="flex items-center gap-2">
                <Button variant="secondary" data-action="save-note" disabled={busy} onClick={saveNote}>Save note</Button>
                {noteSaved && <Body className="text-xs text-ink-soft">Note saved on the order.</Body>}
              </div>
              <Body className="text-xs text-ink-mute">Notes are records for this stage only. They never change measurements, designs, or the order snapshot — a discovered change follows the explicit review path in the customer workspace.</Body>
            </Surface>
          )}

          {/* Stage 9 intelligence — read-only context (§28–§30) */}
          {intelligence && (
            <div className="grid gap-4 lg:grid-cols-2">
              <IntelligenceCard kind="deterministic" title="Measurement context (order snapshot)"
                basedOn={[intelligence.profileLabel ? `Profile at confirm: ${intelligence.profileLabel}` : 'Captured values at confirm', intelligence.latest ? `Current profile: ${intelligence.latest.label || 'latest'}` : 'No profile for this customer on this device']}>
                <Body className="text-sm text-ink">{intelligence.captured} canonical value{intelligence.captured === 1 ? '' : 's'} frozen on this order.</Body>
                {intelligence.drift.drift ? (
                  <Body className="text-sm text-ink-soft" data-drift="true">
                    Customer measurements have changed since this order was confirmed ({intelligence.drift.changedFields.map((f) => f.label).join(', ')}). The order keeps its snapshot — production reads the snapshot, not today's profile.
                  </Body>
                ) : (
                  <Body className="text-sm text-ink-soft">No drift detected against the current profile{intelligence.latest ? '' : ' (none on this device to compare)'}.</Body>
                )}
              </IntelligenceCard>
              <IntelligenceCard kind="advisory" title="Fit-risk advisory" className="border border-ds-advisory/30"
                disclosure={{ summary: 'Where this comes from', body: <>On-device rule-based assistant (Phase 17), reading the order snapshot. Advisory only — it cannot advance, skip, or reopen any stage.</> }}>
                {intelligence.advisory.warnings.length === 0
                  ? <Body className="text-sm text-ink-soft">No fit risks flagged from the order snapshot.</Body>
                  : (
                    <ul className="flex flex-col gap-2" data-advisory-list>
                      {intelligence.advisory.warnings.map((w, i) => (
                        <li key={i} className="rounded-xl border border-line bg-ds-subtle p-3">
                          <span className="ds-label capitalize">{w.severity} risk</span>
                          <span className="block text-sm font-medium text-ink">{w.title}</span>
                          <span className="block text-sm text-ink-soft">{w.description}</span>
                        </li>
                      ))}
                    </ul>
                  )}
              </IntelligenceCard>
            </div>
          )}

          {/* Financial CONTEXT only — the payment workflow lives in Finance (§24) */}
          {invoice ? (
            <IntelligenceCard kind="deterministic" title="Financial context"
              basedOn={[`Invoice ${invoice.invoiceNumber}`, `Status: ${invoice.status}`]}>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span className="text-ink-soft">Total <Numeric>{formatCurrency(invoice.totalAmount, invoice.currency as never)}</Numeric></span>
                <span className="text-ink-soft">Paid <Numeric>{formatCurrency(invoice.amountPaid, invoice.currency as never)}</Numeric></span>
                <span className="text-ink-soft">Balance <Numeric>{formatCurrency(invoice.balanceDue, invoice.currency as never)}</Numeric></span>
              </div>
              <Body className="text-xs text-ink-mute">Payment state is independent of production state — it never blocks or advances a stage here.</Body>
              <Button variant="tertiary" className="w-fit px-0" onClick={() => setView('invoices')}>Open Finance <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Button>
            </IntelligenceCard>
          ) : (
            <MissingDataNotice>No invoice for this order yet — financial tracking starts when an invoice is created in Finance.</MissingDataNotice>
          )}
        </div>
      ) : (
        /* ── Board ────────────────────────────────────────────────────── */
        productionOrders.length === 0 ? (
          <EmptyState illustration={emptyStateSrc('no-orders')} title="No active production"
            message="Confirmed orders appear here as they move through measurement, cutting, sewing and fittings." />
        ) : filtered.length === 0 ? (
          <EmptyState illustration={emptyStateSrc('no-results')} title="No matching production"
            message={`No orders match this ${stageFilter === 'all' ? 'search' : 'filter'}. Clear it to see all active work.`}
            primaryAction={<Button variant="secondary" onClick={() => { setSearch(''); setStageFilter('all'); }}>Clear search and filter</Button>} />
        ) : (
          <div className="flex flex-col gap-5" data-board="production">
            {BOARD_GROUPS.map((group) => {
              const items = filtered.filter((o) => {
                const open = currentOpenStage(normalizeStages(o.productionStages));
                return open && group.codes.includes(open.code);
              });
              return (
                <section key={group.id} aria-label={group.label} className="flex flex-col gap-2" data-group={group.id}>
                  <div className="flex items-center gap-2">
                    <Label>{group.label}</Label>
                    {items.length > 0 && <Badge>{items.length}</Badge>}
                    {group.codes.length > 1 && <span className="text-xs text-ink-mute">({group.codes.map((c) => CANONICAL.find((x) => x.code === c)?.label).join(' + ')} stay separate)</span>}
                  </div>
                  {items.length === 0 ? (
                    <Body className="text-sm text-ink-mute">Nothing in {group.label.toLowerCase()}.</Body>
                  ) : (
                    <Surface className="divide-y divide-line">
                      {items.map((o) => {
                        const open = currentOpenStage(normalizeStages(o.productionStages))!;
                        const inv = invoiceByOrderId.get(o.id);
                        return (
                          <button key={o.id} type="button" data-order-card={o.id} data-stage-code={open.code}
                            onClick={() => setSelectedId(o.id)}
                            className="ds-motion-micro flex min-h-[var(--ds-touch-min)] w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left hover:bg-ds-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ds-focus">
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-ink">{o.orderNumber} · {customerById.get(o.customerId)?.fullName ?? 'Customer not on this device'}</span>
                              <span className="block text-xs text-ink-mute">
                                {o.garmentType ?? 'unspecified garment'}
                                {o.dueDate ? ` · due ${format(new Date(o.dueDate), 'd MMM')}` : ''}
                                {open.status === 'active' ? ' · in progress' : ''}
                              </span>
                            </span>
                            <span className="flex items-center gap-2">
                              {inv ? (
                                <span data-payment={inv.status}>
                                  <Badge tone={inv.status === 'paid' ? 'success' : inv.status === 'partial' ? 'warning' : 'neutral'}>
                                    {inv.status === 'paid' ? '✓ Paid' : inv.status === 'partial' ? '◐ Partial payment' : inv.status === 'overdue' ? '! Overdue' : '○ Payment outstanding'}
                                  </Badge>
                                </span>
                              ) : (
                                <span className="text-xs text-ink-mute">no invoice</span>
                              )}
                              <span data-stage-badge={open.code}>
                                <Badge tone="info">{CANONICAL.find((c) => c.code === open.code)?.label}</Badge>
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </Surface>
                  )}
                </section>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
