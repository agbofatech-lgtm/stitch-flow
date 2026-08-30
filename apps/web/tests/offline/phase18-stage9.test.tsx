/**
 * Phase 18 — Stage 9 Contextual Intelligence tests (CI1–CI15 + §40 negatives).
 * jsdom + RTL. The intelligence SERVICES ARE REAL (patternAdapter,
 * productionAssistant run their actual code through the thin adapter) — the
 * harness mocks only the app context to the VERIFIED store contracts, so
 * these tests prove integration, not a parallel implementation (CI15).
 */

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const addOrderMock = vi.fn(() => 'o-new-1');
const applyProfileMock = vi.fn();
const selectOrderMock = vi.fn();
const setViewMock = vi.fn();
const addCustomerMock = vi.fn(() => ({ success: true }));
let storeCustomers: Array<{ id: string; fullName: string; phone: string }> = [];
let profilesMock: Array<{ id: string; label: string; profileType: string; updatedAt: Date; measurements?: Record<string, number> }> = [];
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

// CI15 — wrap the REAL engine with a spy: the wizard must consume this module,
// never a reimplementation. Implementation is the original (importOriginal).
vi.mock('../../src/modules/services/patternAdapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/modules/services/patternAdapter')>();
  return { ...actual, validateMeasurementCompleteness: vi.fn(actual.validateMeasurementCompleteness) };
});

import { OrderWorkflow } from '../../src/modules/orders/OrderWorkflow';
import { validateMeasurementCompleteness } from '../../src/modules/services/patternAdapter';

const customer = { id: 'api-c1', fullName: 'Abena Ofori', phone: '+233201234567', email: 'a@x.com' };
const renderWizard = () => render(<OrderWorkflow customer={customer} onExit={() => {}} onCompleted={() => {}} />);
const goNext = () => fireEvent.click(screen.getByRole('button', { name: 'Continue', exact: true }));
const card = (kind: string) => document.querySelector(`[data-intelligence="${kind}"]`)!;

/** Drive to the measurements step with a garment chosen. */
const atMeasurements = (garment: string) => {
  renderWizard();
  fireEvent.click(document.querySelector(`[data-garment="${garment}"]`)!);
  goNext();
};

