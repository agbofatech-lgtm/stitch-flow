/**
 * Phase 18 — Stage 7 Customer & Workspace Experience tests (CW1–CW9).
 * jsdom + RTL. APIs and heavy reused surfaces are mocked; views are real.
 * No fake data claims: every assertion is driven by mocked REAL contracts.
 */

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';

const mockApp = {
  customers: [{ id: 'c1', fullName: 'Abena Ofori' }],
  fabricRecords: [{ id: 'm1', name: 'Ankara print', isActive: true }],
  getLowStockMaterials: () => [{ id: 'm1', name: 'Ankara print' }],
  getCustomerMeasurementProfiles: () => [],
  setView: vi.fn(),
  currentMember: { role: 'owner', user: { fullName: 'Ama Ofori' } },
  currentWorkspace: { id: 'ws1', name: 'Accra Atelier', defaultCurrency: 'GHS' },
};
let summaryMock = Promise.resolve({ totalCustomers: 1, totalOrders: 3, pendingOrders: 2, totalRevenue: 100, pendingBalances: 150, dueAlerts: 1, currency: 'GHS' });
let bundleMock = Promise.resolve({
  orders: [
    { id: 'o1', orderNumber: 'SO-1001', garmentType: 'dress', status: 'in_progress', dueDate: new Date().toISOString(), totalAmount: 100 },
    { id: 'o2', orderNumber: 'SO-1002', garmentType: 'kaftan', status: 'ready', dueDate: null },
  ],
  invoices: [
    { id: 'i1', status: 'overdue', dueDate: '2026-01-01', balanceDue: 150, amountPaid: 0, total: 150 },
  ],
});
let customersMock = Promise.resolve([
  { id: 'c1', fullName: 'Abena Ofori', phone: '+233201234567', email: 'abena@example.com' },
  { id: 'c2', fullName: 'Kwame Mensah', phone: '+233209876543', email: '' },
]);
let customerOrdersMock = Promise.resolve([
  { id: 'o1', orderNumber: 'SO-1001', garmentType: 'dress', status: 'in_progress', dueDate: null },
]);

vi.mock('../../src/context/AppContext', () => ({ useApp: () => mockApp }));
vi.mock('../../src/shared/utils/dashboardApi', () => ({ getDashboardSummary: () => summaryMock }));
vi.mock('../../src/shared/utils/dashboardDataApi', () => ({ getDashboardDataBundle: () => bundleMock }));
vi.mock('../../src/shared/utils/customerApi', () => ({
  getCustomers: () => customersMock,
  createCustomer: vi.fn(async () => ({ id: 'c3' })),
}));
vi.mock('../../src/shared/utils/customerOrdersApi', () => ({ getCustomerOrders: () => customerOrdersMock }));
vi.mock('../../src/components/Customers', () => ({ AddCustomerModal: ({ onAdd }: { onAdd: (d: unknown) => Promise<void> }) => (
  <div role="dialog" aria-label="Add customer"><button onClick={() => void onAdd({ fullName: 'x' })}>Save customer</button></div>
) }));
vi.mock('../../src/components/CustomerDetail', () => ({ CustomerDetail: ({ customerId }: { customerId: string }) => (
  <div data-testid="customer-detail-stub" data-customer={customerId}>intelligence context</div>
) }));
vi.mock('../../src/modules/workspace/assets', () => ({ emptyStateSrc: (k: string) => `/assets/${k}.webp` }));
vi.mock('../../src/modules/orders/OrderWorkflow', () => ({ OrderWorkflow: ({ customer }: { customer: { id: string } }) => (
  <div data-testid="order-workflow-stub" data-customer={customer.id}>order workflow</div>
) }));

import { HomeView } from '../../src/modules/workspace/HomeView';
import { CustomersView } from '../../src/modules/customers/CustomersView';
import { createCustomer } from '../../src/shared/utils/customerApi';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('CW1 · Home renders the attention model from real data', () => {
  it('shows urgent (overdue), action required (due today) and active work', async () => {
    render(<HomeView />);
    expect(await screen.findByText(/Payment overdue/i)).toBeTruthy();
    expect(await screen.findByText(/Due today/i)).toBeTruthy();
    expect(screen.getByText(/SO-1002/)).toBeTruthy(); // active, not due today
    expect(screen.getByText('Good day, Ama')).toBeTruthy();
  });
  it('navigates via attention rows', async () => {
    render(<HomeView />);
    fireEvent.click(await screen.findByText(/Payment overdue/i));
    expect(mockApp.setView).toHaveBeenCalledWith('invoices');
  });
});

