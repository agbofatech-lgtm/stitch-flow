/**
 * PHASE 18.5 — ANALYTICS PROJECTION LAYER (Stage 5)
 * ---------------------------------------------------------------------------
 * ONE metric definition → MANY presentations (Dashboard + Reports).
 * Pure, deterministic, read-only. No React, no storage, no network.
 *
 * Provenance is carried explicitly so no surface can claim more truth than
 * it has (mandate §9, §16, §23, §35):
 *   - Domain records (customers/orders/invoices/payments/usages) reach this
 *     layer through the workspace sync mirror (server-authoritative rows)
 *     merged with this device's local writes — see useAnalytics.ts.
 *   - Fabric/material records are DEVICE-LOCAL today (Stage 14 S8): material
 *     intelligence is labelled DEVICE_LOCAL and must never claim synced truth.
 *
 * Metric contract (Part F of docs/PHASE18_5_ANALYTICS_TRUTH.md, ratified AD6):
 *   Collected Revenue  Σ payments.amount where paymentStatus='captured'
 *                      (temporal event = paidAt)
 *   Order Value        Σ orders.totalAmount where status !== 'cancelled'
 *   Invoiced Value     Σ invoices.totalAmount (event = issueDate ?? createdAt)
 *   Outstanding        Σ invoices.balanceDue over UNPAID_INVOICE_STATUSES
 *   Overdue Exposure   Σ invoices.balanceDue where status='overdue'
 *   Repeat Customer    customer with >= 2 orders (repository de-facto, AT6)
 *   AOV (customer)     Σ order value / order count, per customer (existing)
 *   AOV (workspace)    Σ order value / Σ orders (new, distinctly named)
 *
 * Honesty rules: missing evidence ⇒ null / 'N/A', never 0-as-measurement
 * (AT4, AT8). Invoice status vocabulary uses the statuses the system actually
 * writes: pending | partial | paid | overdue (+ legacy 'sent' tolerated).
 */

/* ── Record types (structural; tolerant of partial sync payloads) ────────── */

export type AnalyticsCustomer = {
  id: string;
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
  createdAt?: string | null;
};

export type AnalyticsOrder = {
  id: string;
  customerId: string;
  orderNumber?: string | null;
  status: string; // draft | in_progress | ready | delivered | cancelled
  orderType?: string | null;
  totalAmount: number;
  dueDate?: string | null;
  createdAt?: string | null;
  /** canonical production stage code when the order carries one */
  productionStage?: string | null;
};

export type AnalyticsInvoice = {
  id: string;
  customerId?: string | null;
  orderId?: string | null;
  invoiceNumber?: string | null;
  status: string; // pending | partial | paid | overdue (legacy 'sent' tolerated)
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  dueDate?: string | null;
  issueDate?: string | null;
  createdAt?: string | null;
};

export type AnalyticsPayment = {
  id: string;
  invoiceId?: string | null;
  customerId?: string | null;
  orderId?: string | null;
  amount: number;
  paymentStatus: string; // pending | captured | failed | refunded
  paidAt: string;
  method?: string | null;
};

export type AnalyticsFabric = {
  id: string;
  name: string;
  fabricType: string;
  color?: string | null;
  unit?: string | null;
  supplier?: string | null;
  quantityInStock?: number | null;
  reorderLevel?: number | null;
  costPerUnit?: number | null;
  isActive?: boolean | null;
};

export type AnalyticsMaterialUsage = {
  id: string;
  fabricRecordId: string;
  orderId?: string | null;
  quantityUsed?: number | null;
  unit?: string | null;
};

export type AnalyticsProvenance = 'SERVER_SYNCED' | 'DEVICE_LOCAL' | 'MIXED' | 'UNAVAILABLE';

export type DateRange = { from?: Date; to?: Date };

/* ── Status vocabularies (evidence-based; see Part F) ────────────────────── */

/** Invoice statuses the system actually writes as "not fully paid".
 *  'sent' is retained defensively for legacy rows only — creation writes
 *  'pending' (fixes forensic defect F-4). */
export const UNPAID_INVOICE_STATUSES = ['pending', 'partial', 'overdue', 'sent'] as const;

export const ACTIVE_ORDER_STATUSES = ['draft', 'in_progress', 'ready'] as const;

/* ── Revenue family (temporal event = the business event itself) ─────────── */

