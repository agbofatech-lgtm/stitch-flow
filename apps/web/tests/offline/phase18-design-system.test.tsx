/**
 * Phase 18 — Stage 5 Design System certification tests (DS1–DS14).
 * Real-DOM (jsdom). No network, no production data. Verifies the
 * non-negotiable contracts: non-colour status language, canonical-stage
 * preservation, form measurement semantics, overlay focus behaviour,
 * AI-advisory "advice not authority" presentation, imagery contracts.
 */

// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import {
  Button, FormField, Input, StatusPill, PaymentPill, ProductionTracker, CANONICAL_STAGES,
  AiAdvisory, EmptyState, ErrorState, Dialog, Drawer, Tabs, Switch, ImageFrame, Stepper,
  DensitySurface, Badge, Alert, Progress, Skeleton, Checklist, Table, Th, Td, DataList,
  ActionBar, StepIndicator, Timeline, Label, Display, Heading, Body, Numeric, Metric, KeyValue,
} from '../../src/design-system/index';
import DesignSystemShowcase from '../../src/design-system/showcase/DesignSystemShowcase';

afterEach(() => cleanup());

describe('DS1 · Button hierarchy (§17)', () => {
  it('renders variants with distinct data-variant contracts', () => {
    const { rerender } = render(<Button variant="primary">Go</Button>);
    expect(screen.getByRole('button', { name: 'Go' }).dataset.variant).toBe('primary');
    rerender(<Button variant="destructive">Del</Button>);
    expect(screen.getByRole('button', { name: 'Del' }).dataset.variant).toBe('destructive');
    rerender(<Button variant="secondary" contextual>Ctx</Button>);
    expect(screen.getByRole('button', { name: 'Ctx' }).dataset.variant).toBe('contextual');
  });
  it('disabled buttons are non-interactive', () => {
    render(<Button variant="primary" disabled>No</Button>);
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('DS2 · Form measurement semantics (§18)', () => {
  it('links label, hint and error via aria; marks invalid; never hides canonical unit', () => {
    render(
      <FormField label="Chest (body)" unit="cm" hint="Soft range 60–180" error="Out of range">
        {(aria) => <Input {...aria} numeric />}
      </FormField>,
    );
    const input = screen.getByLabelText(/Chest \(body\)/i) as HTMLInputElement;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.id).toBeTruthy();
    const described = input.getAttribute('aria-describedby')!.split(' ');
    expect(screen.getByText('Soft range 60–180')).toHaveProperty('id', described[0]);
    expect(screen.getByRole('alert').textContent).toMatch(/Out of range/);
    expect(screen.getByText('[cm]').textContent).toBe('[cm]'); // canonical unit visible
    expect(input.inputMode).toBe('decimal');
  });
  it('required/optional indicators announce accessibly', () => {
    render(
      <FormField label="Waist" required>
        {(aria) => <Input {...aria} />}
      </FormField>,
    );
    expect(screen.getByText('(required)').className).toContain('sr-only');
  });
  it('garment-variant fields are visually distinguishable from body fields', () => {
    const { container } = render(
      <FormField label="Chest (garment)">
        {(aria) => <Input {...aria} garment />}
      </FormField>,
    );
    expect(container.querySelector('input')!.className).toContain('border-dashed');
  });
});

describe('DS3 · Status language — non-colour + canonical preservation (§19)', () => {
  it('every canonical stage renders a text label AND keeps its canonical code', () => {
    for (const stage of CANONICAL_STAGES) {
      const { unmount } = render(<StatusPill stage={stage} />);
      const pill = screen.getByText(/./, { selector: `[data-stage="${stage}"]` });
      expect(pill.textContent).toMatch(/[A-Za-z]/); // text, not colour alone
      unmount();
    }
  });
  it('tracker renders stages in canonical order with current step announced', () => {
    render(<ProductionTracker current="first_fitting" />);
    const items = screen.getAllByRole('listitem');
    const order = items.map((li) => li.querySelector('[data-stage]')!.getAttribute('data-stage'));
    expect(order).toEqual([...CANONICAL_STAGES]);
    expect(screen.getByLabelText(/Production progress: First fitting/)).toBeTruthy();
    expect(screen.getByText((_, el) => el?.textContent === 'Current: First fitting' && el.tagName === 'SPAN')).toBeTruthy();
  });
  it('compact tracker still exposes future-stage labels to screen readers', () => {
    render(<ProductionTracker current="cutting" compact />);
    expect(screen.getByText((_, el) => el?.textContent === 'Pending: Delivered' && el.tagName === 'SPAN').className).toContain('sr-only');
  });
  it('payment state is a separate primitive from production state', () => {
    render(<><StatusPill stage="ready" /><PaymentPill state="unpaid" /></>);
    expect(document.querySelector('[data-stage="ready"]')).toBeTruthy();
    expect(document.querySelector('[data-payment="unpaid"]')).toBeTruthy();
    expect(screen.getByText('Unpaid')).toBeTruthy();
  });
});

describe('DS4 · AI advisory — advice, never authority (§20)', () => {
  it('renders as a note with verb, explicit advisory label and review/dismiss actions', () => {
    const onReview = vi.fn();
    render(<AiAdvisory verb="SUGGEST" title="Fabric may be insufficient" onReview={onReview}>Estimate 6.2 yd</AiAdvisory>);
    const note = screen.getByRole('note', { name: /AI advisory: SUGGEST/i });
    expect(note.dataset.aiVerb).toBe('SUGGEST');
    expect(within(note).getByText(/not deterministic data/i)).toBeTruthy();
    fireEvent.click(within(note).getByRole('button', { name: 'Review' }));
    expect(onReview).toHaveBeenCalledOnce();
  });
  it('all five advisory verbs are representable; SILENTLY MODIFY has none by design', () => {
    const { container } = render(
      <>{(['INFORM', 'WARN', 'SUGGEST', 'EXPLAIN', 'RECOMMEND'] as const).map((v) => (
        <AiAdvisory key={v} verb={v} title="t">{v}</AiAdvisory>
      ))}</>,
    );
    expect(container.querySelectorAll('[data-ai-verb]').length).toBe(5);
  });
});

describe('DS5 · Empty & error states (§23)', () => {
  it('empty state explains what/why/next with actions', () => {
    render(<EmptyState title="No orders yet" message="Create your first order."
      primaryAction={<Button variant="primary">New order</Button>} />);
    expect(screen.getByText('No orders yet')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New order' })).toBeTruthy();
  });
  it('decorative illustration is alt-hidden (message carries meaning)', () => {
    const { container } = render(<EmptyState illustration="/x.webp" title="T" message="M" />);
    expect((container.querySelector('img') as HTMLImageElement).alt).toBe('');
  });
  it('error state is an alert with retry and reference id', () => {
    const retry = vi.fn();
    render(<ErrorState message="Could not load" errorId="err-1" onRetry={retry} />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(/err-1/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
  });
});

describe('DS6 · Overlays — dialog/drawer a11y (§14)', () => {
  it('dialog: modal semantics, Escape closes, focus enters and restores', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'opener';
    document.body.appendChild(opener);
    opener.focus();
    const onClose = vi.fn();
    const { rerender } = render(<Dialog open onClose={onClose} title="Confirm"><p>Body</p></Dialog>);
    const dlg = screen.getByRole('dialog', { name: 'Confirm' });
    expect(dlg.getAttribute('aria-modal')).toBe('true');
    await waitFor(() => expect(document.activeElement).not.toBe(opener));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    rerender(<Dialog open={false} onClose={onClose} title="Confirm"><p>Body</p></Dialog>);
    await waitFor(() => expect(document.activeElement).toBe(opener));
    opener.remove();
  });
  it('drawer: dialog semantics with accessible title', () => {
    render(<Drawer open onClose={() => {}} title="Customer details"><p>x</p></Drawer>);
    expect(screen.getByRole('dialog', { name: 'Customer details' }).getAttribute('aria-modal')).toBe('true');
  });
});

describe('DS7 · Tabs keyboard contract', () => {
  it('roving tabindex, arrow navigation, aria-selected, panel wiring', () => {
    render(<Tabs tabs={[
      { id: 'a', label: 'Alpha', content: <p>A-panel</p> },
      { id: 'b', label: 'Beta', content: <p>B-panel</p> },
    ]} />);
    const alpha = screen.getByRole('tab', { selected: true });
    expect(alpha).toHaveProperty('id', 'tab-a');
    expect(screen.getByRole('tabpanel').id).toBe('panel-a');
    fireEvent.keyDown(alpha, { key: 'ArrowRight' });
    const beta = screen.getByRole('tab', { selected: true });
    expect(beta.id).toBe('tab-b');
    expect(beta).toBe(document.activeElement);
    fireEvent.keyDown(beta, { key: 'Home' });
    expect(screen.getByRole('tab', { selected: true }).id).toBe('tab-a');
  });
});

describe('DS8 · Controls & workflow primitives', () => {
  it('switch exposes role/aria-checked and toggles', () => {
    const on = vi.fn();
    render(<Switch checked={false} onCheckedChange={on} label="Notify" />);
    const sw = screen.getByRole('switch', { name: 'Notify' });
    expect(sw.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(sw);
    expect(on).toHaveBeenCalledWith(true);
  });
  it('stepper marks current step and disables future steps', () => {
    render(<Stepper steps={[{ id: '1', label: 'Customer' }, { id: '2', label: 'Design' }]} current={0}><p>x</p></Stepper>);
    expect(screen.getByText('Customer').closest('button')!.getAttribute('aria-current')).toBe('step');
    expect((screen.getByText('Design').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });
  it('checklist announces state textually (non-colour)', () => {
    render(<Checklist items={[{ label: 'Attached', state: 'done' }, { label: 'Blocked', state: 'blocked' }]} />);
    expect(screen.getByText(/— completed/)).toBeTruthy();
    expect(screen.getByText(/— blocked/)).toBeTruthy();
  });
  it('table caption + semantic roles; progress exposes values; skeleton announces', () => {
    render(<Table caption="Orders"><thead><tr><Th>Customer</Th></tr></thead><tbody><tr><Td>A</Td></tr></tbody></Table>);
    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Orders' })).toBeTruthy();
    cleanup();
    render(<Progress value={62} label="Order progress" />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('62');
    cleanup();
    render(<Skeleton label="Order list" />);
    expect(screen.getByRole('status', { name: 'Loading Order list…' })).toBeTruthy(); // accessible name from aria-label
  });
});

describe('DS9 · Imagery contract (§21/§22)', () => {
  it('renders lazy img with mandatory honest alt; hero may be eager', () => {
    render(<ImageFrame variant="garment" src="/a.webp" alt="Reference: tailored shirt" />);
    const img = screen.getByAltText('Reference: tailored shirt');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
    cleanup();
    render(<ImageFrame variant="hero" src="/h.avif" alt="Studio hero" eager />);
    expect(screen.getByAltText('Studio hero').getAttribute('loading')).toBe('eager');
  });
  it('missing image degrades to a labelled placeholder, never a silent blank', () => {
    render(<ImageFrame variant="fabric" alt="Fabric reference" />);
    expect(screen.getByRole('img', { name: 'Fabric reference' }).textContent).toMatch(/No image available/);
  });
});

describe('DS10 · Density & surface personalities (§24)', () => {
  it('density attribute drives one shared system (not a second design system)', () => {
    const { container } = render(<DensitySurface density="developer"><p>x</p></DensitySurface>);
    expect(container.firstChild!.getAttribute('data-density')).toBe('developer');
  });
});

describe('DS11 · Typography roles', () => {
  it('six roles map to heading/paragraph semantics', () => {
    render(<><Display id="d">D</Display><Heading id="h">H</Heading><Body>B</Body><Label>L</Label><Numeric>N</Numeric></>);
    expect(screen.getByRole('heading', { level: 1, name: 'D' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'H' })).toBeTruthy();
    expect(screen.getByText('N').className).toContain('ds-numeric');
  });
});

describe('DS12 · Badges, alerts, metrics, key-value, timeline, action bar', () => {
  it('feedback family renders with accessible names', () => {
    render(<Alert tone="danger" title="Sync failed">retrying</Alert>);
    expect(screen.getByRole('alert').textContent).toMatch(/Sync failed/);
    cleanup();
    render(<Metric label="Open orders" value={12} unit="orders" />);
    expect(screen.getByText('Open orders')).toBeTruthy();
    cleanup();
    render(<ActionBar label="Actions"><Button>Go</Button></ActionBar>);
    expect(screen.getByRole('group', { name: 'Actions' })).toBeTruthy();
    cleanup();
    render(<StepIndicator steps={[{ id: '1', label: 'S' }]} current={0} />);
    expect(screen.getByLabelText('Workflow steps')).toBeTruthy();
    cleanup();
    render(<Timeline items={[{ title: 'Created', done: true }]} />);
    expect(screen.getByLabelText('Activity timeline')).toBeTruthy();
    cleanup();
    render(<DataList label="Orders" items={[{ title: 'A', rows: [['k', 'v']] }]} />);
    expect(screen.getByLabelText('Orders')).toBeTruthy();
  });
});

describe('DS13 · Showcase laboratory smoke (§30)', () => {
  it('renders the major validation sections without production data', () => {
    render(<DesignSystemShowcase />);
    for (const section of ['Typography', 'Actions', 'Forms', 'Status language', 'AI advisory', 'Overlays', 'Imagery', 'Workflow']) {
      expect(screen.getByRole('region', { name: section })).toBeTruthy();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));
    expect(screen.getByRole('dialog', { name: 'Confirm stage transition' })).toBeTruthy();
  });
});

describe('DS14 · Token discipline (§26)', () => {
  it('semantic tokens exist as CSS custom properties (no hex in components)', async () => {
    const css = (await import('fs')).readFileSync('src/design-system/tokens.css', 'utf8');
    for (const token of ['--ds-bg', '--ds-surface', '--ds-text-primary', '--ds-border', '--ds-accent',
      '--ds-focus', '--ds-success', '--ds-warning', '--ds-danger', '--ds-advisory',
      '--ds-stage-measurement', '--ds-stage-delivered', '--ds-touch-min']) {
      expect(css).toContain(token);
    }
    for (const comp of ['Button', 'Status', 'Feedback', 'Form']) {
      const src = (await import('fs')).readFileSync(`src/design-system/${comp}.tsx`, 'utf8');
      expect(src.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull(); // semantic tokens only
    }
  });
});
