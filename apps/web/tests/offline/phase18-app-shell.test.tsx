/**
 * Phase 18 — Stage 6 Application Shell certification tests (SH1–SH9).
 * jsdom + RTL. Context and auth-claim helpers are mocked at module level;
 * the shell components themselves are real.
 */

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';

const mockApp = {
  currentView: 'dashboard',
  setView: vi.fn(),
  currentWorkspace: { id: 'ws1', name: 'Accra Atelier', ownerName: 'Ama O.' },
  currentMember: { role: 'owner', user: { fullName: 'Ama Ofori' } },
  tierSimulation: 'PRO',
  simulateTier: vi.fn(),
  switchRole: vi.fn(),
};
let mockRole: string | null = null;

vi.mock('../../src/context/AppContext', () => ({ useApp: () => mockApp }));
vi.mock('../../src/shared/utils/api', () => ({
  getAuthRole: () => mockRole,
  isPlatformRole: (r: string | null) => r === 'PLATFORM_OWNER',
}));
vi.mock('../../src/shared/api/auth', () => ({ logout: vi.fn(async () => {}) }));
vi.mock('../../src/shared/router', () => ({ navigate: vi.fn() }));

import { WorkspaceShell } from '../../src/shell/WorkspaceShell';
import { PRIMARY_NAV, SECONDARY_NAV, viewTitle, DEVELOPER_NAV } from '../../src/shell/navigation';
import { logout } from '../../src/shared/api/auth';
import { navigate } from '../../src/shared/router';

afterEach(() => { cleanup(); vi.clearAllMocks(); mockApp.currentView = 'dashboard'; mockRole = null; });

describe('SH1 · Navigation model = business intent (§4)', () => {
  it('primary destinations are the approved five workflow items', () => {
    expect(PRIMARY_NAV.map((n) => n.label)).toEqual(['Home', 'Customers', 'Orders', 'Production', 'Finance']);
  });
  it('no intelligence/engine module is a navigation destination', () => {
    const labels = [...PRIMARY_NAV, ...SECONDARY_NAV, DEVELOPER_NAV].map((n) => n.label.toLowerCase()).join(' ');
    for (const banned of ['intelligence', 'engine', 'gateway', 'registry', 'webhook', 'flag', 'sync engine', 'pattern engine']) {
      expect(labels).not.toContain(banned);
    }
  });
  it('view titles map legacy ids to human labels', () => {
    expect(viewTitle('dashboard')).toBe('Home');
    expect(viewTitle('production-board')).toBe('Production');
    expect(viewTitle('invoices')).toBe('Finance');
  });
});

describe('SH2 · Desktop sidebar renders hierarchy with active state', () => {
  it('renders primary + secondary items with aria-current on the active view', () => {
    mockApp.currentView = 'orders';
    render(<WorkspaceShell><p>content</p></WorkspaceShell>);
    const primary = screen.getByLabelText('Workspace sidebar').querySelector('nav[aria-label="Primary"]')!;
    expect(within(primary).getByRole('button', { name: 'Orders' }).getAttribute('aria-current')).toBe('page');
    expect(within(primary).getByRole('button', { name: 'Home' }).getAttribute('aria-current')).toBeNull();
    for (const label of ['Customers', 'Production', 'Finance', 'Materials', 'Reports', 'Design Studio', 'Settings', 'Developer']) {
      expect(within(primary).getByRole('button', { name: new RegExp('^' + label + '$') })).toBeTruthy();
    }
  });
  it('header shows the current view title and workspace identity', () => {
    render(<WorkspaceShell><p>c</p></WorkspaceShell>);
    expect(screen.getByRole('banner').textContent).toContain('Accra Atelier');
    expect(screen.getByRole('banner').textContent).toContain('Home');
  });
});

describe('SH3 · Mobile bottom navigation (§13)', () => {
  it('renders exactly five destinations including More, with touch-sized targets', () => {
    render(<WorkspaceShell><p>c</p></WorkspaceShell>);
    const bottom = screen.getAllByLabelText('Primary').find((el) => el.getAttribute('data-shell') === 'bottom-nav')!;
    expect(bottom).toBeTruthy();
    const items = within(bottom).getAllByRole('button');
    expect(items.map((b) => b.textContent)).toEqual(['Home', 'Customers', 'Orders', 'Production', 'More']);
    for (const item of items) expect(item.className).toContain('min-h-[56px]');
  });
  it('active bottom item is announced and More is active when on a secondary view', () => {
    mockApp.currentView = 'customers';
    render(<WorkspaceShell><p>c</p></WorkspaceShell>);
    const bottom = screen.getAllByLabelText('Primary').find((el) => el.getAttribute('data-shell') === 'bottom-nav')!;
    expect(within(bottom).getByText('Customers').closest('button')!.getAttribute('aria-current')).toBe('page');
    cleanup();
    mockApp.currentView = 'reports';
    render(<WorkspaceShell><p>c</p></WorkspaceShell>);
    const bottom2 = screen.getAllByLabelText('Primary').find((el) => el.getAttribute('data-shell') === 'bottom-nav')!;
    expect(within(bottom2).getByText('More').closest('button')!.getAttribute('aria-current')).toBeNull();
    expect(within(bottom2).getByText('More').closest('button')!.className).toContain('border-ds-focus');
  });
});

