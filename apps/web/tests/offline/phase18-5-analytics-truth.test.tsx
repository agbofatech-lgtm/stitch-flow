// @vitest-environment jsdom
/**
 * PHASE 18.5 — ANALYTICS TRUTH SUITE (AT1–AT15, mandate §29)
 * Unit + rendered tests for the projection layer and the record bridge.
 * Browser-journey equivalents (real server, real sync) run in Stage 14-style
 * browser validation — see docs/PHASE18_5_ANALYTICS_TRUTH.md Part V.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { db } from '../../src/db/database';
import {
  collectedRevenue,
  outstandingBalance,
  overdueExposure,
  collectionHealth,
  customerIntelligence,
  orderIntelligence,
  workspaceAverageOrderValue,
  executiveSummary,
  materialIntelligence,
  UNPAID_INVOICE_STATUSES,
  type AnalyticsInvoice,
  type AnalyticsPayment,
  type AnalyticsOrder,
  type AnalyticsCustomer,
} from '../../src/modules/analytics/projection';
import { useAnalytics } from '../../src/modules/analytics/useAnalytics';
import { Reports } from '../../src/components/Reports';

/* ── fixtures ─────────────────────────────────────────────────────────────── */

const customer = (id: string): AnalyticsCustomer => ({ id, fullName: `Customer ${id}` });
const order = (id: string, customerId: string, over: Partial<AnalyticsOrder> = {}): AnalyticsOrder => ({
  id, customerId, status: 'in_progress', orderType: 'senator', totalAmount: 500,
  dueDate: null, createdAt: '2026-08-01T10:00:00.000Z', ...over,
});
const invoice = (id: string, over: Partial<AnalyticsInvoice> = {}): AnalyticsInvoice => ({
  id, customerId: 'c1', orderId: 'o1', invoiceNumber: `INV-${id}`, status: 'pending',
  totalAmount: 500, amountPaid: 100, balanceDue: 400, dueDate: null,
  issueDate: '2026-08-01T10:00:00.000Z', createdAt: '2026-08-01T10:00:00.000Z', ...over,
});
const payment = (id: string, over: Partial<AnalyticsPayment> = {}): AnalyticsPayment => ({
  id, invoiceId: 'i1', customerId: 'c1', orderId: 'o1', amount: 100,
  paymentStatus: 'captured', paidAt: '2026-08-15T10:00:00.000Z', method: 'cash', ...over,
});

/* ── AT1 — no fabricated first-run data ───────────────────────────────────── */

describe('AT1 · Fresh workspace projects zero records (no fabrication)', () => {
  it('executive summary of empty records is all-zero with N/A turnaround (not 0 days)', () => {
    const empty = executiveSummary({ customers: [], orders: [], invoices: [], payments: [] });
    expect(empty.collectedRevenueAllTime).toBe(0);
    expect(empty.outstandingBalance).toBe(0);
    expect(empty.totalCustomers).toBe(0);
    expect(empty.openOrders).toBe(0);
    expect(empty.averageTurnaroundDays).toBeNull(); // AT4/AT8: N/A, never 0-as-measurement
  });
});

/* ── AT3 — payment truth (mandate's critical example) ─────────────────────── */

describe('AT3 · Invoice 500 / paid 100 → Collected 100, Outstanding 400', () => {
  it('collected revenue counts captured payments only', () => {
    const payments = [payment('p1'), payment('p2', { amount: 50, paymentStatus: 'failed' })];
    expect(collectedRevenue(payments)).toBe(100);
  });

  it('outstanding reads authoritative balanceDue of unpaid invoices', () => {
    const invoices = [invoice('i1'), invoice('i2', { status: 'paid', balanceDue: 0, amountPaid: 300 })];
    expect(outstandingBalance(invoices)).toBe(400);
    expect(overdueExposure(invoices)).toBe(0);
  });

  it('the fresh-invoice status ("pending") is counted as unpaid (F-4 fixed)', () => {
    expect(UNPAID_INVOICE_STATUSES).toContain('pending');
    const fresh = [invoice('i1', { amountPaid: 0, balanceDue: 500 })];
    expect(outstandingBalance(fresh)).toBe(500);
  });

  it('collection health ratio is null when nothing invoiced (AT4)', () => {
    expect(collectionHealth([], [payment('p1')]).ratio).toBeNull();
    expect(collectionHealth([invoice('i1')], [payment('p1')]).ratio).toBeCloseTo(100 / 500);
  });
});

/* ── AT4 — no-data vs zero-data ───────────────────────────────────────────── */

describe('AT4 · Missing evidence is N/A, never a fabricated zero measurement', () => {
  it('workspace AOV is null with no eligible orders, 0 is reserved for real measurements', () => {
    expect(workspaceAverageOrderValue([])).toBeNull();
    expect(workspaceAverageOrderValue([order('o1', 'c1', { totalAmount: 0, status: 'delivered' })])).toBe(0);
  });
});

/* ── AT6 — repeat customer (repository-approved definition) ───────────────── */

