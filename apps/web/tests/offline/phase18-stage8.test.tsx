/**
 * Phase 18 — Stage 8 Order Workflow tests (OW1–OW10).
 * jsdom + RTL; the workflow is real, its context + customer API are mocked
 * to the VERIFIED contracts (addOrder returns id; addCustomer is tier-gated).
 */

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';

const addOrderMock = vi.fn(() => 'o-new-1');
const applyProfileMock = vi.fn();
const selectOrderMock = vi.fn();
const setViewMock = vi.fn();
const addCustomerMock = vi.fn(() => ({ success: true }));
let storeCustomers: Array<{ id: string; fullName: string; phone: string }> = [];
let profilesMock: Array<{ id: string; label: string; profileType: string; updatedAt: Date }> = [];
let fabricsMock: Array<{ id: string; name: string; fabricType: string; color: string; quantityInStock: number; unit: string; isActive: boolean }> = [];
let inspirationsMock: Array<{ id: string; title: string; imageUrl: string }> = [];

vi.mock('../../src/context/AppContext', () => ({ useApp: () => ({
  addOrder: addOrderMock, addCustomer: addCustomerMock,
  applyMeasurementProfileToOrder: applyProfileMock, selectOrder: selectOrderMock, setView: setViewMock,
  customers: storeCustomers, getCustomerMeasurementProfiles: () => profilesMock,
  designInspirations: inspirationsMock, fabricRecords: fabricsMock,
  currentWorkspace: { id: 'ws1', name: 'Accra Atelier', defaultCurrency: 'GHS' },
}) }));
vi.mock('../../src/modules/orders/assets', () => ({ garmentImageSrc: (t: string) => (['shirt', 'trouser', 'kaftan', 'dress'].includes(t) ? `/assets/garments/${t}.webp` : undefined) }));

import { OrderWorkflow } from '../../src/modules/orders/OrderWorkflow';

const customer = { id: 'api-c1', fullName: 'Abena Ofori', phone: '+233201234567', email: 'a@x.com' };

