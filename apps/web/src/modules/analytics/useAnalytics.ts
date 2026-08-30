/**
 * PHASE 18.5 — ANALYTICS RECORD BRIDGE (Stage 5)
 * ---------------------------------------------------------------------------
 * Bridges the workspace truth planes into ONE record set for the projection
 * layer (fixes forensic defect F-2):
 *
 *   SERVER ──sync──► DEXIE MIRROR (workspace-scoped, tombstone-aware)
 *                        │  wins by id (server-authoritative rows)
 *   AppContext (this device's writes) ──┤  appended only when absent
 *                        ▼
 *              useAnalytics() records ──► projection.ts ──► Dashboard + Reports
 *
 * Materials remain DEVICE-LOCAL (Stage 14 S8; mandate §23): fabricRecords come
 * from AppContext only and are labelled as such — never presented as synced.
 *
 * Offline truth model (mandate §16): the hook reports lastSuccessfulSync from
 * the sync ledger so surfaces can say honestly "Last synced …" or
 * "Updated from this device" — and NEVER "live"/"real-time".
 *
 * Workspace isolation (mandate §17): mirror rows are filtered by workspaceId.
 * If the mirror is unavailable (older environments), the hook degrades to
 * device-local context records and says so via provenance.
 */
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { LocalRow } from '../../db/database';
import type { MinimalProductionStage } from '@shared/utils/reporting';
import {
  type AnalyticsCustomer,
  type AnalyticsFabric,
  type AnalyticsInvoice,
  type AnalyticsOrder,
  type AnalyticsPayment,
  type AnalyticsMaterialUsage,
  type AnalyticsProvenance,
} from './projection';

export type AnalyticsRecords = {
  customers: AnalyticsCustomer[];
  orders: AnalyticsOrder[];
  invoices: AnalyticsInvoice[];
  payments: AnalyticsPayment[];
  materialUsages: AnalyticsMaterialUsage[];
  /** DEVICE-LOCAL only — see MODULES provenance below. */
  fabricRecords: AnalyticsFabric[];
};

export type AnalyticsState = {
  records: AnalyticsRecords;
  /** provenance of the domain collections (never materials, see materialsProvenance) */
  provenance: AnalyticsProvenance;
  materialsProvenance: 'DEVICE_LOCAL';
  /** ISO timestamp of the last successful sync of the mirror, when known */
  lastSyncedAt: string | null;
  /** mirror pass complete (records stable for this mount) */
  settled: boolean;
}

const num = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/* ── Mirror-row normalizers (sync payloads are camelCase; fields may be
      partial because deltas merge progressively — see syncEngine) ────────── */

type MirrorRow = LocalRow;

function mirrorCustomer(row: MirrorRow): AnalyticsCustomer {
  return {
    id: row.id,
    fullName: (row.fullName as string) ?? null,
    phone: (row.phone as string) ?? null,
    email: (row.email as string) ?? null,
    createdAt: (row.createdAt as string) ?? null,
  };
}

function mirrorOrder(row: MirrorRow): AnalyticsOrder {
  return {
    id: row.id,
    customerId: String(row.customerId ?? ''),
    orderNumber: (row.orderNumber as string) ?? null,
    status: String(row.status ?? 'draft'),
    orderType: (row.orderType ?? row.garmentType ?? null) as string | null,
    totalAmount: num(row.totalAmount),
    dueDate: (row.dueDate as string) ?? null,
    createdAt: (row.createdAt as string) ?? null,
    garmentType: (row.garmentType as string) ?? null,
    productionStages: Array.isArray(row.productionStages)
      ? (row.productionStages as MinimalProductionStage[])
      : null,
  };
}

function mirrorInvoice(row: MirrorRow): AnalyticsInvoice {
  return {
    id: row.id,
    customerId: (row.customerId as string) ?? null,
    orderId: (row.orderId as string) ?? null,
    invoiceNumber: (row.invoiceNumber as string) ?? null,
    status: String(row.status ?? 'pending'),
    totalAmount: num(row.totalAmount),
    amountPaid: num(row.amountPaid),
    balanceDue: num(row.balanceDue),
    dueDate: (row.dueDate as string) ?? null,
    issueDate: (row.issueDate as string) ?? null,
    createdAt: (row.createdAt as string) ?? null,
  };
}