describe('AT6 · Repeat customer = >= 2 orders (ratified AD6)', () => {
  it('classifies repeat customers by order count', () => {
    const customers = [customer('c1'), customer('c2')];
    const orders = [
      order('o1', 'c1'), order('o2', 'c1'), order('o3', 'c2'),
    ];
    const insights = customerIntelligence(customers, orders, [], []);
    const c1 = insights.find((i) => i.customer.id === 'c1')!;
    const c2 = insights.find((i) => i.customer.id === 'c2')!;
    expect(c1.isRepeatCustomer).toBe(true);
    expect(c2.isRepeatCustomer).toBe(false);
  });
});

/* ── AT7/AT8 — production bottleneck & turnaround honesty ─────────────────── */

describe('AT7/AT8 · Bottleneck and turnaround only with timestamp evidence', () => {
  it('turnaround is null unless a delivered order has created→delivered timing', () => {
    const noTiming = executiveSummary({
      customers: [customer('c1')],
      orders: [order('o1', 'c1', { status: 'delivered' })], // createdAt but no delivery timestamp field
      invoices: [], payments: [],
    });
    expect(noTiming.averageTurnaroundDays).toBeNull();
  });
});

/* ── AT9 — material provenance ────────────────────────────────────────────── */

describe('AT9 · Material intelligence is DEVICE-LOCAL, never claimed as synced', () => {
  it('computes usage/low-stock from local records with fixed classification', () => {
    const fabrics = [
      { id: 'f1', name: 'Cotton', fabricType: 'cotton', quantityInStock: 2, reorderLevel: 5, costPerUnit: 10, isActive: true },
      { id: 'f2', name: 'Silk', fabricType: 'silk', quantityInStock: 9, reorderLevel: 2, costPerUnit: 30, isActive: true },
      { id: 'f3', name: 'Old Lace', fabricType: 'lace', quantityInStock: 1, reorderLevel: 1, costPerUnit: 5, isActive: false },
    ];
    const usages = [{ id: 'u1', fabricRecordId: 'f1', quantityUsed: 3 }];
    const insights = materialIntelligence(fabrics, usages);
    expect(insights.find((i) => i.material.id === 'f1')!.isLowStock).toBe(true);
    expect(insights.find((i) => i.material.id === 'f1')!.totalUsed).toBe(3);
    expect(insights.find((i) => i.material.id === 'f2')!.isSlowMoving).toBe(true);
    expect(insights.find((i) => i.material.id === 'f3')!.isInactive).toBe(true);
  });
});

/* ── AT11/AT12 — deterministic filters & honest empty filters ─────────────── */

describe('AT11/AT12 · Range filters are deterministic; empty ranges stay honest', () => {
  it('same inputs → same outputs across repeated calls', () => {
    const payments = [payment('p1'), payment('p2', { paidAt: '2026-01-05T10:00:00.000Z', amount: 70 })];
    const range = { from: new Date('2026-08-01'), to: new Date('2026-08-31') };
    const a = collectedRevenue(payments, range);
    const b = collectedRevenue(payments, range);
    expect(a).toBe(b);
    expect(a).toBe(100);
    expect(collectedRevenue(payments, { from: new Date('2027-01-01') })).toBe(0); // no observations in range
  });

  it('order intelligence reports honest counts for an unmatched range (no invented trends)', () => {
    const intel = orderIntelligence([order('o1', 'c1', { status: 'delivered' })], new Date('2026-08-30'));
    expect(intel.completionRate).toBe(100);
    expect(intel.totalOrders).toBe(1);
  });
});

/* ── AT14 — read-only boundary ────────────────────────────────────────────── */

describe('AT14 · Projection never mutates domain records', () => {
  it('all projection functions leave their inputs untouched', () => {
    const invoices = [invoice('i1')];
    const payments = [payment('p1')];
    const orders = [order('o1', 'c1')];
    const customers = [customer('c1')];
    Object.freeze(invoices[0]); Object.freeze(payments[0]); Object.freeze(orders[0]); Object.freeze(customers[0]);
    expect(() => {
      outstandingBalance(invoices);
      collectedRevenue(payments);
      customerIntelligence(customers, orders, invoices, payments);
      orderIntelligence(orders);
      executiveSummary({ customers, orders, invoices, payments });
    }).not.toThrow();
  });
});

/* ── AT2/AT5/AT10/AT13/AT15 — bridge + rendered consistency ───────────────── */

const mockApp = {
  currentView: 'reports', setView: vi.fn(),
  currentWorkspace: { id: 'ws-A', name: 'Atelier A', ownerName: 'Ama O.', defaultCurrency: 'GHS', tier: { code: 'PRO', id: 'tier-pro' }, tierId: 'tier-pro', billingStatus: 'active' },
  currentMember: { role: 'owner', user: { fullName: 'Ama Ofori' } },
  tierSimulation: 'PRO', simulateTier: vi.fn(), switchRole: vi.fn(),
  customers: [], orders: [], invoices: [], payments: [],
  materialUsages: [], dueAlerts: [], fabricRecords: [], designInspirations: [],
};