describe('SH4 · More sheet (Drawer primitive: focus, Escape, restore)', () => {
  it('opens as a dialog with secondary destinations and navigates on select', async () => {
    render(<WorkspaceShell><p>c</p></WorkspaceShell>);
    fireEvent.click(screen.getAllByRole('button', { name: 'More' }).at(-1)!);
    const sheet = await screen.findByRole('dialog', { name: 'More' });
    expect(sheet.getAttribute('aria-modal')).toBe('true');
    fireEvent.click(within(sheet).getByRole('button', { name: /Materials/ }));
    expect(mockApp.setView).toHaveBeenCalledWith('materials');
    expect(await screen.queryByRole('dialog', { name: 'More' })).toBeNull(); // closed after navigation
  });
});

describe('SH5 · Account menu (§19)', () => {
  it('exposes identity, settings, sign out and the preserved demo tools', async () => {
    render(<WorkspaceShell><p>c</p></WorkspaceShell>);
    fireEvent.click(screen.getByRole('button', { name: /Ama Ofori/i }));
    const menu = await screen.findByRole('menu', { name: 'Account' });
    expect(menu.textContent).toContain('owner');
    fireEvent.click(within(menu).getByRole('button', { name: /Sign out/i }));
    expect(logout).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
    cleanup();
    render(<WorkspaceShell><p>c</p></WorkspaceShell>);
    fireEvent.click(screen.getByRole('button', { name: /Ama Ofori/i }));
    const menu2 = await screen.findByRole('menu', { name: 'Account' });
    expect(within(menu2).getAllByRole('button', { name: /^(owner|assistant)$/i }).length).toBe(2); // demo role switch preserved
    expect(within(menu2).getAllByRole('button', { name: /^(BASIC|PRO|STUDIO)$/ }).length).toBe(3); // tier simulation preserved
  });
  it('closes on Escape and restores focus to the trigger', async () => {
    render(<WorkspaceShell><p>c</p></WorkspaceShell>);
    const trigger = screen.getByRole('button', { name: /Ama Ofori/i });
    trigger.focus();
    fireEvent.click(trigger);
    await screen.findByRole('menu', { name: 'Account' });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu', { name: 'Account' })).toBeNull();
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});

describe('SH6 · Platform boundary (§21)', () => {
  it('shows Control Center only for the platform role claim', () => {
    mockRole = null;
    render(<WorkspaceShell><p>c</p></WorkspaceShell>);
    expect(screen.queryByText('Control Center')).toBeNull();
    cleanup();
    mockRole = 'PLATFORM_OWNER';
    render(<WorkspaceShell><p>c</p></WorkspaceShell>);
    expect(screen.getAllByText('Control Center').length).toBeGreaterThanOrEqual(1); // sidebar secondary + account menu
  });
});

describe('SH7 · Offline honesty (§27)', () => {
  it('shows an Offline status only when navigator.onLine is false; never claims sync', () => {
    const desc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine')!;
    Object.defineProperty(Navigator.prototype, 'onLine', { ...desc, get: () => false });
    render(<WorkspaceShell><p>c</p></WorkspaceShell>);
    const pill = screen.getByRole('status');
    expect(pill.textContent).toMatch(/Offline — work continues locally/);
    expect(pill.textContent).not.toMatch(/synced|syncing/i);
    Object.defineProperty(Navigator.prototype, 'onLine', desc);
    cleanup();
    render(<WorkspaceShell><p>c</p></WorkspaceShell>);
    expect(screen.queryByText(/Offline/)).toBeNull();
  });
});

describe('SH8 · Landmarks and skip link (§30)', () => {
  it('provides banner, main, labelled navigations and a skip-to-content link', () => {
    render(<WorkspaceShell><p>content</p></WorkspaceShell>);
    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByRole('main').textContent).toBe('content');
    expect(screen.getAllByLabelText('Primary').length).toBeGreaterThanOrEqual(2); // sidebar + bottom
    expect(screen.getByLabelText('Secondary')).toBeTruthy();
    const skip = screen.getByRole('link', { name: 'Skip to content' });
    expect(skip.getAttribute('href')).toBe('#main-content');
  });
});
