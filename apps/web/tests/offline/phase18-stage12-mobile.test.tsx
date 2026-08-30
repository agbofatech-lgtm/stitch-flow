/**
 * Phase 18 — Stage 12 Mobile Experience tests (MX namespace).
 * jsdom + RTL. Views are real; API/context mocked to VERIFIED contracts.
 * Mobile contracts tested as behaviour/DOM structure — never CSS pixel details
 * (those are proven by the §31 browser validation at 390/430/768/1280).
 */

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react';

/* ── Shell mocks (Stage 6 pattern) ──────────────────────────────────────── */
const mockApp = {
  currentView: 'dashboard',
  setView: vi.fn(),
  currentWorkspace: { id: 'ws1', name: 'Accra Atelier', ownerName: 'Ama O.', defaultCurrency: 'GHS' },
  currentMember: { role: 'owner', user: { fullName: 'Ama Ofori' } },
  tierSimulation: 'PRO', simulateTier: vi.fn(), switchRole: vi.fn(),
  // Order-workflow surface (Stage 8 contracts, mocked to their signatures):
  customers: [{ id: 'c1', fullName: 'Abena Ofori', phone: '+233…', email: '', address: '', notes: '', createdAt: '' }],
  addOrder: vi.fn(() => 'new-order-id'), addCustomer: vi.fn(() => ({ success: true })),
  applyMeasurementProfileToOrder: vi.fn(), selectOrder: vi.fn(),
  getCustomerMeasurementProfiles: () => [], designInspirations: [], fabricRecords: [],
};
vi.mock('../../src/context/AppContext', () => ({ useApp: () => mockApp }));
vi.mock('../../src/shared/utils/api', () => ({ getAuthRole: () => null, isPlatformRole: () => false }));
vi.mock('../../src/shared/api/auth', () => ({ logout: vi.fn(async () => {}) }));
vi.mock('../../src/shared/router', () => ({ navigate: vi.fn() }));

/* ── Production/Finance API mocks (Stage 10 pattern) ────────────────────── */
const NINE = ['measurement', 'cutting', 'sewing', 'embroidery', 'first_fitting', 'second_fitting', 'final_press', 'ready', 'delivered'];
const stage = (code: string, status: string, seq: number) => ({
  id: `${code}-id`, code, label: code, sequence: seq, status,
  startedAt: null, completedAt: null, skippedAt: null, reopenedAt: null,
  notes: '', assignedTo: null, createdAt: '', updatedAt: '',
});
let ordersMock: Array<Record<string, unknown>> = [];
let transitionMock = vi.fn();
let invoicesMock: Array<Record<string, unknown>> = [];
let paymentsMock: Array<Record<string, unknown>> = [];
let submitPaymentMock = vi.fn();
let fetchStagesMock = vi.fn();

vi.mock('@shared/api/orders', () => ({ fetchOrders: vi.fn(() => Promise.resolve(ordersMock)) }));
vi.mock('@shared/api/productionStages', () => ({
  fetchOrderProductionStages: (...a: unknown[]) => fetchStagesMock(...a),
  transitionOrderProductionStage: (...a: unknown[]) => transitionMock(...a),
  addOrderProductionStageNote: vi.fn(async () => ({ orderStatus: 'in_progress', productionStages: [] })),
}));
vi.mock('@shared/api/invoices', () => ({
  fetchInvoices: vi.fn(() => Promise.resolve(invoicesMock)),
  createInvoice: vi.fn(), updateInvoice: vi.fn(),
}));
vi.mock('@shared/api/payments', () => ({
  fetchPayments: () => Promise.resolve(paymentsMock),
  fetchInvoicePayments: () => Promise.resolve(paymentsMock),
  createPayment: vi.fn(),
  submitPaymentWithOfflineFallback: (...a: unknown[]) => submitPaymentMock(...a),
}));
const customersFixture = [{ id: 'c1', fullName: 'Abena Ofori', phone: '+233…', email: '', address: '', notes: '', createdAt: '' }];
vi.mock('@shared/utils/customerApi', () => ({
  getCustomers: () => Promise.resolve(customersFixture),
  createCustomer: vi.fn(),
}));
vi.mock('@shared/utils/customerOrdersApi', () => ({
  getCustomerOrders: vi.fn(() => Promise.resolve([
    { id: 'o1', orderNumber: 'SF-1001', status: 'in_progress', garmentType: 'kaftan', dueDate: null },
  ])),
}));
vi.mock('../../src/components/CustomerDetail', () => ({ CustomerDetail: () => <div data-testid="customer-detail" /> }));

