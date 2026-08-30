/**
 * Phase 18 — Stage 10 Production & Finance tests (PW/FN/X namespaces).
 * jsdom + RTL. The VIEWS are real; the API layer is mocked to the VERIFIED
 * backend contracts (productionStageService transition rules; transactional
 * idempotent POST /payments; invoice fields backend-computed).
 */

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

/* ── Contract mocks ─────────────────────────────────────────────────────── */
const NINE = ['measurement', 'cutting', 'sewing', 'embroidery', 'first_fitting', 'second_fitting', 'final_press', 'ready', 'delivered'];
const stage = (code: string, status: string, seq: number, extra: Partial<{ notes: string }> = {}) => ({
  id: `${code}-id`, code, label: code, sequence: seq, status,
  startedAt: null, completedAt: null, skippedAt: null, reopenedAt: null,
  notes: extra.notes ?? '', assignedTo: null, createdAt: '', updatedAt: '',
});

type OrderFixture = {
  id: string; orderNumber: string; customerId: string; status: string;
  garmentType: string; dueDate: string | null; currency: string;
  measurementSnapshot: unknown; productionStages: unknown;
};
const order = (over: Partial<OrderFixture> & { id: string }): OrderFixture => ({
  orderNumber: 'SF-1001', customerId: 'c1', status: 'in_progress', garmentType: 'kaftan',
  dueDate: null, currency: 'GHS', measurementSnapshot: null, productionStages: [],
  ...over,
});

let ordersMock: OrderFixture[] = [];
let transitionMock = vi.fn();
let noteMock = vi.fn();
let invoicesMock: Array<{ id: string; invoiceNumber: string; customerId: string; orderId: string | null; status: string; totalAmount: number; amountPaid: number; balanceDue: number; currency: string; dueDate: string | null; notes: string; createdAt: string }>;
let paymentsMock: Array<{ id: string; invoiceId: string; customerId: string; orderId: string | null; amount: number; method: string; referenceCode: string; paymentStatus: string; paidAt: string; notes: string; createdAt: string; duplicate?: boolean }>;
let submitPaymentMock = vi.fn();
const setViewMock = vi.fn();
const profilesMock: Array<unknown> = [];

vi.mock('@shared/api/orders', () => ({ fetchOrders: vi.fn(() => Promise.resolve(ordersMock)) }));
let fetchStagesMock = vi.fn();
vi.mock('@shared/api/productionStages', () => ({
  fetchOrderProductionStages: (...a: unknown[]) => fetchStagesMock(...a),
  transitionOrderProductionStage: (...a: unknown[]) => transitionMock(...a),
  addOrderProductionStageNote: (...a: unknown[]) => noteMock(...a),
}));
vi.mock('@shared/api/invoices', () => ({
  fetchInvoices: vi.fn(() => Promise.resolve(invoicesMock)),
  createInvoice: vi.fn(),
  updateInvoice: vi.fn(),
}));
vi.mock('@shared/api/payments', () => ({
  fetchPayments: () => Promise.resolve(paymentsMock),
  fetchInvoicePayments: () => Promise.resolve(paymentsMock),
  createPayment: vi.fn(),
  submitPaymentWithOfflineFallback: (...a: unknown[]) => submitPaymentMock(...a),
}));
vi.mock('@shared/utils/customerApi', () => ({
  getCustomers: () => Promise.resolve([{ id: 'c1', fullName: 'Abena Ofori', phone: '', email: '', address: '', notes: '', createdAt: '' }]),
}));
vi.mock('../../src/context/AppContext', () => ({ useApp: () => ({
  setView: setViewMock,
  getCustomerMeasurementProfiles: () => profilesMock,
  currentWorkspace: { id: 'ws1', name: 'Accra Atelier', defaultCurrency: 'GHS' },
}) }));

import { ProductionView } from '../../src/modules/production/ProductionView';
import { FinanceView } from '../../src/modules/finance/FinanceView';

const invoice = (over: Record<string, unknown> & { id: string }) => ({
  invoiceNumber: 'INV-1001', customerId: 'c1', orderId: null, status: 'partial',
  totalAmount: 400, amountPaid: 150, balanceDue: 250, currency: 'GHS',
  dueDate: null, notes: '', createdAt: '', ...over,
});

