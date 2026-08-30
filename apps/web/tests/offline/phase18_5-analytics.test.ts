/**
 * Phase 18.5 — Analytics Truth (AT namespace).
 *
 * Certifies the canonical projection module (`@shared/utils/analyticsProjection`)
 * that Dashboard AND Reports now share (AD1: Option C, hybrid). One definition
 * per metric; F-1 / F-4 / F-5 closures; AD6 ratified definitions.
 */

import { describe, it, expect } from 'vitest';
import {
  collectedRevenue,
  orderValue,
  invoicedValue,
  outstandingBalance,
  overdueExposure,
  isUnpaidInvoice,
  isCapturedPayment,
  activeOrderCount,
  deliveredOrderCount,
  overdueOrderCount,
  completionRate,
  customerInsights,
  repeatCustomerCount,
  workspaceAverageOrderValue,
  UNPAID_INVOICE_STATUSES,
} from '../../src/shared/utils/analyticsProjection';

/* Fixtures — a small but realistic workspace record set. */
const customers = [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }];

const orders = [
  { id: 'o1', customerId: 'c1', status: 'delivered', orderType: 'Kaftan', totalAmount: 1000 },
  { id: 'o2', customerId: 'c1', status: 'in_progress', orderType: 'Kaftan', totalAmount: 500 },
  { id: 'o3', customerId: 'c2', status: 'ready', orderType: 'Gown', totalAmount: 800 },
  { id: 'o4', customerId: 'c3', status: 'cancelled', orderType: 'Gown', totalAmount: 999 },
];

const payments = [
  { id: 'p1', orderId: 'o1', amount: 700, paymentStatus: 'captured', paidAt: '2026-08-01' },
  { id: 'p2', orderId: 'o1', amount: 300, paymentStatus: 'captured', paidAt: '2026-08-20' },
  { id: 'p3', orderId: 'o3', amount: 400, paymentStatus: 'captured', paidAt: '2026-08-25' },
  { id: 'p4', orderId: 'o2', amount: 250, paymentStatus: 'pending', paidAt: '2026-08-26' },
  { id: 'p5', orderId: 'o2', amount: 100, paymentStatus: 'failed', paidAt: '2026-08-27' },
];

const invoices = [
  { id: 'i1', orderId: 'o1', status: 'paid', totalAmount: 1000, balanceDue: 0 },
  { id: 'i2', orderId: 'o2', status: 'pending', totalAmount: 500, balanceDue: 500 },
  { id: 'i3', orderId: 'o3', status: 'partial', totalAmount: 800, balanceDue: 400 },
  { id: 'i4', orderId: 'o3', status: 'overdue', totalAmount: 300, balanceDue: 300 },
];

/* ══ AT1 · Revenue family — F-1: revenue ⇔ captured payments only ═══════════ */
describe('AT1 · Collected Revenue vs Order Value are distinct (F-1)', () => {
  it('Collected Revenue counts only captured payments', () => {
    // 700 + 300 + 400 = 1400 (pending p4 and failed p5 excluded)
    expect(collectedRevenue(payments)).toBe(1400);
  });

  it('Order Value excludes cancelled orders and is NOT revenue', () => {
    // 1000 + 500 + 800 = 2300 (o4 cancelled excluded)
    expect(orderValue(orders)).toBe(2300);
    expect(orderValue(orders)).not.toBe(collectedRevenue(payments));
  });

  it('Collected Revenue honours a date window (event time = paidAt)', () => {
    const window = { start: new Date('2026-08-19'), end: new Date('2026-08-31') };
    // 300 (Aug 20) + 400 (Aug 25) = 700
    expect(collectedRevenue(payments, window)).toBe(700);
  });

  it('Invoiced Value sums issued invoices (excl. draft/void)', () => {
    // 1000 + 500 + 800 + 300 = 2600
    expect(invoicedValue(invoices)).toBe(2600);
  });
});

/* ══ AT2 · Outstanding family — F-4: `pending` is unpaid ════════════════════ */
describe('AT2 · Outstanding includes the `pending` class (F-4)', () => {
  it('the canonical unpaid vocabulary contains pending', () => {
    expect(UNPAID_INVOICE_STATUSES).toContain('pending');
  });

  it('a fresh `pending` invoice is unpaid', () => {
    expect(isUnpaidInvoice({ status: 'pending', balanceDue: 500 })).toBe(true);
  });

  it('Outstanding sums pending + partial + overdue balances', () => {
    // 500 (pending) + 400 (partial) + 300 (overdue) = 1200
    expect(outstandingBalance(invoices)).toBe(1200);
  });

  it('a legacy filter that omitted pending would understate Outstanding', () => {
    const legacy = invoices
      .filter((inv) => ['sent', 'partial', 'overdue'].includes(inv.status))
      .reduce((s, inv) => s + inv.balanceDue, 0); // 700
    expect(legacy).toBeLessThan(outstandingBalance(invoices));
  });

  it('Overdue Exposure isolates the overdue status', () => {
    expect(overdueExposure(invoices)).toBe(300);
  });

  it('paid invoices are never unpaid', () => {
    expect(isUnpaidInvoice({ status: 'paid', balanceDue: 0 })).toBe(false);
  });
});