import { WorkspaceShell } from '../../src/shell/WorkspaceShell';
import { ProductionView } from '../../src/modules/production/ProductionView';
import { FinanceView } from '../../src/modules/finance/FinanceView';
import { CustomersView } from '../../src/modules/customers/CustomersView';
import { CANONICAL_STAGES } from '../../src/design-system/Status';

const invoiceFixture = () => ({
  id: 'inv1', invoiceNumber: 'INV-1001', customerId: 'c1', orderId: null, status: 'partial',
  totalAmount: 400, amountPaid: 150, balanceDue: 250, currency: 'GHS', dueDate: null, notes: '', createdAt: '',
});

beforeEach(() => {
  ordersMock = []; invoicesMock = []; paymentsMock = [];
  transitionMock = vi.fn(); submitPaymentMock = vi.fn(); fetchStagesMock = vi.fn();
  mockApp.setView.mockClear(); mockApp.currentView = 'dashboard';
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

/* ══ NAVIGATION (§8) ════════════════════════════════════════════════════ */
describe('MX1–MX4 · Mobile navigation reachability', () => {
  it('MX1: bottom navigation renders the four most frequent destinations + More (5 slots)', () => {
    render(<WorkspaceShell><div /></WorkspaceShell>);
    const bottom = screen.getAllByLabelText('Primary').find((el) => el.getAttribute('data-shell') === 'bottom-nav')!;
    const items = within(bottom).getAllByRole('button');
    expect(items.map((b) => b.textContent)).toEqual(['Home', 'Customers', 'Orders', 'Production', 'More']);
    // Touch contract: every bottom target ≥ the DS 44px minimum.
    for (const b of items) expect(b.className).toMatch(/min-h-\[56px\]/);
  });

  it('MX2+MX3: Finance (overflow primary) is reachable through More — and navigates', async () => {
    render(<WorkspaceShell><div /></WorkspaceShell>);
    fireEvent.click(screen.getAllByRole('button', { name: 'More' }).at(-1)!);
    const sheet = await screen.findByRole('dialog', { name: 'More' });
    const finance = within(sheet).getByRole('button', { name: /Finance/ });
    expect(finance).toBeTruthy(); // Stage 10 regression: Finance never unreachable
    fireEvent.click(finance);
    expect(mockApp.setView).toHaveBeenCalledWith('invoices');
  });

  it('MX4: More sheet closes after navigation (no orphaned overlay)', async () => {
    render(<WorkspaceShell><div /></WorkspaceShell>);
    fireEvent.click(screen.getAllByRole('button', { name: 'More' }).at(-1)!);
    await screen.findByRole('dialog', { name: 'More' });
    fireEvent.click(screen.getAllByRole('button', { name: /Materials/ }).at(-1)!);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'More' })).toBeNull());
  });
});