beforeEach(() => {
  ordersMock = []; invoicesMock = []; paymentsMock = [];
  transitionMock = vi.fn(); noteMock = vi.fn(); submitPaymentMock = vi.fn(); fetchStagesMock = vi.fn();
  setViewMock.mockClear();
});
afterEach(() => cleanup());

/* ── PRODUCTION ─────────────────────────────────────────────────────────── */
describe('PW1–PW3 · Canonical lifecycle on the board', () => {
  it('renders every canonical stage group with all NINE stages individually identified', async () => {
    ordersMock = [order({ id: 'o1', productionStages: [stage('measurement', 'completed', 1), stage('cutting', 'active', 2), ...NINE.slice(2).map((c, i) => stage(c, 'pending', i + 3))] })];
    render(<ProductionView />);
    await waitFor(() => expect(document.querySelector('[data-board="production"]')).toBeTruthy());
    fireEvent.click(document.querySelector('[data-order-card="o1"]')!);
    await waitFor(() => expect(document.querySelector('[data-pane="production-detail"]')).toBeTruthy());
    // PW2: all NINE canonical stages remain individually represented
    for (const code of NINE) expect(document.querySelector(`[data-stage-code="${code}"]`)).toBeTruthy();
    // PW3/PW7: the Fitting visual group keeps first_fitting and second_fitting separate
    expect(screen.getByText(/First Fitting — /)).toBeTruthy();
    expect(screen.getByText(/Second Fitting — /)).toBeTruthy();
  });
  it('groups are presentation-only — card carries the exact canonical code', async () => {
    ordersMock = [order({ id: 'o1', productionStages: NINE.map((c, i) => stage(c, i === 0 ? 'completed' : 'pending', i + 1)) })];
    render(<ProductionView />);
    await waitFor(() => expect(document.querySelector('[data-order-card="o1"]')).toBeTruthy());
    expect(document.querySelector('[data-order-card="o1"]')!.getAttribute('data-stage-code')).toBe('cutting');
  });
});

