import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  businessSurfaceFromView,
  viewForWorkspace,
  workspaceFromView,
  STUDIO_WORKSPACES,
  NAV_SECTIONS,
} from './workspaces';

test('floor thread uses selected order, not the first recent client', () => {
  const home = readFileSync(new URL('../atelier/AtelierHome.tsx', import.meta.url), 'utf8');
  assert.match(home, /selectedOrderId/);
  assert.equal(home.includes('recentCustomers[0]'), false);
  assert.match(home, /threadClient/);
  assert.match(home, /No client selected/);
  assert.match(home, /Work in motion/);
  assert.match(home, /AtelierWorkroom/);
  assert.equal(home.includes('totalRevenue'), false);
});

test('measurement table does not borrow the first profile as the thread', () => {
  const source = readFileSync(new URL('./MeasurementWorkspace.tsx', import.meta.url), 'utf8');
  assert.equal(source.includes('rows[0]?.customer'), false);
  assert.match(source, /workflow.customerId/);
  assert.match(source, /AtelierWorkroom/);
});

test('client room error does not expose unmounted API URLs', () => {
  const source = readFileSync(new URL('../components/Customers.tsx', import.meta.url), 'utf8');
  assert.match(source, /Client records are unavailable in this workspace/);
  assert.equal(source.includes('Source:'), false);
  assert.match(source, /AtelierWorkroom/);
});

test('atelier places use room vocabulary and real next rooms', () => {
  const { ATELIER_PLACES } = require('./atelierGrammar') as typeof import('./atelierGrammar');
  assert.equal(ATELIER_PLACES.command.title, 'Floor');
  assert.equal(ATELIER_PLACES.clients.title, 'Client room');
  assert.equal(ATELIER_PLACES.business.title, 'Ledger');
  assert.equal(ATELIER_PLACES.control.kicker, 'Operator plane');
  const next = ATELIER_PLACES.command.next;
  assert.ok(next && 'room' in next && next.room === 'clients');
});

test('six primary studio workspaces exist', () => {
  assert.deepEqual(
    STUDIO_WORKSPACES.map((item) => item.id),
    ['command', 'clients', 'measurements', 'design', 'production', 'business']
  );
});

test('legacy views map into workspaces without a new router', () => {
  assert.equal(workspaceFromView('dashboard'), 'command');
  assert.equal(workspaceFromView('customers'), 'clients');
  assert.equal(workspaceFromView('design-studio'), 'design');
  assert.equal(workspaceFromView('production-board'), 'production');
  assert.equal(workspaceFromView('invoices'), 'business');
  assert.equal(businessSurfaceFromView('materials'), 'materials');
  assert.equal(viewForWorkspace('design', 'orders'), 'design-studio');
  assert.equal(viewForWorkspace('measurements', 'orders'), null);
});

test('studio shell hosts Design Studio and does not import engines', () => {
  const shell = readFileSync(new URL('./StudioShell.tsx', import.meta.url), 'utf8');
  assert.match(shell, /DesignStudio/);
  assert.match(shell, /DesignStudioFrame/);
  assert.match(shell, /AtelierHome/);
  assert.match(shell, /ControlCenter/);
  assert.match(shell, /WorkflowPanel/);
  assert.equal(shell.includes('patternEngine'), false);
  assert.equal(shell.includes('productionAssistant'), false);
  assert.equal(shell.includes('localStorage'), false);
  assert.equal(shell.includes('react-router'), false);
  assert.match(shell, /ATELIER_PLACES/);
  assert.match(shell, /runPlaceNext/);
  assert.match(shell, /placeId=\{place.id\}/);
});

test('design workspace still hosts DesignStudio without a new router', () => {
  const shell = readFileSync(new URL('./StudioShell.tsx', import.meta.url), 'utf8');
  assert.match(shell, /workspace === 'design'/);
  assert.equal(shell.includes('createBrowserRouter'), false);
});

test('navigation uses canonical rooms and does not invent garments or delivery', () => {
  assert.deepEqual(
    NAV_SECTIONS.map((section) => section.id),
    ['atelier', 'operations', 'workspace', 'platform']
  );
  const labels = NAV_SECTIONS.flatMap((section) => section.items.map((item) => item.label.toLowerCase()));
  assert.equal(labels.includes('garments'), false);
  assert.equal(labels.includes('delivery'), false);
  assert.ok(labels.includes('client room'));
  assert.ok(labels.includes('control center'));
});

test('command palette groups use existing rooms only', () => {
  const source = readFileSync(new URL('./StudioShell.tsx', import.meta.url), 'utf8');
  assert.match(source, /group: 'Rooms'/);
  assert.match(source, /group: 'Ledger'/);
  assert.match(source, /group: 'Work'/);
  assert.match(source, /group: 'Account'/);
  assert.match(source, /group: 'Operator'/);
  assert.equal(source.includes("group: 'Create'"), false);
});

test('studio shell composes atelier primitives without engines', () => {
  const shell = readFileSync(new URL('./StudioShell.tsx', import.meta.url), 'utf8');
  assert.match(shell, /AtelierShell/);
  assert.match(shell, /AtelierNavigation/);
  assert.match(shell, /CommandPalette/);
  assert.match(shell, /WorkspaceHeader/);
  assert.equal(shell.includes('patternEngine'), false);
});

test('control center presents API fields without inventing metrics', () => {
  const source = readFileSync(new URL('../control/ControlCenter.tsx', import.meta.url), 'utf8');
  assert.match(source, /CommandPayload/);
  assert.equal(source.includes('totalRevenue'), false);
  assert.match(source, /do not invent metrics/);
  assert.match(source, /PLANE_GROUPS/);
  assert.match(source, /\/control\/billing\/provider/);
});

test('design studio frame does not import engines', () => {
  const source = readFileSync(new URL('../atelier/DesignStudioFrame.tsx', import.meta.url), 'utf8');
  assert.equal(/from ['"].*patternEngine/.test(source), false);
  assert.equal(/from ['"].*productionAssistant/.test(source), false);
  assert.match(source, /Hosted — not rewritten/);
});