const inRange = (iso: string | null | undefined, range?: DateRange): boolean => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  if (range?.from && t < range.from.getTime()) return false;
  if (range?.to && t > range.to.getTime()) return false;
  return true;
};

/** Collected Revenue — Σ captured payments; event time = paidAt (mandate §14). */
export function collectedRevenue(payments: AnalyticsPayment[], range?: DateRange): number {
  return payments.reduce(
    (sum, p) =>
      p.paymentStatus === 'captured' && inRange(p.paidAt, range) ? sum + Number(p.amount || 0) : sum,
    0
  );
}

/** Order Value — Σ order totals excluding cancelled; event time = createdAt when ranged. */
export function orderValue(orders: AnalyticsOrder[], range?: DateRange): number {
  return orders.reduce(
    (sum, o) =>
      o.status !== 'cancelled' && (range ? inRange(o.createdAt ?? null, range) : true)
        ? sum + Number(o.totalAmount || 0)
        : sum,
    0
  );
}

const invoiceIssueTime = (i: AnalyticsInvoice): string | null => i.issueDate ?? i.createdAt ?? null;

/** Invoiced Value — Σ invoice totals; event time = issueDate, falling back to createdAt. */
export function invoicedValue(invoices: AnalyticsInvoice[], range?: DateRange): number {
  return invoices.reduce(
    (sum, i) => (range ? inRange(invoiceIssueTime(i), range) : true) ? sum + Number(i.totalAmount || 0) : sum,
    0
  );
}

/** Outstanding — Σ balanceDue over unpaid invoices. Never recomputed from parts. */
export function outstandingBalance(invoices: AnalyticsInvoice[]): number {
  return invoices.reduce(
    (sum, i) =>
      (UNPAID_INVOICE_STATUSES as readonly string[]).includes(i.status)
        ? sum + Number(i.balanceDue || 0)
        : sum,
    0
  );
}

/** Overdue Exposure — Σ balanceDue of overdue invoices. */
export function overdueExposure(invoices: AnalyticsInvoice[]): number {
  return invoices.reduce(
    (sum, i) => (i.status === 'overdue' ? sum + Number(i.balanceDue || 0) : sum),
    0
  );
}

export type CollectionHealth = {
  collected: number;
  outstanding: number;
  /** null = no invoiced value yet ⇒ collection health is N/A, not 0% (AT4) */
  ratio: number | null;
};

export function collectionHealth(invoices: AnalyticsInvoice[], payments: AnalyticsPayment[]): CollectionHealth {
  const collected = collectedRevenue(payments);
  const outstanding = outstandingBalance(invoices);
  const invoiced = invoicedValue(invoices);
  return { collected, outstanding, ratio: invoiced > 0 ? collected / invoiced : null };
}

/* ── Customer intelligence ────────────────────────────────────────────────── */

export type CustomerInsight = {
  customer: AnalyticsCustomer;
  ordersCount: number;
  totalSpent: number;
  pendingBalance: number;
  totalOrderValue: number;
  averageOrderValue: number;
  /** repository-approved definition (AD6): >= 2 orders */
  isRepeatCustomer: boolean;
};