describe('PW4–PW6 · Current stage, explicit transitions, nothing fabricated', () => {
  const openAt = (code: string) => NINE.map((c, i) => {
    const idx = NINE.indexOf(code);
    return stage(c, i < idx ? 'completed' : i === idx ? 'active' : 'pending', i + 1);
  });
  it('PW4 shows the correct current stage; PW5 the destination is named', async () => {
    ordersMock = [order({ id: 'o1', productionStages: openAt('sewing') })];
    render(<ProductionView />);
    await waitFor(() => expect(document.querySelector('[data-order-card="o1"]')).toBeTruthy());
    const badge = document.querySelector('[data-order-card="o1"] [data-stage-badge="sewing"]');
    expect(badge).toBeTruthy();
    expect(badge!.textContent).toContain('Sewing');
    fireEvent.click(document.querySelector('[data-order-card="o1"]')!);
    await waitFor(() => expect(document.querySelector('[data-pane="production-detail"]')).toBeTruthy());
    expect(screen.getByText(/Complete Sewing — Embroidery becomes active/)).toBeTruthy();
  });
  it('PW6 only the current open stage is actionable — no fabricated backward button', async () => {
    ordersMock = [order({ id: 'o1', productionStages: openAt('sewing') })];
    render(<ProductionView />);
    await waitFor(() => expect(document.querySelector('[data-order-card="o1"]')).toBeTruthy());
    fireEvent.click(document.querySelector('[data-order-card="o1"]')!);
    await waitFor(() => expect(document.querySelector('[data-pane="production-detail"]')).toBeTruthy());
    // Reopen exists ONLY on completed/skipped stages (verified backend rule)
    expect(document.querySelector('[data-action="reopen-measurement"]')).toBeTruthy();
    expect(document.querySelector('[data-action="reopen-sewing"]')).toBeNull();
    expect(document.querySelector('[data-action="reopen-embroidery"]')).toBeNull();
    // Start only when the open stage is pending — here it is active:
    expect(screen.queryByRole('button', { name: /Start / })).toBeNull();
  });
  it('transition calls the verified endpoint contract and consumes the authoritative response', async () => {
    ordersMock = [order({ id: 'o1', productionStages: openAt('sewing') })];
    transitionMock.mockResolvedValue({ orderStatus: 'in_progress', productionStages: openAt('embroidery') });
    render(<ProductionView />);
    await waitFor(() => expect(document.querySelector('[data-order-card="o1"]')).toBeTruthy());
    fireEvent.click(document.querySelector('[data-order-card="o1"]')!);
    fireEvent.click(screen.getByRole('button', { name: /Complete Sewing/ }));
    await waitFor(() => expect(transitionMock).toHaveBeenCalledWith('o1', 'sewing', 'complete'));
    // The detail consumes the AUTHORITATIVE server response — the open stage
    // is now Embroidery and the action names the next destination from it:
    await waitFor(() => expect(screen.getByRole('button', { name: /Complete Embroidery — First Fitting becomes active/ })).toBeTruthy());
  });
  it('backend rejection surfaces an honest error; nothing is claimed successful', async () => {
    ordersMock = [order({ id: 'o1', productionStages: openAt('sewing') })];
    transitionMock.mockRejectedValue(new Error('HTTP 400: Only an active stage can be completed'));
    render(<ProductionView />);
    await waitFor(() => expect(document.querySelector('[data-order-card="o1"]')).toBeTruthy());
    fireEvent.click(document.querySelector('[data-order-card="o1"]')!);
    fireEvent.click(screen.getByRole('button', { name: /Complete Sewing/ }));
    await waitFor(() => expect(screen.getByText(/Only an active stage can be completed/)).toBeTruthy());
  });
  it('skip requires confirmation and states the consequence + reopen path', async () => {
    ordersMock = [order({ id: 'o1', productionStages: openAt('sewing') })];
    render(<ProductionView />);
    await waitFor(() => expect(document.querySelector('[data-order-card="o1"]')).toBeTruthy());
    fireEvent.click(document.querySelector('[data-order-card="o1"]')!);
    fireEvent.click(screen.getByRole('button', { name: /Skip Sewing/ }));
    expect(document.querySelector('[data-dialog="confirm-skip"]')!.textContent).toContain('reopens every stage after it');
    fireEvent.click(screen.getByRole('button', { name: 'Skip stage' }));
    await waitFor(() => expect(transitionMock).toHaveBeenCalledWith('o1', 'sewing', 'skip'));
  });
  it('reopen states the VERIFIED cascade semantics', async () => {
    ordersMock = [order({ id: 'o1', productionStages: openAt('sewing') })];
    render(<ProductionView />);
    await waitFor(() => expect(document.querySelector('[data-order-card="o1"]')).toBeTruthy());
    fireEvent.click(document.querySelector('[data-order-card="o1"]')!);
    fireEvent.click(document.querySelector('[data-action="reopen-measurement"]')!);
    expect(document.querySelector('[data-dialog="confirm-reopen"]')!.textContent).toContain('every stage after it');
    fireEvent.click(screen.getByRole('button', { name: 'Reopen for rework' }));
    await waitFor(() => expect(transitionMock).toHaveBeenCalledWith('o1', 'measurement', 'reopen'));
  });
});

