/**
 * Phase 18.5 — Canonical analytics projection (AD1: Option C, Hybrid).
 *
 * ONE definition per business metric. Dashboard AND Reports import from here so
 * the two surfaces can never disagree about what a number means (closes F-5).
 *
 * Vocabulary (AD6 — ratified 2026-08-30):
 *   - Order Value        = Σ orders.totalAmount        (excl. cancelled)
 *   - Invoiced Value     = Σ invoices.totalAmount      (excl. draft/void)
 *   - Collected Revenue  = Σ captured payments.amount  (event time = paidAt)
 *   - Outstanding        = Σ invoices.balanceDue       (unpaid status class)
 *   - Overdue Exposure   = Σ invoices.balanceDue       (status = overdue)
 *   - Repeat customer    = ordersCount >= 2
 *   - Workspace AOV      = Σ order value / Σ orders     (Σ/Σ, NOT mean-of-means)
 *
 * Defect closures embedded here:
 *   - F-1  "revenue" is only ever Collected Revenue (captured payments); Order
 *          Value is a distinct, separately-named metric. Callers must not label
 *          Order Value as revenue.
 *   - F-4  The unpaid/outstanding filter includes `pending` — the real
 *          fresh-unpaid status written by every order/invoice creation flow.
 *          (`sent` is retained for compatibility but is never written.)
 *   - F-5  This module is the single source of these definitions.
 *
 * Provenance: these projections run over whatever record set the caller passes.
 * In the current app that is the AppContext device-local store, so callers must
 * label the result DEVICE-LOCAL. Server aggregates (`/dashboard/*`) remain the
 * authoritative cross-check (AD1). This module is pure and framework-free.
 */

/* ── Minimal structural inputs (kept loose so both Context and API shapes fit) ─ */

export type ProjectionPayment = {
  id?: string;
  orderId?: string | null;
  invoiceId?: string | null;
  amount: number;
  paymentStatus?: string | null;
  paidAt?: string | Date | null;
};

export type ProjectionInvoice = {
  id?: string;
  orderId?: string | null;
  status?: string | null;
  totalAmount?: number | null;
  balanceDue?: number | null;
  issueDate?: string | Date | null;
};

export type ProjectionOrder = {
  id: string;
  customerId?: string | null;
  status?: string | null;
  orderType?: string | null;
  totalAmount?: number | null;
  dueDate?: string | Date | null;
};

export type ProjectionCustomer = {
  id: string;
};

/* ── Canonical status vocabularies ──────────────────────────────────────── */

/**
 * Unpaid / outstanding invoice status class (F-4 fix).
 * `pending` is the status every fresh unpaid invoice actually carries;
 * `partial` and `overdue` are the remaining unpaid states. `sent` is legacy —
 * kept for backward compatibility but never written by real flows.
 */
export const UNPAID_INVOICE_STATUSES = ['pending', 'sent', 'partial', 'overdue'] as const;

/** Invoice statuses that count as an issued/committed document (Invoiced Value). */
export const INVOICED_STATUSES = ['pending', 'sent', 'partial', 'paid', 'overdue'] as const;

/** Order statuses excluded from Order Value / active pipelines. */
const CANCELLED_ORDER = 'cancelled';
const CLOSED_ORDER_STATUSES = new Set(['delivered', 'cancelled']);
const ACTIVE_ORDER_STATUSES = new Set(['draft', 'in_progress', 'ready']);

export function isUnpaidInvoice(invoice: ProjectionInvoice): boolean {
  const status = String(invoice.status || '').toLowerCase();
  return (UNPAID_INVOICE_STATUSES as readonly string[]).includes(status);
}

export function isCapturedPayment(payment: ProjectionPayment): boolean {
  return String(payment.paymentStatus || '').toLowerCase() === 'captured';
}

/* ── Revenue / money family (F-1: revenue ⇔ captured payments only) ──────── */

/** Collected Revenue = Σ captured payments.amount within an optional window. */
export function collectedRevenue(
  payments: ProjectionPayment[],
  window?: { start?: Date | null; end?: Date | null }
): number {
  return payments.reduce((sum, payment) => {
    if (!isCapturedPayment(payment)) return sum;
    if (window && (window.start || window.end)) {
      const paidAt = parseDate(payment.paidAt);
      if (!paidAt) return sum;
      if (window.start && paidAt < window.start) return sum;
      if (window.end && paidAt > window.end) return sum;
    }
    return sum + numeric(payment.amount);
  }, 0);
}

/** Order Value = Σ orders.totalAmount excluding cancelled. NEVER call this "revenue". */
export function orderValue(orders: ProjectionOrder[]): number {
  return orders.reduce((sum, order) => {
    if (String(order.status || '').toLowerCase() === CANCELLED_ORDER) return sum;
    return sum + numeric(order.totalAmount);
  }, 0);
}

/** Invoiced Value = Σ invoices.totalAmount over issued statuses. */
export function invoicedValue(invoices: ProjectionInvoice[]): number {
  return invoices.reduce((sum, invoice) => {
    const status = String(invoice.status || '').toLowerCase();
    if (!(INVOICED_STATUSES as readonly string[]).includes(status)) return sum;
    return sum + numeric(invoice.totalAmount);
  }, 0);
}