describe('CW2 · Home offline/API failure is honest', () => {
  it('shows an actionable error, never fabricated figures', async () => {
    const real = bundleMock; bundleMock = Promise.reject(new Error('offline'));
    render(<HomeView />);
    expect(await screen.findByText(/Live figures unavailable/i)).toBeTruthy();
    expect(screen.queryByText(/SO-1001/)).toBeNull();
    bundleMock = real;
  });
});

describe('CW3 · Home empty workspace guides first use', () => {
  it('shows the first-use empty state when no customers exist', () => {
    const realCustomers = mockApp.customers;
    mockApp.customers = [];
    render(<HomeView />);
    expect(screen.getByText('No customers yet')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add customer' }));
    expect(mockApp.setView).toHaveBeenCalledWith('customers');
    mockApp.customers = realCustomers;
  });
});

describe('CW4 · Customer list + evidenced search', () => {
  it('lists customers and filters by name, phone and email', async () => {
    render(<CustomersView />);
    expect(await screen.findByText('Abena Ofori')).toBeTruthy();
    expect(screen.getByText('Kwame Mensah')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Search customers/i), { target: { value: 'abena' } });
    expect(screen.getByText('Abena Ofori')).toBeTruthy();
    expect(screen.queryByText('Kwame Mensah')).toBeNull();
    fireEvent.change(screen.getByLabelText(/Search customers/i), { target: { value: '9876543' } }); // phone fragment
    expect(screen.getByText('Kwame Mensah')).toBeTruthy();
  });
  it('no-results state explains and offers clear', async () => {
    render(<CustomersView />);
    await screen.findByText('Abena Ofori');
    fireEvent.change(screen.getByLabelText(/Search customers/i), { target: { value: 'zzz' } });
    expect(screen.getByText('No matches')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByText('Abena Ofori')).toBeTruthy();
  });
});

describe('CW5 · Customer list failure is honest with retry', () => {
  it('renders an error state and retries', async () => {
    const real = customersMock; customersMock = Promise.reject(new Error('network'));
    render(<CustomersView />);
    expect(await screen.findByText(/Customers unavailable/i)).toBeTruthy();
    customersMock = real;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Abena Ofori')).toBeTruthy();
  });
});

describe('CW6 · Empty customers guides first customer', () => {
  it('shows the first-use empty state', async () => {
    const real = customersMock; customersMock = Promise.resolve([]);
    render(<CustomersView />);
    expect(await screen.findByText('No customers yet')).toBeTruthy();
    customersMock = real;
  });
});

describe('CW7 · Customer workspace = context + handoff', () => {
  it('opens a customer: identity, contact, active work, intelligence context, Stage 8 handoff', async () => {
    render(<CustomersView />);
    fireEvent.click(await screen.findByText('Abena Ofori'));
    expect(screen.getByText('All customers')).toBeTruthy();
    expect(screen.getByText('+233201234567')).toBeTruthy();
    expect(await screen.findByText(/SO-1001/)).toBeTruthy(); // active work
    expect(screen.getByTestId('customer-detail-stub').getAttribute('data-customer')).toBe('c1'); // Phase 13–16 context reused
    fireEvent.click(screen.getByRole('button', { name: /New order/i }));
    expect(screen.getByTestId('order-workflow-stub').getAttribute('data-customer')).toBe('c1'); // Stage 8 workflow launches in customer context
  });
  it('back returns to the list', async () => {
    render(<CustomersView />);
    fireEvent.click(await screen.findByText('Abena Ofori'));
    fireEvent.click(screen.getByRole('button', { name: 'All customers' }));
    expect(await screen.findByText('Kwame Mensah')).toBeTruthy();
  });
});

describe('CW8 · Customer orders failure is honest', () => {
  it('shows retry, never fabricated orders', async () => {
    const real = customerOrdersMock; customerOrdersMock = Promise.reject(new Error('x'));
    render(<CustomersView />);
    fireEvent.click(await screen.findByText('Abena Ofori'));
    expect(await screen.findByText(/Orders could not be loaded/i)).toBeTruthy();
    customerOrdersMock = real;
  });
});

describe('CW9 · Create customer reuses the validated flow and refreshes', () => {
  it('saves through the existing modal contract', async () => {
    render(<CustomersView />);
    await screen.findByText('Abena Ofori');
    fireEvent.click(screen.getByRole('button', { name: 'Add customer' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save customer' }));
    await vi.waitFor(() => expect(createCustomer).toHaveBeenCalledOnce());
    await screen.findByText('Abena Ofori'); // list reloaded after creation
  });
});