describe('PW8–PW11 · Snapshot, intelligence subordination, honest missing data', () => {
  const snapOrder = order({
    id: 'o1', garmentType: 'trouser',
    measurementSnapshot: { profileLabel: 'Wedding fitting', waist: 74, hip: 100 },
    productionStages: NINE.map((c, i) => stage(c, i === 0 ? 'completed' : 'pending', i + 1)),
  });
  it('PW8 production reads the ORDER SNAPSHOT, not the live profile', async () => {
    profilesMock.push({ id: 'p-now', label: 'Today', updatedAt: new Date(), measurements: { waist: 99 } });
    ordersMock = [snapOrder];
    render(<ProductionView />);
    await waitFor(() => expect(document.querySelector('[data-order-card="o1"]')).toBeTruthy());
    fireEvent.click(document.querySelector('[data-order-card="o1"]')!);
    const ctx = await waitFor(() => {
      const el = document.querySelector('[data-intelligence="deterministic"]');
      expect(el).toBeTruthy(); return el!;
    });
    expect(ctx.textContent).toContain('Profile at confirm: Wedding fitting');
    // X6: drift is SURFACED, never applied:
    expect(ctx.textContent).toContain('Customer measurements have changed');
    expect(ctx.textContent).toContain('production reads the snapshot');
    profilesMock.length = 0;
  });
  it('PW9/PW10 advisory is visible and subordinate — no stage actions inside intelligence cards', async () => {
    ordersMock = [snapOrder];
    render(<ProductionView />);
    await waitFor(() => expect(document.querySelector('[data-order-card="o1"]')).toBeTruthy());
    fireEvent.click(document.querySelector('[data-order-card="o1"]')!);
    await waitFor(() => expect(document.querySelector('[data-intelligence="advisory"]')).toBeTruthy());
    for (const card of Array.from(document.querySelectorAll('[data-intelligence]'))) {
      for (const btn of Array.from(card.querySelectorAll('button'))) {
        expect(btn.textContent ?? '').not.toMatch(/start|complete|skip|reopen|record payment/i);
      }
    }
  });
  it('PW11 no invoice → honest missing-data notice, no fabricated money', async () => {
    ordersMock = [order({ id: 'o1', productionStages: [stage('measurement', 'active', 1), ...NINE.slice(1).map((c, i) => stage(c, 'pending', i + 2))] })];
    render(<ProductionView />);
    await waitFor(() => expect(document.querySelector('[data-order-card="o1"]')).toBeTruthy());
    fireEvent.click(document.querySelector('[data-order-card="o1"]')!);
    await waitFor(() => expect(document.querySelector('[data-notice="missing-data"]')).toBeTruthy());
    expect(document.querySelector('[data-view="production"]')!.textContent).not.toMatch(/GH₵|GHS\s*\d/);
  });
});

describe('PW15 · Lazy stage initialisation (VERIFIED backend contract)', () => {
  it('a stage-less confirmed order is hydrated via the seeding GET endpoint', async () => {
    ordersMock = [order({ id: 'o1', productionStages: [] })];
    fetchStagesMock.mockResolvedValue(NINE.map((c, i) => stage(c, i === 0 ? 'active' : 'pending', i + 1)));
    render(<ProductionView />);
    await waitFor(() => expect(document.querySelector('[data-order-card="o1"]')).toBeTruthy());
    expect(fetchStagesMock).toHaveBeenCalledWith('o1');
    // Seeded canonical nine consumed — order lands in Measurement with a Start action:
    expect(document.querySelector('[data-order-card="o1"]')!.getAttribute('data-stage-code')).toBe('measurement');
    fireEvent.click(document.querySelector('[data-order-card="o1"]')!);
    await waitFor(() => expect(screen.getByRole('button', { name: /Complete Measurement/ })).toBeTruthy());
  });
});

describe('PW12–PW14 · Real data, empty ≠ loading, retry', () => {
  it('PW13 loading is distinct from empty', async () => {
    ordersMock = [];
    const never = new Promise(() => {}) as Promise<never>;
    const { fetchOrders } = await import('@shared/api/orders');
    vi.mocked(fetchOrders).mockReturnValueOnce(never);
    render(<ProductionView />);
    // Loading: header present, board/empty NOT yet resolved
    expect(screen.getByRole('heading', { name: 'Production' })).toBeTruthy();
    expect(screen.queryByText('No active production')).toBeNull();
    cleanup();
    const { fetchOrders: fetchOrders2 } = await import('@shared/api/orders');
    vi.mocked(fetchOrders2).mockReturnValueOnce(Promise.resolve([]) as never);
    render(<ProductionView />);
    await waitFor(() => expect(screen.getByText('No active production')).toBeTruthy());
  });
  it('PW14 load failure offers retry', async () => {
    const { fetchOrders } = await import('@shared/api/orders');
    vi.mocked(fetchOrders).mockRejectedValueOnce(new Error('HTTP 500'));
    render(<ProductionView />);
    await waitFor(() => expect(screen.getByText(/Production could not be loaded/)).toBeTruthy());
    expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
  });
});