export function customerIntelligence(
  customers: AnalyticsCustomer[],
  orders: AnalyticsOrder[],
  invoices: AnalyticsInvoice[],
  payments: AnalyticsPayment[]
): CustomerInsight[] {
  const customerOrderMap = new Map<string, number>();
  const customerOrderValueMap = new Map<string, number>();

  for (const order of orders) {
    customerOrderMap.set(order.customerId, (customerOrderMap.get(order.customerId) || 0) + 1);
    customerOrderValueMap.set(
      order.customerId,
      (customerOrderValueMap.get(order.customerId) || 0) + Number(order.totalAmount || 0)
    );
  }

  // Payment attribution: the payment's own customerId when present (server
  // payload carries it), else resolved through the referenced order.
  const customerSpendMap = new Map<string, number>();
  for (const payment of payments) {
    if (payment.paymentStatus !== 'captured') continue;
    let customerId = payment.customerId ?? null;
    if (!customerId && payment.orderId) {
      customerId = orders.find((o) => o.id === payment.orderId)?.customerId ?? null;
    }
    if (!customerId) continue;
    customerSpendMap.set(customerId, (customerSpendMap.get(customerId) || 0) + Number(payment.amount || 0));
  }

  const customerPendingMap = new Map<string, number>();
  for (const invoice of invoices) {
    if (!(UNPAID_INVOICE_STATUSES as readonly string[]).includes(invoice.status)) continue;
    let customerId = invoice.customerId ?? null;
    if (!customerId && invoice.orderId) {
      customerId = orders.find((o) => o.id === invoice.orderId)?.customerId ?? null;
    }
    if (!customerId) continue;
    customerPendingMap.set(customerId, (customerPendingMap.get(customerId) || 0) + Number(invoice.balanceDue || 0));
  }

  return customers
    .map((customer) => {
      const ordersCount = customerOrderMap.get(customer.id) || 0;
      const totalSpent = customerSpendMap.get(customer.id) || 0;
      const pendingBalance = customerPendingMap.get(customer.id) || 0;
      const totalOrderValue = customerOrderValueMap.get(customer.id) || 0;
      return {
        customer,
        ordersCount,
        totalSpent,
        pendingBalance,
        totalOrderValue,
        averageOrderValue: ordersCount > 0 ? totalOrderValue / ordersCount : 0,
        isRepeatCustomer: ordersCount >= 2,
      };
    })
    .filter(
      (item) =>
        item.ordersCount > 0 || item.totalSpent > 0 || item.pendingBalance > 0 || item.totalOrderValue > 0
    );
}

/** Workspace Average Order Value = Σ order value / Σ orders (distinct from the
 *  per-customer AOV above; both are defined, neither silently renamed). */
export function workspaceAverageOrderValue(orders: AnalyticsOrder[]): number | null {
  const eligible = orders.filter((o) => o.status !== 'cancelled');
  if (eligible.length === 0) return null;
  return eligible.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0) / eligible.length;
}

/* ── Order intelligence ───────────────────────────────────────────────────── */

export type OrderIntelligence = {
  statusCounts: Record<'draft' | 'in_progress' | 'ready' | 'delivered' | 'cancelled', number>;
  totalOrders: number;
  activeWorkflowOrders: number;
  openOverdueOrders: AnalyticsOrder[];
  /** delivered / all orders * 100 — existing repository formula, preserved. */
  completionRate: number;
  bestSellingOrderTypes: Array<{ name: string; count: number; revenue: number }>;
};

export function orderIntelligence(orders: AnalyticsOrder[], now: Date = new Date()): OrderIntelligence {
  const statusCounts = {
    draft: orders.filter((o) => o.status === 'draft').length,
    in_progress: orders.filter((o) => o.status === 'in_progress').length,
    ready: orders.filter((o) => o.status === 'ready').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  };

  const openOverdueOrders = orders.filter((order) => {
    if (!order.dueDate) return false;
    if (['delivered', 'cancelled'].includes(order.status)) return false;
    return new Date(order.dueDate) < now;
  });

  const orderTypeMap = new Map<string, number>();
  const orderTypeRevenueMap = new Map<string, number>();
  for (const order of orders) {
    const type = order.orderType || 'Unspecified';
    orderTypeMap.set(type, (orderTypeMap.get(type) || 0) + 1);
    orderTypeRevenueMap.set(type, (orderTypeRevenueMap.get(type) || 0) + Number(order.totalAmount || 0));
  }
  const bestSellingOrderTypes = Array.from(orderTypeMap.entries())
    .map(([name, count]) => ({ name, count, revenue: orderTypeRevenueMap.get(name) || 0 }))
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : b.revenue - a.revenue))
    .slice(0, 5);

  return {
    statusCounts,
    totalOrders: orders.length,
    activeWorkflowOrders: statusCounts.draft + statusCounts.in_progress + statusCounts.ready,
    openOverdueOrders,
    completionRate: orders.length > 0 ? (statusCounts.delivered / orders.length) * 100 : 0,
    bestSellingOrderTypes,
  };
}

import { getAverageTurnaroundDays, hasTurnaroundEvidence } from '@shared/utils/reporting';

/* ── Production intelligence — the canonical-stage helpers from
      @shared/utils/reporting remain THE definitions (fixes F-5: they are now
      shared by Dashboard and Reports through this module). ───────────────── */