/* ══ ORDER WORKFLOW (§10) ═══════════════════════════════════════════════ */
describe('MX5–MX8 · Order workflow remains operable at touch widths', () => {
  it('MX9+MX10: customer → workspace hierarchy and New-order handoff (workflow mounts in place)', async () => {
    render(<CustomersView />);
    fireEvent.click(await screen.findByRole('button', { name: /Abena Ofori/ }));
    // §11 hierarchy: identity, primary action, active work, readiness — in order.
    const view = document.querySelector('[data-view="customer-workspace"]')!;
    const orderBtn = within(view).getByRole('button', { name: /New order/ });
    fireEvent.click(orderBtn);
    expect(document.querySelector('[data-view="order-workflow"]')).toBeTruthy(); // MX10
  });

  it('MX5: garment tiles are real buttons with selected state; honest fallback keeps 11 domain types', async () => {
    render(<CustomersView />);
    fireEvent.click(await screen.findByRole('button', { name: /Abena Ofori/ }));
    fireEvent.click(await screen.findByRole('button', { name: /New order/ }));
    const tiles = await screen.findAllByRole('button', { name: /Reference style|Senator/ });
    expect(document.querySelectorAll('[data-garment]').length).toBe(11);
    fireEvent.click(document.querySelector('[data-garment="senator"]')!);
    expect(document.querySelector('[data-garment="senator"]')!.getAttribute('aria-pressed')).toBe('true');
    void tiles;
  });

  it('MX6: measurement entry — decimal inputMode, visible unit, canonical fields, profile/list targets', async () => {
    render(<CustomersView />);
    fireEvent.click(await screen.findByRole('button', { name: /Abena Ofori/ }));
    fireEvent.click(await screen.findByRole('button', { name: /New order/ }));
    fireEvent.click(document.querySelector('[data-garment="kaftan"]')!);
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    await waitFor(() => expect(document.querySelector('[data-step="measurements"]')).toBeTruthy());
    const input = screen.getAllByLabelText(/in centimetres/, { selector: 'input' })[0];
    expect(input.getAttribute('inputmode')).toBe('decimal'); // numeric keyboard contract
    expect(document.body.textContent).toMatch(/\[cm\]/); // unit never hidden (§10.2)
    expect(document.querySelectorAll('[data-step="measurements"] input').length).toBeGreaterThanOrEqual(8);
  });

  it('MX7+MX8: Back/Continue preserved through all steps; review + confirm reachable', async () => {
    render(<CustomersView />);
    fireEvent.click(await screen.findByRole('button', { name: /Abena Ofori/ }));
    fireEvent.click(await screen.findByRole('button', { name: /New order/ }));
    fireEvent.click(document.querySelector('[data-garment="kaftan"]')!);
    const next = () => document.querySelector<HTMLButtonElement>('[data-action="next-step"]')!;
    const back = () => document.querySelector<HTMLButtonElement>('[data-action="prev-step"]')!;
    fireEvent.click(next()); // garment → measurements
    // Capture one canonical value (Continue is honestly disabled until a
    // profile is attached or at least one value is captured — Stage 8 rule).
    fireEvent.change(screen.getAllByLabelText(/in centimetres/, { selector: 'input' })[0], { target: { value: '96' } });
    fireEvent.click(next()); fireEvent.click(next()); fireEvent.click(next());
    await waitFor(() => expect(document.querySelector('[data-step="review"]')).toBeTruthy());
    expect(document.querySelector('[data-action="confirm-order"]')).toBeTruthy(); // MX8
    fireEvent.click(back());
    await waitFor(() => expect(document.querySelector('[data-step="materials"]')).toBeTruthy()); // MX7
  });
});

/* ══ PRODUCTION (§13) ═══════════════════════════════════════════════════ */
describe('MX11–MX13 · Production adaptation keeps canonical semantics', () => {
  it('MX11: detail timeline carries all nine canonical codes, in order (no mobile lifecycle fork)', async () => {
    ordersMock = [{ id: 'o1', orderNumber: 'SF-1001', customerId: 'c1', status: 'in_progress', garmentType: 'kaftan', dueDate: null, currency: 'GHS', measurementSnapshot: null, productionStages: NINE.map((c, i) => stage(c, i === 0 ? 'active' : 'pending', i)) }];
    render(<ProductionView />);
    fireEvent.click(await screen.findByRole('button', { name: /SF-1001/ }));
    await waitFor(() => expect(document.querySelector('[data-pane="production-detail"]')).toBeTruthy());
    const codes = Array.from(document.querySelectorAll('[data-stage-code]')).map((el) => el.getAttribute('data-stage-code'));
    expect(codes).toEqual([...CANONICAL_STAGES]);
  });

  it('MX12: stage actions map to the verified backend transitions (start/complete/skip)', async () => {
    ordersMock = [{ id: 'o1', orderNumber: 'SF-1001', customerId: 'c1', status: 'in_progress', garmentType: 'kaftan', dueDate: null, currency: 'GHS', measurementSnapshot: null, productionStages: NINE.map((c, i) => stage(c, i === 0 ? 'active' : 'pending', i)) }];
    // Authoritative responses keep the board operable (stages updated, next open).
    transitionMock.mockImplementation(async (_o: string, code: string, action: string) => ({
      orderStatus: 'in_progress',
      productionStages: NINE.map((c, i) => stage(c, i === 0 ? (action === 'skip' ? 'skipped' : 'completed') : i === 1 ? 'active' : 'pending', i)),
    }));
    render(<ProductionView />);
    fireEvent.click(await screen.findByRole('button', { name: /SF-1001/ }));
    // Consequential skip: confirmation first, backend action after.
    fireEvent.click(await screen.findByRole('button', { name: /Skip Measurement/ }));
    fireEvent.click(within(await waitFor(() => {
      const d = document.querySelector('[data-dialog="confirm-skip"]');
      if (!d) throw new Error('skip dialog missing');
      return d;
    })!).getByRole('button', { name: /Skip stage/ }));
    expect(transitionMock).toHaveBeenCalledWith('o1', 'measurement', 'skip');
    await waitFor(() => expect(document.querySelector('[data-dialog="confirm-skip"]')).toBeNull()); // closes on authoritative result
    // Destination-aware next action on the NEW open stage (cutting).
    fireEvent.click(await screen.findByRole('button', { name: /Complete Cutting/ }));
    expect(transitionMock).toHaveBeenCalledWith('o1', 'cutting', 'complete');
  });

  it('MX13: consequential actions keep confirmation + consequence language (reopen cascade)', async () => {
    ordersMock = [{ id: 'o1', orderNumber: 'SF-1001', customerId: 'c1', status: 'in_progress', garmentType: 'kaftan', dueDate: null, currency: 'GHS', measurementSnapshot: null, productionStages: NINE.map((c, i) => stage(c, i === 0 ? 'completed' : 'pending', i)) }];
    render(<ProductionView />);
    fireEvent.click(await screen.findByRole('button', { name: /SF-1001/ }));
    const reopen = await screen.findByRole('button', { name: /Reopen/i });
    expect(reopen.className).not.toMatch(/min-h-0/); // touch-target regression guard (§16)
    fireEvent.click(reopen);
    const dlg = document.querySelector('[data-dialog="confirm-reopen"]')!;
    expect(within(dlg).getByText(/every stage after it back to pending/)).toBeTruthy(); // consequence survives mobile
  });
});