beforeEach(() => {
  storeCustomers = [{ id: 'c1', fullName: 'Abena Ofori', phone: '+233201234567' }];
  profilesMock = []; fabricsMock = []; inspirationsMock = [];
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('CI1 · Deterministic result rendering (real Phase 14 engine)', () => {
  it('renders readiness from the real completeness engine, with Deterministic badge', () => {
    atMeasurements('shirt');
    fireEvent.change(screen.getByLabelText('Chest in centimetres'), { target: { value: '100' } });
    // Exact expectation derived from the REAL service, not hardcoded tables:
    expect(card('deterministic').textContent).toContain('1 of 4 required measurements for a shirt pattern are captured, plus 0 of 1 recommended');
    expect(card('deterministic').textContent).toContain('Deterministic');
  });
  it('marks readiness complete when every required value of the kind is captured', () => {
    atMeasurements('shirt');
    for (const [label, value] of [['Chest in centimetres', '100'], ['Neck in centimetres', '38'], ['Shoulder in centimetres', '15'], ['Back Length in centimetres', '40']] as const)
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    expect(card('deterministic').getAttribute('data-ready')).toBe('true');
    expect(card('deterministic').textContent).not.toContain('Additional measurements required');
  });
});

describe('CI4 · Missing-measurement behaviour (honest, never fabricated)', () => {
  it('names the missing required measurements for the chosen garment', () => {
    atMeasurements('shirt');
    fireEvent.change(screen.getByLabelText('Chest in centimetres'), { target: { value: '100' } });
    expect(card('deterministic').textContent).toContain('Additional measurements required for this garment: Neck, Shoulder Width, Back Length.');
    expect(card('deterministic').getAttribute('data-ready')).toBe('false');
  });
});

describe('CI7 · Garment-context propagation', () => {
  it('identical captured data yields different readiness per garment', () => {
    atMeasurements('dress'); // → bodice foundation: waist alone = 1 of 5 required
    fireEvent.change(screen.getByLabelText('Waist in centimetres'), { target: { value: '74' } });
    expect(card('deterministic').textContent).toContain('1 of 5 required');
    cleanup();
    atMeasurements('skirt'); // SAME single value completes skirt's required set
    fireEvent.change(screen.getByLabelText('Waist in centimetres'), { target: { value: '74' } });
    expect(card('deterministic').textContent).toContain('1 of 1 required');
    expect(card('deterministic').getAttribute('data-ready')).toBe('true');
  });
  it('surfaces the honest engine mapping note for engine-unsupported categories', () => {
    atMeasurements('senator'); // not a direct engine kind — adapter falls back with a warning
    expect(card('deterministic').textContent).toContain('Pattern mapping:');
  });
});

describe('CI5 · Missing material context (width unknown — no invented yardage)', () => {
  it('states the requirement cannot be finalized and shows NO estimate number', () => {
    fabricsMock = [{ id: 'f1', name: 'Ankara print', fabricType: 'cotton', color: 'blue', quantityInStock: 12, unit: 'yard', isActive: true }];
    atMeasurements('shirt');
    fireEvent.change(screen.getByLabelText('Chest in centimetres'), { target: { value: '100' } });
    goNext(); goNext(); // design → materials
    fireEvent.click(document.querySelector('[data-fabric="f1"]')!);
    const missing = card('missing');
    expect(missing.textContent).toContain('cannot be finalized until fabric width is known');
    // Never a fabricated estimate inside the intelligence card (stock row is outside it):
    expect(/(\d+(\.\d+)?)\s*(m\b|meters?\s|yards?\s)/i.test(missing.textContent ?? '')).toBe(false);
    expect(missing.textContent).toContain('Deterministic calculation: pattern & cutting preparation');
  });
  it('without fabric: says nothing is being calculated', () => {
    atMeasurements('shirt');
    fireEvent.change(screen.getByLabelText('Chest in centimetres'), { target: { value: '100' } });
    goNext(); goNext();
    expect(card('missing').textContent).toContain('No fabric is selected, so nothing is being calculated');
  });
});

describe('CI2 · AI advisory rendering (Phase 17, real engine)', () => {
  it('renders on-device advisory with severity, recommendation, provenance — and Dismiss', () => {
    atMeasurements('shirt');
    fireEvent.change(screen.getByLabelText('Chest in centimetres'), { target: { value: '100' } });
    goNext(); goNext(); goNext(); // → review
    const advisory = card('advisory');
    expect(advisory.textContent).toContain('Advisory · on-device');
    // Real engine fires 'Insufficient measurement coverage' at <0.6 completeness:
    expect(advisory.textContent).toContain('Insufficient measurement coverage');
    expect(advisory.textContent).toContain('High risk');
    expect(advisory.textContent).toContain('Recommendation:');
    expect(advisory.textContent).toContain('Based on:');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss advisory' }));
    expect(card('advisory').textContent).toContain('Advisory dismissed');
  });
  it('full capture → honest "no risks flagged" state', () => {
    atMeasurements('shirt');
    for (const [label, value] of [['Chest in centimetres', '100'], ['Neck in centimetres', '38'], ['Shoulder in centimetres', '15'], ['Back Length in centimetres', '40'], ['Sleeve in centimetres', '24']] as const)
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    goNext(); goNext(); goNext();
    expect(card('advisory').textContent).toContain('No fit risks flagged for this combination');
  });
});

describe('CI3 · Deterministic vs advisory distinction', () => {
  it('deterministic badge on measurements, advisory badge on review — never merged', () => {
    atMeasurements('shirt');
    expect(card('deterministic').textContent).toContain('Deterministic');
    expect(document.querySelector('[data-intelligence="advisory"]')).toBeNull();
    fireEvent.change(screen.getByLabelText('Chest in centimetres'), { target: { value: '100' } });
    goNext(); goNext(); goNext();
    const advisory = card('advisory');
    expect(advisory.textContent).toContain('Advisory · on-device');
    expect(advisory.textContent).not.toContain('Deterministic'); // never merged into one visual unit
    // Deterministic order data remains visible in the review summary (separate surface):
    expect(screen.getByText('1 value captured')).toBeTruthy();
  });
});

describe('CI8 · Customer/order context propagation', () => {
  it('customer header retained; profile selection feeds intelligence provenance', () => {
    profilesMock = [{ id: 'p1', label: 'Wedding fitting', profileType: 'custom', updatedAt: new Date('2026-01-05'), measurements: { chest: 100 } }];
    atMeasurements('shirt');
    expect(screen.getByText('New order · Abena Ofori')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Wedding fitting/ }));
    expect(card('deterministic').textContent).toContain('Profile: Wedding fitting');
    expect(card('deterministic').textContent).toContain('1 of 4 required'); // engine read the profile's chest
  });
});