/* ══ AT3 · Order pipeline counts ═══════════════════════════════════════════ */
describe('AT3 · Order pipeline metrics', () => {
  it('active = draft/in_progress/ready', () => {
    expect(activeOrderCount(orders)).toBe(2); // o2, o3
  });
  it('delivered count', () => {
    expect(deliveredOrderCount(orders)).toBe(1); // o1
  });
  it('overdue orders respect dueDate + open status', () => {
    const now = new Date('2026-08-30');
    const withDue = [
      { id: 'a', status: 'in_progress', dueDate: '2026-08-01' }, // overdue
      { id: 'b', status: 'delivered', dueDate: '2026-01-01' }, // closed → not overdue
      { id: 'c', status: 'ready', dueDate: '2026-12-01' }, // future
    ];
    expect(overdueOrderCount(withDue, now)).toBe(1);
  });
  it('completion rate = delivered / total (0 when empty)', () => {
    expect(completionRate(orders)).toBe(25); // 1/4
    expect(completionRate([])).toBe(0);
  });
});

/* ══ AT4 · Customer value + AD6 definitions ════════════════════════════════ */
describe('AT4 · Customer insights (AD6)', () => {
  const insights = customerInsights(customers, orders, payments, invoices);

  it('repeat customer = >= 2 orders', () => {
    const c1 = insights.find((i) => i.customerId === 'c1')!;
    expect(c1.ordersCount).toBe(2);
    expect(c1.isRepeatCustomer).toBe(true);
    const c2 = insights.find((i) => i.customerId === 'c2')!;
    expect(c2.isRepeatCustomer).toBe(false);
    expect(repeatCustomerCount(insights)).toBe(1);
  });

  it('collected revenue attributes captured payments via order.customerId', () => {
    const c1 = insights.find((i) => i.customerId === 'c1')!;
    expect(c1.collectedRevenue).toBe(1000); // p1+p2 on o1
    const c2 = insights.find((i) => i.customerId === 'c2')!;
    expect(c2.collectedRevenue).toBe(400); // p3 on o3
  });

  it('pending balance uses the unpaid class (includes pending)', () => {
    const c1 = insights.find((i) => i.customerId === 'c1')!;
    expect(c1.pendingBalance).toBe(500); // i2 pending on o2 → c1
    const c2 = insights.find((i) => i.customerId === 'c2')!;
    expect(c2.pendingBalance).toBe(700); // i3 partial + i4 overdue on o3 → c2
  });

  it('workspace AOV is Σ order value / Σ orders (Σ/Σ, not mean-of-means)', () => {
    // Σ value 2300 / 3 non-cancelled orders = 766.67
    expect(workspaceAverageOrderValue(orders)).toBeCloseTo(2300 / 3, 5);

    // Prove it differs from mean-of-per-customer-AOV on this fixture.
    const perCustomerAov = insights
      .filter((i) => i.ordersCount > 0)
      .map((i) => i.averageOrderValue);
    const meanOfMeans =
      perCustomerAov.reduce((s, v) => s + v, 0) / perCustomerAov.length;
    expect(workspaceAverageOrderValue(orders)).not.toBeCloseTo(meanOfMeans, 5);
  });
});

/* ══ AT5 · No fabricated data — empty workspace is honest zero ══════════════ */
describe('AT5 · Empty workspace yields honest zeros (no fabrication)', () => {
  it('all money metrics are 0 with no records', () => {
    expect(collectedRevenue([])).toBe(0);
    expect(orderValue([])).toBe(0);
    expect(outstandingBalance([])).toBe(0);
    expect(overdueExposure([])).toBe(0);
    expect(workspaceAverageOrderValue([])).toBe(0);
    expect(repeatCustomerCount(customerInsights([], [], [], []))).toBe(0);
  });

  it('captured-payment predicate is case-insensitive and safe on junk', () => {
    expect(isCapturedPayment({ amount: 1, paymentStatus: 'CAPTURED' })).toBe(true);
    expect(isCapturedPayment({ amount: 1, paymentStatus: null })).toBe(false);
  });
});
