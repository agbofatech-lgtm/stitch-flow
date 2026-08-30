/**
 * Phase 18 — Stage 13 tests: capability reconciliation, reports integrity,
 * accessibility hardening contracts (CH namespace). jsdom + RTL; views real,
 * API mocked to VERIFIED contracts.
 */

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react';

/* ── Contracts ──────────────────────────────────────────────────────────── */
const customerFixture = { id: 'c1', fullName: 'Abena Ofori', phone: '+233200000001', email: 'a@x.com', address: '', notes: '', createdAt: '' };
let updateCustomerMock = vi.fn();
vi.mock('@shared/utils/customerApi', () => ({
  getCustomers: () => Promise.resolve([customerFixture]),
  createCustomer: vi.fn(),
  updateCustomer: (...a: unknown[]) => updateCustomerMock(...a),
}));
vi.mock('@shared/utils/customerOrdersApi', () => ({
  getCustomerOrders: vi.fn(() => Promise.resolve([
    { id: 'o1', orderNumber: 'SF-1001', status: 'in_progress', garmentType: 'Kaftan', dueDate: null },
  ])),
}));
vi.mock('../../src/components/CustomerDetail', () => ({ CustomerDetail: () => <div data-testid="customer-detail" /> }));
const mockApp = {
  currentView: 'customers', setView: vi.fn(),
  currentWorkspace: { id: 'ws1', name: 'Accra Atelier', ownerName: 'Ama O.', defaultCurrency: 'GHS', tier: { code: 'PRO', id: 'tier-pro' }, tierId: 'tier-pro', billingStatus: 'active' },
  currentMember: { role: 'owner', user: { fullName: 'Ama Ofori' } },
  tierSimulation: 'PRO', simulateTier: vi.fn(), switchRole: vi.fn(),
  customers: [customerFixture], addOrder: vi.fn(() => 'o2'), addCustomer: vi.fn(() => ({ success: true })),
  // Reports surface reads these from context (Stage 13 integrity tests):
  orders: [], invoices: [], payments: [], materialUsages: [], dueAlerts: [], fabricRecords: [] as unknown[], designInspirations: [],
  applyMeasurementProfileToOrder: vi.fn(), selectOrder: vi.fn(),
  getCustomerMeasurementProfiles: () => [], designInspirations: [], fabricRecords: [],
};
vi.mock('../../src/context/AppContext', () => ({ useApp: () => mockApp }));

import { createSeedData, createEmptySeedData } from '../../src/shared/lib/seedData' ;
import { createEmptySeedData as createEmptyFromDb } from '../../src/shared/lib/db';
import { CustomersView } from '../../src/modules/customers/CustomersView';
import { Reports } from '../../src/components/Reports';

beforeEach(() => { updateCustomerMock = vi.fn(); mockApp.setView.mockClear(); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

/* ══ CH1–CH3 · Reports demo-seed integrity (audit P1 → Outcome D+B) ═════ */
describe('CH1 · Operational initialization seeds EMPTY collections', () => {
  it('empty seed contains no demo business records (customers/orders/invoices/payments/materials)', () => {
    const empty = createEmptyFromDb();
    for (const key of ['customers', 'orders', 'invoices', 'payments', 'dueAlerts', 'fabricRecords', 'materialUsages', 'measurementProfiles'] as const) {
      expect(empty[key]).toEqual([]);
    }
  });
  it('the development fixture is retained (Outcome B) and still carries the demo roster', () => {
    const fixture = createSeedData();
    expect(fixture.customers.length).toBeGreaterThan(0);
    expect(fixture.orders.length).toBeGreaterThan(0);
    expect(fixture.payments.length).toBeGreaterThan(0);
  });
  it('workspace scaffolding (demo-tool ids) survives in the empty seed', () => {
    const empty = createEmptyFromDb();
    expect(empty.currentWorkspaceId).toBeTruthy();
    expect(empty.currentMemberId).toBeTruthy();
  });
});

/* ══ CH4–CH6 · Reports honest classification + accessible charts ════════ */
describe('CH4 · Reports data-source classification (§6.3)', () => {
  it('carries the "Locally calculated" scope notice and never claims live/synced', () => {
    render(<Reports />);
    const notice = document.querySelector('[data-reports-scope="local"]');
    expect(notice).toBeTruthy();
    expect(notice!.textContent).toMatch(/Locally calculated/);
    expect(document.body.textContent).not.toMatch(/\blive\b|\breal-time\b|\bsynced\b/i);
  });
});

describe('CH5 · Charts expose values to assistive technology (§21)', () => {
  it('charts with observations carry an sr-only per-chart value summary', () => {
    // one captured payment this month → the revenue charts take the bars branch
    mockApp.payments = [{
      id: 'p1', invoiceId: null, customerId: 'c1', orderId: null, amount: 500, method: 'cash',
      referenceCode: 'T-1', paymentStatus: 'captured', paidAt: new Date().toISOString(), notes: '', createdAt: '',
    } as never];
    render(<Reports />);
    const summaries = Array.from(document.querySelectorAll('[data-chart="bars"] .sr-only')).filter((el) => el.textContent!.includes(':'));
    expect(summaries.length).toBeGreaterThan(0);
    expect(summaries[0].textContent).toMatch(/GHS/);
    mockApp.payments = [];
  });
  it('charts with no observations show an honest empty state, not zero-bars (§6.4)', () => {
    render(<Reports />);
    const empty = Array.from(document.querySelectorAll('[data-chart-empty="true"]'));
    expect(empty.length).toBeGreaterThan(0);
    expect(empty[0].textContent).toMatch(/No data recorded yet/);
  });
});

/* ══ CH7–CH9 · Customer edit reachability (audit P2 reconciliation) ══════ */
describe('CH7 · Customer edit capability is reachable again (§10.1)', () => {
  it('workspace exposes the edit action and mounts the existing validated modal', async () => {
    render(<CustomersView />);
    fireEvent.click(await screen.findByRole('button', { name: /Abena Ofori/ }));
    const edit = await screen.findByRole('button', { name: /Edit details/ });
    fireEvent.click(edit);
    const dialog = await screen.findByRole('dialog');
    expect(dialog.getAttribute('aria-label')).toMatch(/Edit/i);
    expect(within(dialog).getByLabelText(/full name/i)).toBeTruthy();
  });

  it('save calls the existing updateCustomer API and updates the workspace header', async () => {
    updateCustomerMock.mockResolvedValue({});
    render(<CustomersView />);
    fireEvent.click(await screen.findByRole('button', { name: /Abena Ofori/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Edit details/ }));
    const dialog = await screen.findByRole('dialog');
    const nameField = within(dialog).getByLabelText(/full name/i) as HTMLInputElement;
    fireEvent.change(nameField, { target: { value: 'Abena Ofori-Boateng' } });
    fireEvent.submit(within(dialog).getByRole('button', { name: /save|update/i }).closest('form')!);
    await waitFor(() => expect(updateCustomerMock).toHaveBeenCalled());
    expect(updateCustomerMock.mock.calls[0][0]).toBe('c1');
    await waitFor(() => expect(document.querySelector('[data-view="customer-workspace"]')!.textContent).toMatch(/Abena Ofori-Boateng/));
  });

  it('the edit modal is a keyboard-operable dialog: Escape closes (ModalShell DS behaviour)', async () => {
    render(<CustomersView />);
    fireEvent.click(await screen.findByRole('button', { name: /Abena Ofori/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Edit details/ }));
    await screen.findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