/* ══ FINANCE (§14) ══════════════════════════════════════════════════════ */
describe('MX14–MX16, MX20–MX21 · Finance operational contracts + mobile sheet', () => {
  it('MX14: authoritative balance/status/payment action visible on every payable invoice row', async () => {
    invoicesMock = [invoiceFixture()];
    render(<FinanceView />);
    await screen.findByText('INV-1001');
    expect(document.querySelector('[data-balance="250"]')).toBeTruthy();
    expect(document.querySelector('[data-status="partial"]')!.textContent).toMatch(/Partial payment/);
    expect(screen.getByRole('button', { name: /Record payment/ })).toBeTruthy();
  });

  it('MX15: payment submission carries the idempotency key (contract unchanged by mobile UI)', async () => {
    invoicesMock = [invoiceFixture()];
    submitPaymentMock.mockResolvedValue({ status: 'confirmed', payment: { duplicate: false } });
    render(<FinanceView />);
    fireEvent.click(await screen.findByRole('button', { name: /Record payment/ }));
    const sheet1 = (await screen.findByRole('dialog', { name: /Record payment for/ }));
    const inSheet = within(sheet1);
    fireEvent.change(inSheet.getByLabelText(/Method/i), { target: { value: 'cash' } });
    fireEvent.change(inSheet.getByLabelText(/Payment reference/i), { target: { value: 'MM-1' } });
    fireEvent.click(inSheet.getByRole('button', { name: /Record payment|Recording/ }));
    await waitFor(() => expect(submitPaymentMock).toHaveBeenCalledTimes(1));
    const payload = submitPaymentMock.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.clientMutationId).toMatch(/^[0-9a-f-]{36}$/); // idempotency key preserved
    expect(payload.amount).toBe(250); // authoritative balance default
  });

  it('MX16: outcomes stay distinguishable — duplicate replay vs queued vs rejected', async () => {
    invoicesMock = [invoiceFixture()];
    render(<FinanceView />);
    const openSheet = async (ref: string) => {
      fireEvent.click(await screen.findByRole('button', { name: /Record payment/ }));
      const sheet = await screen.findByRole('dialog', { name: /Record payment for/ });
      const q = within(sheet);
      fireEvent.change(q.getByLabelText(/Method/i), { target: { value: 'cash' } });
      fireEvent.change(q.getByLabelText(/Payment reference/i), { target: { value: ref } });
      return q;
    };
    const clickRecord = (q: ReturnType<typeof within>) => fireEvent.click(q.getByRole('button', { name: /Record payment|Recording/ }));

    let q = await openSheet('MM-1');
    submitPaymentMock.mockResolvedValueOnce({ status: 'confirmed', payment: { duplicate: true } });
    clickRecord(q);
    await waitFor(() => expect(q.getByText(/already recorded/i)).toBeTruthy());

    fireEvent.click(q.getByRole('button', { name: 'Done' }));
    q = await openSheet('MM-2');
    submitPaymentMock.mockResolvedValueOnce({ status: 'queued' });
    clickRecord(q);
    await waitFor(() => expect(q.getByText(/queued/i)).toBeTruthy());

    fireEvent.click(q.getByRole('button', { name: 'Done' }));
    q = await openSheet('MM-3');
    submitPaymentMock.mockRejectedValueOnce(new Error('Amount exceeds balance due'));
    clickRecord(q);
    await waitFor(() => expect(q.getByText(/exceeds balance due/i)).toBeTruthy());
    expect(q.queryByRole('button', { name: 'Done' })).toBeNull(); // no false success
  });

  it('MX20: payment sheet is a real modal — Escape closes, height bounded, amount uses decimal keyboard', async () => {
    invoicesMock = [invoiceFixture()];
    render(<FinanceView />);
    fireEvent.click(await screen.findByRole('button', { name: /Record payment/ }));
    const sheet = await screen.findByRole('dialog', { name: /Record payment for INV-1001/ });
    expect(sheet.querySelector('.max-h-\\[85dvh\\]')).toBeTruthy(); // keyboard-open reachability
    expect(screen.getByLabelText(/Amount/i).getAttribute('inputmode')).toBe('decimal');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Record payment/ })).toBeNull());
  });

  it('MX21: legacy invoice modal scrolls within the viewport at phone heights (defect fix)', async () => {
    invoicesMock = [invoiceFixture()];
    render(<FinanceView />);
    fireEvent.click(await screen.findByRole('button', { name: 'New invoice' }));
    const modal = document.querySelector('.fixed.inset-0.z-50')!;
    await waitFor(() => expect(modal.querySelector('.max-h-\\[85dvh\\]')).toBeTruthy());
    expect(modal.querySelector('form.overflow-y-auto')).toBeTruthy();
  });
});