describe('CI6 · Snapshot / current-data distinction (§25)', () => {
  it('confirmed screen freezes and labels the snapshot; profile machinery invoked', () => {
    profilesMock = [{ id: 'p1', label: 'Wedding fitting', profileType: 'custom', updatedAt: new Date('2026-01-05') }];
    atMeasurements('shirt');
    fireEvent.click(screen.getByRole('button', { name: /Wedding fitting/ }));
    goNext(); goNext(); goNext(); // → review
    fireEvent.click(screen.getByRole('button', { name: /Confirm order/i }));
    const snap = card('snapshot');
    expect(snap.textContent).toContain('Order snapshot');
    expect(snap.textContent).toContain('Wedding fitting — profile snapshotted');
    expect(snap.textContent).toContain('Frozen at confirm');
    expect(applyProfileMock).toHaveBeenCalledWith('o-new-1', 'p1'); // canonical snapshot machinery
    // Review + confirmed both state the integrity rule:
    expect(document.body.textContent).toContain('later customer-profile edits never rewrite');
  });
});

describe('CI9 + §40 negatives · Advisory can never silently mutate', () => {
  it('advisory rendered → order payload, measurements and engine inputs unchanged', () => {
    atMeasurements('shirt');
    fireEvent.change(screen.getByLabelText('Chest in centimetres'), { target: { value: '100' } });
    goNext(); goNext(); goNext(); // advisory visible at review
    expect(card('advisory').textContent).toContain('Insufficient measurement coverage');
    fireEvent.click(screen.getByRole('button', { name: /Confirm order/i }));
    const payload = addOrderMock.mock.calls.at(-1)![0] as { garmentMeasurements?: Record<string, number> };
    expect(payload.garmentMeasurements).toEqual({ chest: 100 }); // advisory did NOT touch values
    expect(applyProfileMock).not.toHaveBeenCalled(); // nothing extra was attached
  });
  it('no mutation action ever appears inside an intelligence card', () => {
    atMeasurements('shirt');
    fireEvent.change(screen.getByLabelText('Chest in centimetres'), { target: { value: '100' } });
    goNext(); goNext(); goNext();
    for (const el of Array.from(document.querySelectorAll('[data-intelligence]'))) {
      const buttons = Array.from(el.querySelectorAll('button')).map((b) => b.textContent ?? '');
      for (const label of buttons) expect(label).toMatch(/dismiss/i); // only advisory dismissal
    }
  });
  it('dismissing the advisory leaves captured values intact', () => {
    atMeasurements('shirt');
    fireEvent.change(screen.getByLabelText('Chest in centimetres'), { target: { value: '100' } });
    goNext(); goNext(); goNext();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss advisory' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back', exact: true })); // → materials
    fireEvent.click(screen.getByRole('button', { name: 'Back', exact: true })); // → design
    fireEvent.click(screen.getByRole('button', { name: 'Back', exact: true })); // → measurements
    expect((screen.getByLabelText('Chest in centimetres') as HTMLInputElement).value).toBe('100');
  });
});