export {
  buildOrdersByStage,
  hasTurnaroundEvidence,
  getAverageTurnaroundDays,
  getBottleneckView,
  getOverdueOrdersCount,
  getReadyForDeliveryCount,
  filterOrdersByDateRange,
  resolveReportingDateRange,
  getMaterialConsumptionByGarmentType,
} from '@shared/utils/reporting';
export type { ReportingDatePreset, ReportingDateRange as ReportingRange } from '@shared/utils/reporting';

/* ── Material intelligence — DEVICE-LOCAL provenance (mandate §23, AT9) ──── */

export type MaterialProvenance = 'DEVICE_LOCAL';

export type MaterialInsight = {
  material: AnalyticsFabric;
  totalUsed: number;
  totalCostUsed: number;
  isInactive: boolean;
  isSlowMoving: boolean;
  isLowStock: boolean;
};

export const MATERIALS_PROVENANCE: MaterialProvenance = 'DEVICE_LOCAL';

export function materialIntelligence(
  fabrics: AnalyticsFabric[],
  usages: AnalyticsMaterialUsage[]
): MaterialInsight[] {
  const usageByMaterialMap = new Map<string, number>();
  const costByMaterialMap = new Map<string, number>();

  for (const usage of usages) {
    const qty = Number(usage.quantityUsed || 0);
    usageByMaterialMap.set(usage.fabricRecordId, (usageByMaterialMap.get(usage.fabricRecordId) || 0) + qty);
    const fabric = fabrics.find((item) => item.id === usage.fabricRecordId);
    const unitCost = Number(fabric?.costPerUnit || 0);
    costByMaterialMap.set(usage.fabricRecordId, (costByMaterialMap.get(usage.fabricRecordId) || 0) + qty * unitCost);
  }

  return (fabrics ?? []).map((material) => {
    const totalUsed = usageByMaterialMap.get(material.id) || 0;
    const totalCostUsed = costByMaterialMap.get(material.id) || 0;
    const isInactive = material.isActive === false;
    const isSlowMoving = totalUsed === 0 && material.isActive !== false;
    const qty = Number(material.quantityInStock ?? 0);
    const reorder = material.reorderLevel;
    const isLowStock = material.isActive !== false && typeof reorder === 'number' && qty <= reorder;
    return { material, totalUsed, totalCostUsed, isInactive, isSlowMoving, isLowStock };
  });
}

/** Adapt analytics orders to the reporting helpers' structural type
 *  (createdAt/dueDate optional, never null). */
export function toReportingOrders(orders: AnalyticsOrder[]) {
  return orders.map((o) => ({
    ...o,
    dueDate: o.dueDate ?? undefined,
    createdAt: o.createdAt ?? undefined,
  }));
}

/** Adapt analytics material usages (quantityUsed optional → 0). */
export function toReportingUsages(usages: AnalyticsMaterialUsage[]) {
  return usages.map((u) => ({ ...u, quantityUsed: u.quantityUsed ?? 0 }));
}

/* ── Executive summary (Dashboard + Reports must consume THIS — AT15) ────── */

export type ExecutiveSummary = {
  collectedRevenueAllTime: number;
  orderValueAllTime: number;
  outstandingBalance: number;
  overdueExposure: number;
  totalCustomers: number;
  repeatCustomerCount: number;
  openOrders: number;
  overdueOrders: number;
  /** N/A (null) when no delivered orders exist yet — AT8/AT4 honesty */
  averageTurnaroundDays: number | null;
};

export function executiveSummary(
  records: {
    customers: AnalyticsCustomer[];
    orders: AnalyticsOrder[];
    invoices: AnalyticsInvoice[];
    payments: AnalyticsPayment[];
  },
  now: Date = new Date()
): ExecutiveSummary {
  const insights = customerIntelligence(records.customers, records.orders, records.invoices, records.payments);
  const orders = orderIntelligence(records.orders, now);
  return {
    collectedRevenueAllTime: collectedRevenue(records.payments),
    orderValueAllTime: orderValue(records.orders),
    outstandingBalance: outstandingBalance(records.invoices),
    overdueExposure: overdueExposure(records.invoices),
    totalCustomers: records.customers.length,
    repeatCustomerCount: insights.filter((i) => i.isRepeatCustomer).length,
    openOrders: orders.activeWorkflowOrders,
    overdueOrders: orders.openOverdueOrders.length,
    averageTurnaroundDays: hasTurnaroundEvidence(toReportingOrders(records.orders))
      ? getAverageTurnaroundDays(toReportingOrders(records.orders))
      : null,
  };
}