beforeEach(() => {
  storeCustomers = [{ id: 'c1', fullName: 'Abena Ofori', phone: '+233201234567' }];
  profilesMock = []; fabricsMock = []; inspirationsMock = [];
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const goNext = () => fireEvent.click(screen.getByRole('button', { name: 'Continue', exact: true }));

describe('OW1 · Garment step — verified taxonomy, visual selection', () => {
  it('offers exactly the 11 VERIFIED order garment types (no invented categories)', () => {
    render(<OrderWorkflow customer={customer} onExit={() => {}} onCompleted={() => {}} />);
    const labels = Array.from(document.querySelectorAll('[data-garment]')).map((b) => b.getAttribute('data-garment'));
    expect(labels.sort()).toEqual(['agbada', 'blouse', 'bodice', 'custom', 'dress', 'gown', 'kaftan', 'senator', 'shirt', 'skirt', 'trouser'].sort());
  });
  it('images only where the manifest has assets; others fall back to labelled tiles', () => {
    render(<OrderWorkflow customer={customer} onExit={() => {}} onCompleted={() => {}} />);
    expect(screen.getByAltText('Reference style: shirt')).toBeTruthy();
    expect(document.querySelectorAll('[data-garment] [title="No reference image available"]').length).toBeGreaterThan(0); // e.g. senator/agbada
  });
  it('cannot continue without a selection; selection enables Continue', () => {
    render(<OrderWorkflow customer={customer} onExit={() => {}} onCompleted={() => {}} />);
    expect(screen.getByRole('button', { name: 'Continue', exact: true })).toHaveProperty('disabled', true);
    fireEvent.click(document.querySelector('[data-garment="kaftan"]')!);
    expect(screen.getByRole('button', { name: 'Continue', exact: true })).toHaveProperty('disabled', false);
  });
});

describe('OW2 · Measurement step lifecycle', () => {
  it('blocks progress with neither profile nor values; capture unlocks it', () => {
    render(<OrderWorkflow customer={customer} onExit={() => {}} onCompleted={() => {}} />);
    fireEvent.click(document.querySelector('[data-garment="dress"]')!); goNext();
    expect(screen.getByRole('button', { name: 'Continue', exact: true })).toHaveProperty('disabled', true);
    fireEvent.change(screen.getByLabelText('Waist in centimetres'), { target: { value: '74' } });
    expect(screen.getByRole('button', { name: 'Continue', exact: true })).toHaveProperty('disabled', false);
  });
  it('lists saved profiles and marks selection', () => {
    profilesMock = [{ id: 'p1', label: 'Wedding fitting', profileType: 'custom', updatedAt: new Date() }];
    render(<OrderWorkflow customer={customer} onExit={() => {}} onCompleted={() => {}} />);
    fireEvent.click(document.querySelector('[data-garment="shirt"]')!); goNext();
    fireEvent.click(screen.getByRole('button', { name: /Wedding fitting/ }));
    expect(screen.getByRole('button', { name: /Wedding fitting/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Continue', exact: true })).toHaveProperty('disabled', false);
  });
});

describe('OW3 · Design step — Phase 14 inspirations + honest empty', () => {
  it('renders saved inspirations as selectable cards', () => {
    inspirationsMock = [{ id: 'd1', title: 'Ankara gala gown', imageUrl: '/img/d1.png' }];
    render(<OrderWorkflow customer={customer} onExit={() => {}} onCompleted={() => {}} />);
    fireEvent.click(document.querySelector('[data-garment="gown"]')!); goNext();
    fireEvent.change(screen.getByLabelText('Waist in centimetres'), { target: { value: '74' } }); goNext();
    fireEvent.click(document.querySelector('[data-inspiration="d1"]')!);
    expect(document.querySelector('[data-inspiration="d1"]')!.getAttribute('aria-pressed')).toBe('true');
  });
  it('empty state offers a clear continue action', () => {
    render(<OrderWorkflow customer={customer} onExit={() => {}} onCompleted={() => {}} />);
    fireEvent.click(document.querySelector('[data-garment="shirt"]')!); goNext();
    fireEvent.change(screen.getByLabelText('Waist in centimetres'), { target: { value: '74' } }); goNext();
    expect(screen.getByText('No saved inspirations')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue without design' }));
  });
});

describe('OW4 · Materials step — required vs available never conflated', () => {
  it('selects fabric, shows stock as library record, states yardage comes later', () => {
    fabricsMock = [{ id: 'f1', name: 'Ankara print', fabricType: 'ankara', color: 'indigo', quantityInStock: 12, unit: 'yards', isActive: true }];
    render(<OrderWorkflow customer={customer} onExit={() => {}} onCompleted={() => {}} />);
    fireEvent.click(document.querySelector('[data-garment="dress"]')!); goNext();
    fireEvent.change(screen.getByLabelText('Waist in centimetres'), { target: { value: '74' } }); goNext(); goNext();
    fireEvent.click(document.querySelector('[data-fabric="f1"]')!);
    expect(document.querySelector('[data-fabric="f1"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(/12 yards in stock/)).toBeTruthy();
    expect(screen.getByText(/confirmed at cutting preparation/i)).toBeTruthy();
  });
});

describe('OW5 · Review + confirmation', () => {
  const setup = () => {
    fabricsMock = [{ id: 'f1', name: 'Ankara print', fabricType: 'ankara', color: 'indigo', quantityInStock: 12, unit: 'yards', isActive: true }];
    render(<OrderWorkflow customer={customer} onExit={() => {}} onCompleted={() => {}} />);
    fireEvent.click(document.querySelector('[data-garment="kaftan"]')!); goNext();
    fireEvent.change(screen.getByLabelText('Waist in centimetres'), { target: { value: '74' } }); goNext(); goNext();
    fireEvent.click(document.querySelector('[data-fabric="f1"]')!); goNext();
  };
  it('review summarizes every section before confirming', () => {
    setup();
    const review = screen.getByLabelText('Review order');
    expect(review.textContent).toContain('Abena Ofori');
    expect(review.textContent).toContain('Kaftan');
    expect(review.textContent).toContain('1 values captured');
    expect(review.textContent).toContain('Ankara print');
  });
  it('confirm creates the order through the existing contract (in_progress, store customer) and applies profile semantics', () => {
    profilesMock = [{ id: 'p1', label: 'Main profile', profileType: 'custom', updatedAt: new Date() }];
    setup(); // no profile selected in this run
    fireEvent.click(screen.getByRole('button', { name: /Confirm order/i }));
    expect(addOrderMock).toHaveBeenCalledOnce();
    const payload = addOrderMock.mock.calls[0][0];
    expect(payload.status).toBe('in_progress');
    expect(payload.customerId).toBe('c1'); // resolved in offline store
    expect(payload.garmentType).toBe('kaftan');
    expect(payload.measurementSnapshot?.waist).toBe(74);
    expect(screen.getByText('Order confirmed')).toBeTruthy();
    expect(applyProfileMock).not.toHaveBeenCalled();
  });
  it('profile selection routes through the canonical snapshot machinery', () => {
    profilesMock = [{ id: 'p1', label: 'Main profile', profileType: 'custom', updatedAt: new Date() }];
    fabricsMock = [{ id: 'f1', name: 'Ankara print', fabricType: 'ankara', color: 'indigo', quantityInStock: 12, unit: 'yards', isActive: true }];
    const { unmount } = render(<OrderWorkflow customer={customer} onExit={() => {}} onCompleted={() => {}} />);
    fireEvent.click(document.querySelector('[data-garment="shirt"]')!); goNext();
    fireEvent.click(screen.getByRole('button', { name: /Main profile/ })); goNext(); goNext(); goNext();
    fireEvent.click(screen.getByRole('button', { name: /Confirm order/i }));
    expect(applyProfileMock).toHaveBeenCalledWith('o-new-1', 'p1');
    unmount();
  });
});

describe('OW6 · Customer resolution honesty (store vs API split)', () => {
  it('creates the API customer in the device store via the tier-gated contract when absent', () => {
    storeCustomers = [];
    render(<OrderWorkflow customer={customer} onExit={() => {}} onCompleted={() => {}} />);
    fireEvent.click(document.querySelector('[data-garment="shirt"]')!); goNext();
    fireEvent.change(screen.getByLabelText('Waist in centimetres'), { target: { value: '74' } });
    goNext(); goNext(); goNext();
    fireEvent.click(screen.getByRole('button', { name: /Confirm order/i }));
    expect(addCustomerMock).toHaveBeenCalledOnce();
  });
  it('tier denial produces an actionable error, never a fake success', () => {
    addCustomerMock.mockReturnValueOnce({ success: false, error: 'Customer limit reached (BASIC plan)' });
    storeCustomers = [];
    render(<OrderWorkflow customer={customer} onExit={() => {}} onCompleted={() => {}} />);
    fireEvent.click(document.querySelector('[data-garment="shirt"]')!); goNext();
    fireEvent.change(screen.getByLabelText('Waist in centimetres'), { target: { value: '74' } });
    goNext(); goNext(); goNext();
    fireEvent.click(screen.getByRole('button', { name: /Confirm order/i }));
    expect(addOrderMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Customer limit reached/)).toBeTruthy();
  });
});

describe('OW7 · Success actions — contextual Design Studio entry', () => {
  it('Open Design Studio selects the order and enters the EXISTING studio path', () => {
    render(<OrderWorkflow customer={customer} onExit={() => {}} onCompleted={() => {}} />);
    fireEvent.click(document.querySelector('[data-garment="shirt"]')!); goNext();
    fireEvent.change(screen.getByLabelText('Waist in centimetres'), { target: { value: '74' } });
    goNext(); goNext(); goNext();
    fireEvent.click(screen.getByRole('button', { name: /Confirm order/i }));
    fireEvent.click(screen.getByRole('button', { name: /Open Design Studio/i }));
    expect(selectOrderMock).toHaveBeenCalledWith('o-new-1');
    expect(setViewMock).toHaveBeenCalledWith('design-studio');
  });
});

describe('OW8 · Back navigation preserves work (no restart)', () => {
  it('moving back and forward keeps selections', () => {
    render(<OrderWorkflow customer={customer} onExit={() => {}} onCompleted={() => {}} />);
    fireEvent.click(document.querySelector('[data-garment="trouser"]')!); goNext();
    fireEvent.change(screen.getByLabelText('Waist in centimetres'), { target: { value: '74' } }); goNext();
    fireEvent.click(screen.getByRole('button', { name: 'Back', exact: true })); // design → measurements
    expect((screen.getByLabelText('Waist in centimetres') as HTMLInputElement).value).toBe('74');
    fireEvent.click(screen.getByRole('button', { name: /Continue/i })); // → design
    fireEvent.click(screen.getByRole('button', { name: 'Back', exact: true })); fireEvent.click(screen.getByRole('button', { name: 'Back', exact: true })); // → garment
    expect(document.querySelector('[data-garment="trouser"]')!.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('OW9 · Step gating prevents invalid progress', () => {
  it('Continue is disabled until each prerequisite step is satisfied', () => {
    render(<OrderWorkflow customer={customer} onExit={() => {}} onCompleted={() => {}} />);
    expect(screen.getByRole('button', { name: 'Continue', exact: true })).toHaveProperty('disabled', true); // no garment
    expect(screen.queryByLabelText('Measurements')).toBeNull();
  });
});

describe('OW10 · Workflow chrome', () => {
  it('keeps customer context visible in the header and an exit path', () => {
    render(<OrderWorkflow customer={customer} onExit={() => {}} onCompleted={() => {}} />);
    expect(screen.getByText('New order · Abena Ofori')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Back to Abena Ofori/i })).toBeTruthy();
  });
});