/* ── FINANCE ────────────────────────────────────────────────────────────── */
describe('FN1–FN3, FN7 · Authoritative invoice states and figures', () => {
  it('renders status/figures verbatim from the invoice contract (no recomputation)', async () => {
    invoicesMock = [invoice({ id: 'i1', status: 'partial', totalAmount: 400, amountPaid: 150, balanceDue: 250 })];
    render(<FinanceView />);
    const row = await waitFor(() => { const el = document.querySelector('[data-invoice="i1"]'); expect(el).toBeTruthy(); return el!; });
    expect(row.getAttribute('data-invoice-status')).toBe('partial');
    expect(row.textContent).toContain('Partial payment');
    expect(row.textContent).toContain('Balance GHS 250.00'); // authoritative balanceDue field
    expect(row.textContent).not.toContain('✓ Paid');
  });
  it('paid and balance are independently represented from separate fields', async () => {
    invoicesMock = [invoice({ id: 'i1', status: 'partial', totalAmount: 400, amountPaid: 150, balanceDue: 250 })];
    render(<FinanceView />);
    await waitFor(() => expect(document.querySelector('[data-invoice="i1"]')).toBeTruthy());
    const row = document.querySelector('[data-invoice="i1"]')!;
    expect(row.textContent).toMatch(/Paid GHS 150\.00/);
    expect(row.textContent).toMatch(/Balance GHS 250\.00/);
  });
});

describe('FN8–FN10 · Payment write integrity', () => {
  const setup = async () => {
    invoicesMock = [invoice({ id: 'i1', status: 'partial', totalAmount: 400, amountPaid: 150, balanceDue: 250, orderId: 'o1' })];
    render(<FinanceView />);
    await waitFor(() => expect(document.querySelector('[data-invoice="i1"]')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Record payment' }));
    await waitFor(() => expect(document.querySelector('[data-dialog="record-payment"]')).toBeTruthy());
  };
  const fill = () => {
    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/^Method/), { target: { value: 'cash' } });
    fireEvent.change(screen.getByLabelText(/Payment reference/), { target: { value: 'R-1' } });
  };
  it('FN8 success only after server confirmation; idempotency key attached', async () => {
    await setup(); fill();
    submitPaymentMock.mockResolvedValue({ status: 'confirmed', payment: { id: 'p1', amount: 100 } });
    fireEvent.click(document.querySelector('[data-action="submit-payment"]')!);
    await waitFor(() => expect(screen.getByText(/Payment recorded and the invoice balance updated/)).toBeTruthy());
    const payload = submitPaymentMock.mock.calls[0][1] as Record<string, unknown>;
    expect(typeof payload.clientMutationId).toBe('string');
  });
  it('FN10 replayed idempotency key → honest duplicate acknowledgement, not a second success', async () => {
    await setup(); fill();
    submitPaymentMock.mockResolvedValue({ status: 'confirmed', payment: { id: 'p1', duplicate: true } });
    fireEvent.click(document.querySelector('[data-action="submit-payment"]')!);
    await waitFor(() => expect(screen.getByText(/already recorded — acknowledged, nothing was recorded twice/)).toBeTruthy());
  });
  it('offline queue outcome is honest (never "synced")', async () => {
    await setup(); fill();
    submitPaymentMock.mockResolvedValue({ status: 'queued-offline', clientMutationId: 'k1' });
    fireEvent.click(document.querySelector('[data-action="submit-payment"]')!);
    await waitFor(() => expect(screen.getByText(/queued — it will be submitted once you are online/)).toBeTruthy());
    expect(document.querySelector('[data-view="finance"]')!.textContent).not.toMatch(/synced/i);
  });
  it('FN9 server rejection shows failure — no success state', async () => {
    await setup(); fill();
    submitPaymentMock.mockRejectedValue(new Error('HTTP 400: Payment exceeds invoice total'));
    fireEvent.click(document.querySelector('[data-action="submit-payment"]')!);
    await waitFor(() => expect(screen.getByText(/Payment exceeds invoice total/)).toBeTruthy());
    expect(screen.queryByText(/Payment recorded/)).toBeNull();
    // dialog remains open for correction:
    expect(document.querySelector('[data-dialog="record-payment"]')).toBeTruthy();
  });
  it('validation rejects non-positive amounts client-side before any write', async () => {
    await setup();
    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/^Method/), { target: { value: 'cash' } });
    fireEvent.change(screen.getByLabelText(/Payment reference/), { target: { value: 'R-1' } });
    fireEvent.click(document.querySelector('[data-action="submit-payment"]')!);
    await waitFor(() => expect(screen.getByText(/amount greater than zero/)).toBeTruthy());
    expect(submitPaymentMock).not.toHaveBeenCalled();
  });
});