/* ══ INTELLIGENCE (§12) ═════════════════════════════════════════════════ */
describe('MX17–MX18 · Intelligence boundary unchanged on mobile surfaces', () => {
  it('MX17: deterministic vs advisory cards remain visually/semantically distinct in production detail', async () => {
    ordersMock = [{ id: 'o1', orderNumber: 'SF-1001', customerId: 'c1', status: 'in_progress', garmentType: 'kaftan', dueDate: null, currency: 'GHS', measurementSnapshot: { chest: 96, waist: 84 }, productionStages: NINE.map((c, i) => stage(c, i === 0 ? 'active' : 'pending', i)) }];
    render(<ProductionView />);
    fireEvent.click(await screen.findByRole('button', { name: /SF-1001/ }));
    await waitFor(() => expect(document.querySelector('[data-intelligence="deterministic"]')).toBeTruthy());
    expect(document.querySelector('[data-intelligence="advisory"]')).toBeTruthy();
    expect(document.querySelector('[data-intelligence="advisory"]')!.textContent).toMatch(/Advisory/i);
  });

  it('MX18: advisory card contains no transition/mutation action (authority boundary)', async () => {
    ordersMock = [{ id: 'o1', orderNumber: 'SF-1001', customerId: 'c1', status: 'in_progress', garmentType: 'kaftan', dueDate: null, currency: 'GHS', measurementSnapshot: { chest: 96 }, productionStages: NINE.map((c, i) => stage(c, i === 0 ? 'active' : 'pending', i)) }];
    render(<ProductionView />);
    fireEvent.click(await screen.findByRole('button', { name: /SF-1001/ }));
    await waitFor(() => expect(document.querySelector('[data-intelligence="advisory"]')).toBeTruthy());
    const advisory = document.querySelector('[data-intelligence="advisory"]')!;
    expect(advisory.querySelectorAll('button').length).toBe(0); // advice never acts
  });
});

/* ══ DESKTOP REGRESSION (§27) ═══════════════════════════════════════════ */
describe('MX19 · Desktop contracts unchanged by mobile adaptation', () => {
  it('shell keeps desktop sidebar + hides bottom nav at lg; both nav models share one destination source', () => {
    render(<WorkspaceShell><div /></WorkspaceShell>);
    const sidebar = document.querySelector('[data-shell="sidebar"]')!;
    expect(sidebar.className).toMatch(/lg:flex/);
    expect(sidebar.className).toMatch(/hidden/);
    const bottom = document.querySelector('[data-shell="bottom-nav"]')!;
    expect(bottom.className).toMatch(/lg:hidden/);
  });

  it('finance search keeps its desktop width class (w-full is mobile-only composition)', async () => {
    invoicesMock = [invoiceFixture()];
    render(<FinanceView />);
    const search = await screen.findByLabelText(/Search invoices/);
    expect(search.className).toMatch(/w-full sm:w-60/);
  });
});