function mirrorPayment(row: MirrorRow): AnalyticsPayment {
  return {
    id: row.id,
    invoiceId: (row.invoiceId as string) ?? null,
    customerId: (row.customerId as string) ?? null,
    orderId: (row.orderId as string) ?? null,
    amount: num(row.amount),
    paymentStatus: String(row.paymentStatus ?? 'captured'),
    paidAt: String(row.paidAt ?? row.createdAt ?? new Date(0).toISOString()),
    method: (row.method as string) ?? null,
  };
}

function mirrorUsage(row: MirrorRow): AnalyticsMaterialUsage {
  return {
    id: row.id,
    fabricRecordId: String(row.fabricRecordId ?? ''),
    orderId: (row.orderId as string) ?? null,
    quantityUsed: row.quantityUsed == null ? null : num(row.quantityUsed),
    unit: (row.unit as string) ?? null,
  };
}

async function readMirror(workspaceId: string) {
  // Dynamic import keeps the Dexie/IndexedDB layer out of the eager shell
  // chunk (Stage 13 payload guarantee, mandate §32). The read is async anyway.
  const { db } = await import('../../db/database');
  const [customerRows, orderRows, invoiceRows, paymentRows, usageRows, meta] = await Promise.all([
    db.customers.toArray(),
    db.orders.toArray(),
    db.invoices.toArray(),
    db.payments.toArray(),
    db.materialUsages.toArray(),
    db.syncMeta.get(`workspace:${workspaceId}`),
  ]);

  const alive = (rows: MirrorRow[]) =>
    rows.filter((r) => !r.deletedAt && r.workspaceId === workspaceId);

  return {
    customers: alive(customerRows).map(mirrorCustomer),
    orders: alive(orderRows).map(mirrorOrder),
    invoices: alive(invoiceRows).map(mirrorInvoice),
    payments: alive(paymentRows).map(mirrorPayment),
    materialUsages: alive(usageRows).map(mirrorUsage),
    lastSyncedAt: meta?.lastSuccessfulSync ?? null,
  };
}

/* ── Context-record coercions (context shapes are supersets; keep only the
      analytics-relevant, tolerant fields) ─────────────────────────────────── */

type UnknownRecord = Record<string, unknown>;

function ctxCustomers(value: UnknownRecord[] | undefined): AnalyticsCustomer[] {
  return (value ?? []).map((c) => ({
    id: String(c.id),
    fullName: (c.fullName as string) ?? null,
    phone: (c.phone as string) ?? null,
    email: (c.email as string) ?? null,
    createdAt: (c.createdAt as string) ?? null,
  }));
}

function ctxOrders(value: UnknownRecord[] | undefined): AnalyticsOrder[] {
  return (value ?? []).map((o) => ({
    id: String(o.id),
    customerId: String(o.customerId ?? (o.customer as UnknownRecord | undefined)?.id ?? ''),
    orderNumber: (o.orderNumber as string) ?? null,
    status: String(o.status ?? 'draft'),
    orderType: (o.orderType ?? o.garmentType ?? null) as string | null,
    totalAmount: num(o.totalAmount),
    dueDate: (o.dueDate as string) ?? null,
    createdAt: (o.createdAt as string) ?? null,
    garmentType: (o.garmentType as string) ?? null,
    productionStages: Array.isArray(o.productionStages)
      ? (o.productionStages as MinimalProductionStage[])
      : null,
  }));
}

function ctxInvoices(value: UnknownRecord[] | undefined): AnalyticsInvoice[] {
  return (value ?? []).map((i) => ({
    id: String(i.id),
    customerId: (i.customerId as string) ?? null,
    orderId: (i.orderId as string) ?? null,
    invoiceNumber: (i.invoiceNumber as string) ?? null,
    status: String(i.status ?? 'pending'),
    totalAmount: num(i.totalAmount),
    amountPaid: num(i.amountPaid),
    balanceDue: num(i.balanceDue),
    dueDate: (i.dueDate as string) ?? null,
    issueDate: (i.issueDate as string) ?? null,
    createdAt: (i.createdAt as string) ?? null,
  }));
}

function ctxPayments(value: UnknownRecord[] | undefined): AnalyticsPayment[] {
  return (value ?? []).map((p) => ({
    id: String(p.id),
    invoiceId: (p.invoiceId as string) ?? null,
    customerId: (p.customerId as string) ?? null,
    orderId: (p.orderId as string) ?? null,
    amount: num(p.amount),
    paymentStatus: String(p.paymentStatus ?? 'captured'),
    paidAt: String(p.paidAt ?? p.createdAt ?? new Date(0).toISOString()),
    method: (p.method as string) ?? null,
  }));
}