describe('FN11–FN12 · Empty vs error in finance', () => {
  it('FN11 honest empty state with a real next action', async () => {
    invoicesMock = [];
    render(<FinanceView />);
    await waitFor(() => expect(screen.getByText('No invoices yet')).toBeTruthy());
  });
  it('FN12 load error is distinguishable from a zero balance', async () => {
    const { fetchInvoices } = await import('@shared/api/invoices');
    vi.mocked(fetchInvoices).mockRejectedValueOnce(new Error('HTTP 500'));
    render(<FinanceView />);
    await waitFor(() => expect(screen.getByText(/Finance could not be loaded/)).toBeTruthy());
    expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
  });
});

/* ── CROSS-DOMAIN (§22 matrix, §23 policy) ──────────────────────────────── */
describe('X1–X5 · Production ≠ Finance independence', () => {
  const openAt = (code: string, status = 'active') => NINE.map((c, i) => {
    const idx = NINE.indexOf(code);
    return stage(c, i < idx ? 'completed' : i === idx ? status : 'pending', i + 1);
  });
  it('X1 READY + UNPAID and X2 PAID + in production are both representable', async () => {
    ordersMock = [
      order({ id: 'o-ready', orderNumber: 'SF-READY', productionStages: openAt('ready') }),
      order({ id: 'o-sewing', orderNumber: 'SF-SEWING', productionStages: openAt('sewing') }),
    ];
    invoicesMock = [
      invoice({ id: 'i1', orderId: 'o-ready', status: 'sent', amountPaid: 0, balanceDue: 400 }),
      invoice({ id: 'i2', orderId: 'o-sewing', status: 'paid', amountPaid: 400, balanceDue: 0 }),
    ];
    render(<ProductionView />);
    await waitFor(() => expect(document.querySelector('[data-order-card="o-ready"]')).toBeTruthy());
    expect(document.querySelector('[data-order-card="o-ready"] [data-payment="sent"]')?.textContent).toContain('Payment outstanding');
    expect(document.querySelector('[data-order-card="o-sewing"] [data-payment="paid"]')?.textContent).toContain('Paid');
    expect(document.querySelector('[data-order-card="o-sewing"] [data-stage-badge="sewing"]')).toBeTruthy();
  });
  it('X3/X4 no payment gate on delivery — no invented policy blocks the transition', async () => {
    ordersMock = [order({ id: 'o1', productionStages: openAt('delivered') })];
    invoicesMock = [invoice({ id: 'i1', orderId: 'o1', status: 'sent', amountPaid: 0, balanceDue: 400 })];
    render(<ProductionView />);
    await waitFor(() => expect(document.querySelector('[data-order-card="o1"]')).toBeTruthy());
    fireEvent.click(document.querySelector('[data-order-card="o1"]')!);
    await waitFor(() => expect(screen.getByText(/Complete Delivered/)).toBeTruthy());
    // The delivery action exists regardless of unpaid balance; finance is CONTEXT only:
    expect(screen.getByText(/Complete Delivered/)).toHaveProperty('disabled', false);
    expect(document.querySelector('[data-intelligence="deterministic"] [data-view], [data-intelligence]')).toBeTruthy();
  });
  it('X5 advisory card contains no production or financial write actions', async () => {
    ordersMock = [order({ id: 'o1', measurementSnapshot: { waist: 40 }, productionStages: openAt('sewing') })];
    render(<ProductionView />);
    await waitFor(() => expect(document.querySelector('[data-order-card="o1"]')).toBeTruthy());
    fireEvent.click(document.querySelector('[data-order-card="o1"]')!);
    await waitFor(() => expect(document.querySelector('[data-intelligence="advisory"]')).toBeTruthy());
    const advisory = document.querySelector('[data-intelligence="advisory"]')!;
    expect(advisory.querySelectorAll('button').length).toBe(0); // not even Dismiss here: pure context
  });
});
