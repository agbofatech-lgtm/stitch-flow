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
  assert.match(home, /selectCustomer/);
  assert.match(home, /continueToMeasurements/);
  assert.match(home, /selectOrder/);
  assert.equal(home.includes('totalRevenue'), false);
});

test('measurement table does not borrow the first profile as the thread', () => {
  const source = readFileSync(new URL('./MeasurementWorkspace.tsx', import.meta.url), 'utf8');
  assert.equal(source.includes('rows[0]?.customer'), false);
  assert.match(source, /workflow.customerId/);
  assert.match(source, /AtelierWorkroom/);
  assert.match(source, /data-measurement-class="body"/);
  assert.match(source, /data-measurement-class="garment"/);
  assert.match(source, /data-measurement-class="pattern"/);
  assert.match(source, /Begin a live profile/);
  assert.match(source, /Freeze onto order/);
  assert.match(source, /isFreezeMilestone/);
  assert.match(source, /min-h-11 font-numeric/);
  assert.match(source, /Show all body fields/);
  assert.match(source, /Version and governed tools/);
  assert.match(source, /AtelierJourney/);
  assert.equal(source.includes('/frozen|fingerprint/i'), false);
  assert.equal(/from ['"].*patternEngine/.test(source), false);
});

test('client room is an AppContext relationship workspace, not HTTP CRUD', () => {
  const source = readFileSync(new URL('../components/Customers.tsx', import.meta.url), 'utf8');
  assert.match(source, /AtelierWorkroom/);
  assert.match(source, /selectCustomer/);
  assert.match(source, /Continue to measurements/);
  assert.match(source, /Receive client/);
  assert.match(source, /Garment history/);
  assert.match(source, /Same people as the Floor/);
  assert.match(source, /Select a client/);
  assert.match(source, /data-client-identity/);
  assert.match(source, /AtelierJourney/);
  assert.match(source, /selectOrder/);
  assert.equal(source.includes('customerApi'), false);
  assert.equal(source.includes('getCustomers'), false);
  assert.equal(source.includes('createCustomer'), false);
  assert.equal(source.includes('Source:'), false);
  assert.equal(source.includes('/customers'), false);
  assert.equal(source.includes('recentCustomers[0]'), false);
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
  assert.match(shell, /garment=\{selectedOrder\?\.garmentType/);
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
  assert.match(shell, /workflowCustomer/);
  assert.match(shell, /showPlaceNext/);
  assert.match(shell, /workspace === 'design' && !settingsOpen && !controlOpen \? 'sm:hidden'/);
  assert.equal(shell.includes('patternEngine'), false);
});

test('control center presents API fields without inventing metrics', () => {
  const source = readFileSync(new URL('../control/ControlCenter.tsx', import.meta.url), 'utf8');
  assert.match(source, /CommandPayload/);
  assert.equal(source.includes('totalRevenue'), false);
  assert.match(source, /do not invent metrics/);
  assert.match(source, /PLANE_GROUPS/);
  assert.match(source, /\/control\/billing\/provider/);
  assert.match(source, /AtelierWorkroom/);
  assert.match(source, /Return to atelier/);
  assert.match(source, /not connected in this runtime/);
  assert.match(source, /Open workspace settings/);
  assert.match(source, /Protected tailoring systems/);
  assert.match(source, /FeatureGate is UX presentation only/);
  assert.match(source, /ADR-007/);
  assert.match(source, /data-control-section/);
  assert.equal(source.includes('Synced'), false);
  assert.equal(source.includes('Platform protected'), false);
});

test('studio shell quiets atelier chrome on the operator plane', () => {
  const shell = readFileSync(new URL('./StudioShell.tsx', import.meta.url), 'utf8');
  assert.match(shell, /!controlOpen && !settingsOpen/);
  assert.match(shell, /controlOpen \? null/);
  assert.match(shell, /StitchFlow operator plane/);
  assert.match(shell, /onOpenSettings/);
});

test('ledger orders station uses AppContext commercial records, not unmounted HTTP', () => {
  const source = readFileSync(new URL('../components/Orders.tsx', import.meta.url), 'utf8');
  assert.match(source, /AtelierWorkroom/);
  assert.match(source, /selectOrder/);
  assert.match(source, /does not invent an order/);
  assert.match(source, /does not borrow the first order/);
  assert.match(source, /No invoice record exists for this order/);
  assert.match(source, /No payment record is available/);
  assert.equal(source.includes('fetchOrders'), false);
  assert.equal(source.includes('fetchOrderProductionStages'), false);
  assert.equal(source.includes('transitionOrderProductionStage'), false);
  assert.equal(source.includes('totalRevenue'), false);
  assert.equal(source.includes('Stripe'), false);
  assert.equal(source.includes('Paystack'), false);
});

test('ledger invoices station uses AppContext, not unmounted HTTP', () => {
  const source = readFileSync(new URL('../components/Invoices.tsx', import.meta.url), 'utf8');
  assert.match(source, /AtelierWorkroom/);
  assert.match(source, /No invoice record exists for this order/);
  assert.equal(source.includes('fetchInvoices'), false);
  assert.equal(source.includes('getCustomers'), false);
  assert.equal(source.includes('createInvoice'), false);
  assert.equal(source.includes('createPayment'), false);
  assert.equal(source.includes('API_BASE'), false);
  assert.equal(source.includes('Paystack'), false);
});

test('production floor uses AppContext orders, not unmounted HTTP', () => {
  const source = readFileSync(new URL('../components/ProductionBoard.tsx', import.meta.url), 'utf8');
  assert.match(source, /AtelierWorkroom/);
  assert.match(source, /selectOrder/);
  assert.match(source, /PRODUCTION_STAGE_SEQUENCE/);
  assert.match(source, /does not invent a garment in motion/);
  assert.match(source, /does not borrow the first order/);
  assert.equal(source.includes('fetchOrders'), false);
  assert.equal(source.includes('getCustomers'), false);
  assert.equal(source.includes('customerApi'), false);
  assert.equal(source.includes('API_BASE'), false);
  assert.equal(source.includes('buildStagesFromStatus'), false);
  assert.equal(source.includes('filteredOrders[0]'), false);
  assert.equal(source.includes('productionAssistant'), false);
  assert.equal(/from ['"].*patternEngine/.test(source), false);
});

test('design studio frame does not import engines', () => {
  const source = readFileSync(new URL('../atelier/DesignStudioFrame.tsx', import.meta.url), 'utf8');
  assert.equal(/from ['"].*patternEngine/.test(source), false);
  assert.equal(/from ['"].*productionAssistant/.test(source), false);
  assert.match(source, /Hosted — not rewritten/);
  assert.match(source, /density="canvas"/);
  assert.match(source, /data-design-host/);
  assert.match(source, /AtelierJourney/);
  assert.match(source, /does not invent a client/);
  assert.equal(source.includes('Finalize for Production'), false);
});