/** Outstanding = Σ balanceDue over the unpaid class (F-4: includes `pending`). */
export function outstandingBalance(invoices: ProjectionInvoice[]): number {
  return invoices.reduce(
    (sum, invoice) => (isUnpaidInvoice(invoice) ? sum + numeric(invoice.balanceDue) : sum),
    0
  );
}

/** Overdue Exposure = Σ balanceDue where status = overdue. */
export function overdueExposure(invoices: ProjectionInvoice[]): number {
  return invoices.reduce((sum, invoice) => {
    return String(invoice.status || '').toLowerCase() === 'overdue'
      ? sum + numeric(invoice.balanceDue)
      : sum;
  }, 0);
}

/* ── Order pipeline counts (canonical) ──────────────────────────────────── */

export function activeOrderCount(orders: ProjectionOrder[]): number {
  return orders.filter((o) => ACTIVE_ORDER_STATUSES.has(String(o.status || '').toLowerCase()))
    .length;
}

export function deliveredOrderCount(orders: ProjectionOrder[]): number {
  return orders.filter((o) => String(o.status || '').toLowerCase() === 'delivered').length;
}

/** Orders past their due date and not delivered/cancelled. */
export function overdueOrderCount(orders: ProjectionOrder[], now = new Date()): number {
  return orders.filter((order) => {
    const status = String(order.status || '').toLowerCase();
    if (CLOSED_ORDER_STATUSES.has(status)) return false;
    const due = parseDate(order.dueDate);
    return !!due && due < now;
  }).length;
}

/** Completion rate = delivered / total orders (0 when no orders). */
export function completionRate(orders: ProjectionOrder[]): number {
  if (orders.length === 0) return 0;
  return (deliveredOrderCount(orders) / orders.length) * 100;
}

/* ── Customer value family (AD6) ────────────────────────────────────────── */

export type CustomerInsight = {
  customerId: string;
  ordersCount: number;
  totalOrderValue: number;
  collectedRevenue: number;
  pendingBalance: number;
  averageOrderValue: number;
  isRepeatCustomer: boolean;
};

/**
 * Per-customer rollups. `collectedRevenue` attributes captured payments to a
 * customer via payment.orderId → order.customerId (payment attribution).
 */
export function customerInsights(
  customers: ProjectionCustomer[],
  orders: ProjectionOrder[],
  payments: ProjectionPayment[],
  invoices: ProjectionInvoice[]
): CustomerInsight[] {
  const ordersById = new Map(orders.map((o) => [o.id, o]));
  const ordersCount = new Map<string, number>();
  const orderValueByCustomer = new Map<string, number>();
  const revenueByCustomer = new Map<string, number>();
  const pendingByCustomer = new Map<string, number>();

  for (const order of orders) {
    const cid = order.customerId || '';
    if (!cid) continue;
    ordersCount.set(cid, (ordersCount.get(cid) || 0) + 1);
    if (String(order.status || '').toLowerCase() !== CANCELLED_ORDER) {
      orderValueByCustomer.set(
        cid,
        (orderValueByCustomer.get(cid) || 0) + numeric(order.totalAmount)
      );
    }
  }

  for (const payment of payments) {
    if (!isCapturedPayment(payment)) continue;
    const order = payment.orderId ? ordersById.get(payment.orderId) : undefined;
    const cid = order?.customerId;
    if (!cid) continue;
    revenueByCustomer.set(cid, (revenueByCustomer.get(cid) || 0) + numeric(payment.amount));
  }

  for (const invoice of invoices) {
    if (!isUnpaidInvoice(invoice)) continue;
    const order = invoice.orderId ? ordersById.get(invoice.orderId) : undefined;
    const cid = order?.customerId;
    if (!cid) continue;
    pendingByCustomer.set(cid, (pendingByCustomer.get(cid) || 0) + numeric(invoice.balanceDue));
  }

  return customers.map((customer) => {
    const count = ordersCount.get(customer.id) || 0;
    const value = orderValueByCustomer.get(customer.id) || 0;
    return {
      customerId: customer.id,
      ordersCount: count,
      totalOrderValue: value,
      collectedRevenue: revenueByCustomer.get(customer.id) || 0,
      pendingBalance: pendingByCustomer.get(customer.id) || 0,
      averageOrderValue: count > 0 ? value / count : 0,
      isRepeatCustomer: count >= 2,
    };
  });
}

/** Repeat customer = ordersCount >= 2 (AD6). */
export function repeatCustomerCount(insights: CustomerInsight[]): number {
  return insights.filter((i) => i.isRepeatCustomer).length;
}

/**
 * Workspace Average Order Value = Σ order value / Σ orders (AD6: Σ/Σ, NOT the
 * mean of per-customer AOVs). 0 when there are no orders.
 */
export function workspaceAverageOrderValue(orders: ProjectionOrder[]): number {
  const count = orders.filter(
    (o) => String(o.status || '').toLowerCase() !== CANCELLED_ORDER
  ).length;
  if (count === 0) return 0;
  return orderValue(orders) / count;
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function numeric(value: number | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