describe('CI10 + CI11 · Offline behaviour (honest classes)', () => {
  const goOffline = () => Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
  const goOnline = () => Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
  afterEach(goOnline);
  it('offline: deterministic intelligence still computes (local engine)', () => {
    goOffline();
    atMeasurements('shirt');
    fireEvent.change(screen.getByLabelText('Chest in centimetres'), { target: { value: '100' } });
    expect(card('deterministic').textContent).toContain('1 of 4 required');
  });
  it('offline: advisory is LOCAL inference — still available, labelled on-device, no fake sync claims', () => {
    goOffline();
    atMeasurements('shirt');
    fireEvent.change(screen.getByLabelText('Chest in centimetres'), { target: { value: '100' } });
    goNext(); goNext(); goNext();
    const advisory = card('advisory');
    expect(advisory.textContent).toContain('Advisory · on-device');
    expect(advisory.textContent).toContain('Insufficient measurement coverage');
    expect(document.body.textContent?.toLowerCase()).not.toContain('synced');
    expect(document.body.textContent?.toLowerCase()).not.toContain('unavailable offline');
  });
});

describe('CI12 · Authorization boundaries (visibility ≠ authorization)', () => {
  it('intelligence is informational only — no entitlement or mutation surface introduced', () => {
    atMeasurements('shirt');
    fireEvent.change(screen.getByLabelText('Chest in centimetres'), { target: { value: '100' } });
    goNext(); goNext(); goNext();
    expect(document.body.textContent).not.toMatch(/permission|entitlement|role/i);
    // Authorization stays in the context/store layer (mocked here): the wizard
    // adds NO client-side gate of its own (frontend-only security prohibition).
  });
});

describe('CI13 · Version/context integrity', () => {
  it('shows the profile chronology (update date) and never an invented version number', () => {
    profilesMock = [{ id: 'p1', label: 'Wedding fitting', profileType: 'custom', updatedAt: new Date('2026-01-05') }];
    atMeasurements('shirt');
    const meta = screen.getByRole('button', { name: /Wedding fitting/ }).textContent ?? '';
    expect(meta).toContain('updated');
    expect(document.body.textContent ?? '').not.toMatch(/version\s*\d|\bv\d+\b/i);
  });
});

describe('CI14 · Responsive rendering primitives (widths certified in browser)', () => {
  it('intelligence cards cannot force horizontal overflow (min-w-0, no fixed widths)', () => {
    atMeasurements('shirt');
    for (const el of Array.from(document.querySelectorAll('[data-intelligence]'))) {
      expect(el.className).toContain('min-w-0');
      expect(el.className).not.toMatch(/w-\[\d+px\]|min-w-\[\d+px\]/);
    }
  });
});

describe('CI15 · No duplicate intelligence calculation path', () => {
  it('readiness consumes patternAdapter.validateMeasurementCompleteness (the real engine)', () => {
    atMeasurements('shirt');
    fireEvent.change(screen.getByLabelText('Chest in centimetres'), { target: { value: '100' } });
    expect(validateMeasurementCompleteness).toHaveBeenCalled();
    // And the rendered number equals the engine's own answer for this input:
    const engineBody: Record<string, number> = { bust_circumference: 100 };
    const engine = validateMeasurementCompleteness('shirt', engineBody);
    const requiredTotal = engine.missing.filter((m) => m.severity === 'required').length + 1; // + waist (captured)
    expect(card('deterministic').textContent).toContain(`1 of ${requiredTotal} required`);
  });
});