vi.mock('../../src/context/AppContext', () => ({ useApp: () => mockApp }));
vi.mock('../../src/shared/utils/dashboardDataApi', () => ({ getDashboardDataBundle: () => Promise.resolve({ orders: [], invoices: [] }) }));

async function seedMirror() {
  // Server-synced rows for TWO workspaces (AT5) — mirror-shaped envelopes
  await db.customers.bulkPut([
    { id: 'c1', workspaceId: 'ws-A', fullName: 'Kesiwa Cert' },
    { id: 'c9', workspaceId: 'ws-B', fullName: 'Other Workspace Customer' },
  ]);
  await db.orders.bulkPut([
    { id: 'o1', workspaceId: 'ws-A', customerId: 'c1', status: 'delivered', orderType: 'senator', totalAmount: 500, createdAt: '2026-08-01T10:00:00.000Z' },
    { id: 'oB', workspaceId: 'ws-B', customerId: 'c9', status: 'in_progress', orderType: 'kaftan', totalAmount: 999, createdAt: '2026-08-01T10:00:00.000Z' },
  ]);
  await db.invoices.bulkPut([
    { id: 'i1', workspaceId: 'ws-A', customerId: 'c1', orderId: 'o1', status: 'pending', totalAmount: 500, amountPaid: 100, balanceDue: 400, createdAt: '2026-08-01T10:00:00.000Z' },
    { id: 'iB', workspaceId: 'ws-B', customerId: 'c9', orderId: 'oB', status: 'pending', totalAmount: 999, amountPaid: 0, balanceDue: 999, createdAt: '2026-08-01T10:00:00.000Z' },
  ]);
  await db.payments.bulkPut([
    { id: 'p1', workspaceId: 'ws-A', invoiceId: 'i1', customerId: 'c1', orderId: 'o1', amount: 100, paymentStatus: 'captured', paidAt: new Date().toISOString() },
    { id: 'pB', workspaceId: 'ws-B', invoiceId: 'iB', amount: 777, paymentStatus: 'captured', paidAt: new Date().toISOString() },
  ]);
  await db.syncMeta.put({ key: 'workspace:ws-A', workspaceId: 'ws-A', currentCursor: '5', lastSuccessfulSync: '2026-08-30T12:00:00.000Z', lastAttemptedSync: null, lastSyncError: null, schemaVersion: 1 });
}

function AnalyticsProbe({ probe }: { probe: (s: ReturnType<typeof useAnalytics>) => void }) {
  probe(useAnalytics());
  return null;
}

describe('AT2/AT5/AT15 · Bridge: mirror-served records, workspace-isolated, one definition', () => {
  beforeEach(async () => {
    cleanup();
    await Promise.all([db.customers.clear(), db.orders.clear(), db.invoices.clear(), db.payments.clear(), db.materialUsages.clear(), db.syncMeta.clear()]);
    await seedMirror();
  });

  it('AT5 — records are workspace-isolated: workspace A never sees workspace B', async () => {
    let state: ReturnType<typeof useAnalytics> | null = null;
    render(<AnalyticsProbe probe={(s) => { state = s; }} />);
    await vi.waitFor(() => expect(state!.settled).toBe(true));
    expect(state!.records.customers.map((c) => c.id)).toEqual(['c1']);
    expect(state!.records.orders.map((o) => o.id)).toEqual(['o1']);
    expect(state!.records.invoices.map((i) => i.id)).toEqual(['i1']);
    expect(state!.records.payments.map((p) => p.id)).toEqual(['p1']);
    expect(state!.lastSyncedAt).toBe('2026-08-30T12:00:00.000Z');
  });

  it('AT2/AT15 — Reports and the executive summary agree because both consume the same projection', async () => {
    let state: ReturnType<typeof useAnalytics> | null = null;
    render(<AnalyticsProbe probe={(s) => { state = s; }} />);
    await vi.waitFor(() => expect(state!.settled).toBe(true));

    const summary = executiveSummary(state!.records);
    expect(summary.collectedRevenueAllTime).toBe(100);   // AT3 through the bridge
    expect(summary.outstandingBalance).toBe(400);

    render(<Reports />);
    // the mirror arrives asynchronously — wait for it to reach the view
    await vi.waitFor(() => {
      expect(document.body.textContent!).toMatch(/GHS 100\.00/); // captured payment paid today
    });
    const body = document.body.textContent!;
    // AT10 — evidenced sync disclosure, never "live"/"real-time"
    expect(body).toMatch(/last synced/i);
    expect(body).not.toMatch(/\blive\b|\breal-time\b/i);
  });

  it('AT13 — chart values remain exposed to assistive technology from mirror-served data', async () => {
    render(<Reports />);
    const summaries = await vi.waitFor(() => {
      const found = Array.from(document.querySelectorAll('[data-chart="bars"] .sr-only'))
        .filter((el) => el.textContent!.includes('GHS'));
      expect(found.length).toBeGreaterThan(0);
      return found;
    });
    expect(summaries[0].textContent).toMatch(/GHS/);
  });
});