function ctxUsages(value: UnknownRecord[] | undefined): AnalyticsMaterialUsage[] {
  return (value ?? []).map((u) => ({
    id: String(u.id),
    fabricRecordId: String(u.fabricRecordId ?? ''),
    orderId: (u.orderId as string) ?? null,
    quantityUsed: u.quantityUsed == null ? null : num(u.quantityUsed),
    unit: (u.unit as string) ?? null,
  }));
}

function ctxFabrics(value: UnknownRecord[] | undefined): AnalyticsFabric[] {
  return (value ?? []).map((f) => ({
    id: String(f.id),
    name: String(f.name ?? ''),
    fabricType: String(f.fabricType ?? ''),
    color: (f.color as string) ?? null,
    unit: (f.unit as string) ?? null,
    supplier: (f.supplier as string) ?? null,
    quantityInStock: f.quantityInStock == null ? null : num(f.quantityInStock),
    reorderLevel: f.reorderLevel == null ? null : num(f.reorderLevel),
    costPerUnit: f.costPerUnit == null ? null : num(f.costPerUnit),
    isActive: typeof f.isActive === 'boolean' ? f.isActive : null,
  }));
}

/** Merge: mirror rows win by id; context-only rows (writes from this device
 *  not yet synced) are appended. Server-authoritative rows are never
 *  shadowed by local variants of the same record. */
function mergeById<T extends { id: string }>(mirror: T[], context: T[]): T[] {
  if (context.length === 0) return mirror;
  const ids = new Set(mirror.map((r) => r.id));
  return [...mirror, ...context.filter((r) => !ids.has(r.id))];
}

/* ── Hook ─────────────────────────────────────────────────────────────────── */

export function useAnalytics(): AnalyticsState {
  const {
    customers, orders, invoices, payments, materialUsages, fabricRecords,
    currentWorkspace,
  } = useApp();

  const workspaceId = currentWorkspace?.id ?? '';

  // Device-local baseline: available immediately (offline-capable, mandate §16)
  const localRecords = useMemo<AnalyticsRecords>(
    () => ({
      customers: ctxCustomers(customers as unknown as UnknownRecord[]),
      orders: ctxOrders(orders as unknown as UnknownRecord[]),
      invoices: ctxInvoices(invoices as unknown as UnknownRecord[]),
      payments: ctxPayments(payments as unknown as UnknownRecord[]),
      materialUsages: ctxUsages(materialUsages as unknown as UnknownRecord[]),
      fabricRecords: ctxFabrics(fabricRecords as unknown as UnknownRecord[]),
    }),
    [customers, orders, invoices, payments, materialUsages, fabricRecords]
  );

  const [mirror, setMirror] = useState<Awaited<ReturnType<typeof readMirror>> | null>(null);
  const [mirrorFailed, setMirrorFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!workspaceId) return;
    readMirror(workspaceId)
      .then((m) => { if (!cancelled) setMirror(m); })
      .catch(() => { if (!cancelled) setMirrorFailed(true); });
    return () => { cancelled = true; };
  }, [workspaceId, localRecords]);

  const records = useMemo<AnalyticsRecords>(() => {
    if (!mirror) return localRecords;
    return {
      customers: mergeById(mirror.customers, localRecords.customers),
      orders: mergeById(mirror.orders, localRecords.orders),
      invoices: mergeById(mirror.invoices, localRecords.invoices),
      payments: mergeById(mirror.payments, localRecords.payments),
      materialUsages: mergeById(mirror.materialUsages, localRecords.materialUsages),
      fabricRecords: localRecords.fabricRecords, // DEVICE-LOCAL by design
    };
  }, [mirror, localRecords]);

  const provenance = useMemo<AnalyticsProvenance>(() => {
    if (mirrorFailed) return 'DEVICE_LOCAL';
    if (!mirror) return 'DEVICE_LOCAL';
    const hasMirror =
      mirror.customers.length + mirror.orders.length + mirror.invoices.length +
      mirror.payments.length + mirror.materialUsages.length;
    if (!hasMirror) return 'DEVICE_LOCAL';
    const hasLocalOnly =
      records.customers.length + records.orders.length + records.invoices.length +
      records.payments.length + records.materialUsages.length > hasMirror;
    return hasLocalOnly ? 'MIXED' : 'SERVER_SYNCED';
  }, [mirror, mirrorFailed, records]);

  return {
    records,
    provenance,
    materialsProvenance: 'DEVICE_LOCAL',
    lastSyncedAt: mirror?.lastSyncedAt ?? null,
    settled: mirror != null || mirrorFailed,
  };
}
