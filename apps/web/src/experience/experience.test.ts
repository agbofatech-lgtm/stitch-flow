import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { color, radius, zIndex } from './tokens/tokens';
import { cn } from './lib/cn';
import { Button } from './primitives/Button';
import { Field, Input } from './primitives/forms';
import { DataTable } from './primitives/DataTable';
import { ErrorState } from './primitives/feedback';
import { motionDuration, prefersReducedMotion } from './motion/motion';
import { ENTITY_CONFLICT_POLICY } from '../shared/persistence/conflict';

test('semantic tokens exist for required surfaces and status', () => {
  assert.match(color.canvas, /--sf-surface-canvas/);
  assert.match(color.floating, /--sf-surface-floating/);
  assert.match(color.actionPrimary, /--sf-action-primary/);
  assert.match(color.success, /--sf-status-success/);
  assert.match(color.focusRing, /--sf-focus-ring/);
  assert.match(radius.workspace, /--sf-radius-workspace/);
  assert.equal(zIndex.modal, 'var(--sf-z-modal)');
});

test('cn merges tailwind classes without losing focus ring', () => {
  assert.equal(cn('px-2 px-4', 'sf-focus-ring'), 'px-4 sf-focus-ring');
});

test('Button exposes disabled and loading states', () => {
  const html = renderToStaticMarkup(
    createElement(Button, { disabled: true }, 'Save')
  );
  assert.match(html, /disabled/);
  const loading = renderToStaticMarkup(createElement(Button, { loading: true }, 'Save'));
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /Loading/);
});

test('Field associates label with control', () => {
  const html = renderToStaticMarkup(
    createElement(Field, { label: 'Name', htmlFor: 'cust-name', required: true }, createElement(Input, { id: 'cust-name' }))
  );
  assert.match(html, /for="cust-name"/);
  assert.match(html, /id="cust-name"/);
});

test('DataTable empty state does not invent domain rows', () => {
  const html = renderToStaticMarkup(
    createElement(DataTable, {
      caption: 'Empty',
      columns: [{ id: 'n', header: 'Name', cell: (row: { id: string; n: string }) => row.n }],
      rows: [],
    })
  );
  assert.match(html, /No rows/);
});

test('motion durations are professional-speed, not decorative', () => {
  assert.ok(motionDuration.base <= 0.25);
  assert.ok(motionDuration.milestone <= 0.36);
  assert.equal(prefersReducedMotion(), false);
});

test('workspace journey slides forward toward production, not a random fade', () => {
  const { workspacePreset } = require('./motion/motion') as typeof import('./motion/motion');
  const forward = workspacePreset('command', 'measurements');
  const back = workspacePreset('production', 'clients');
  assert.equal((forward.initial as { x: number }).x > 0, true);
  assert.equal((back.initial as { x: number }).x < 0, true);
});

test('reduced motion keeps opacity feedback instead of removing state change', () => {
  const { motionOrInstant, motionPresets } = require('./motion/motion') as typeof import('./motion/motion');
  const reduced = motionOrInstant(motionPresets.modal);
  assert.equal((reduced.animate as { opacity: number }).opacity, 1);
});

test('experience layer does not import protected engines', () => {
  const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
  assert.equal(source.includes('patternEngine'), false);
  assert.equal(source.includes('productionAssistant'), false);
  assert.equal(source.includes('localStorage'), false);
});

test('shop-critical entities do not silent-merge after SAC-5', () => {
  assert.equal(ENTITY_CONFLICT_POLICY.measurement, 'detect-only');
  assert.equal(ENTITY_CONFLICT_POLICY.order, 'detect-only');
});

test('command palette groups and filters without inventing destinations', () => {
  const { filterCommands, groupCommands } = require('./shell/commands') as typeof import('./shell/commands');
  const commands = [
    { id: 'a', label: 'Atelier Home', group: 'Navigate', onSelect: () => undefined },
    { id: 'b', label: 'Orders', group: 'Operations', onSelect: () => undefined },
    { id: 'c', label: 'Control Center', group: 'Platform', onSelect: () => undefined },
  ];
  const grouped = groupCommands(commands);
  assert.deepEqual(grouped.map((item) => item.group), ['Navigate', 'Operations', 'Platform']);
  assert.equal(filterCommands(commands, 'control')[0].id, 'c');
  assert.equal(filterCommands(commands, 'garment-delivery-invented').length, 0);
});

test('atelier shell exposes skip link and workspace main', () => {
  const { AtelierShell } = require('./shell/AtelierShell') as typeof import('./shell/AtelierShell');
  const html = renderToStaticMarkup(
    createElement(AtelierShell, {
      navigation: createElement('nav', null, 'nav'),
      header: createElement('header', null, 'header'),
      children: 'canvas',
    })
  );
  assert.match(html, /Skip to workspace/);
  assert.match(html, /id="workspace-main"/);
  assert.match(html, /data-plane="atelier"/);
});

test('atelier workroom exposes place identity without a second layout system', () => {
  const { AtelierWorkroom } = require('./atelier/atelier') as typeof import('./atelier/atelier');
  const html = renderToStaticMarkup(
    createElement(AtelierWorkroom, { place: 'Floor', title: 'My Workspace' }, 'canvas')
  );
  assert.match(html, /data-workroom="Floor"/);
  assert.match(html, /My Workspace/);
});

test('command palette is a room navigator with 44px targets', () => {
  const source = readFileSync(new URL('./shell/CommandPalette.tsx', import.meta.url), 'utf8');
  assert.match(source, /Go to a room/);
  assert.match(source, /min-h-11/);
  assert.equal(source.includes('Create invoice'), false);
});

test('error state can include recovery action', () => {
  const html = renderToStaticMarkup(
    createElement(ErrorState, {
      description: 'Plane request failed',
      action: createElement('button', { type: 'button' }, 'Retry'),
    })
  );
  assert.match(html, /Retry/);
  assert.match(html, /role="alert"/);
});

test('page header can render as h2 so rooms do not duplicate shell h1', () => {
  const { PageHeader } = require('./layout/layout') as typeof import('./layout/layout');
  const html = renderToStaticMarkup(
    createElement(PageHeader, { title: 'Customers', level: 2, kicker: 'Client studio' })
  );
  assert.match(html, /<h2/);
  assert.equal(html.includes('<h1'), false);
});

test('feature gate does not open a fake billing flow', () => {
  const source = readFileSync(new URL('../components/FeatureGate.tsx', import.meta.url), 'utf8');
  assert.equal(source.includes('window.alert'), false);
  assert.equal(source.includes('Upgrade to'), false);
  assert.match(source, /UX presentation only/);
});

test('dialog traps tab and restores focus on escape path', () => {
  const source = readFileSync(new URL('./primitives/overlays.tsx', import.meta.url), 'utf8');
  assert.match(source, /event.key !== 'Tab'/);
  assert.match(source, /Escape/);
  assert.match(source, /previous\?\.focus/);
  assert.match(source, /aria-modal/);
  assert.match(source, /size === 'lg'/);
});

test('customers workroom uses shared Dialog not ModalShell', () => {
  const source = readFileSync(new URL('../components/Customers.tsx', import.meta.url), 'utf8');
  assert.equal(source.includes('ModalShell'), false);
  assert.match(source, /Dialog open/);
});

test('atelier atmosphere and skip link tokens exist', () => {
  const css = readFileSync(new URL('./tokens/tokens.css', import.meta.url), 'utf8');
  assert.match(css, /\.sf-atelier-atmosphere/);
  assert.match(css, /\.sf-skip-link/);
  assert.match(css, /--sf-surface-subtle/);
  assert.match(css, /--sf-confidence-local/);
  assert.match(css, /--sf-touch-min/);
});

test('atelier thread and confidence do not claim remote sync', () => {
  const { AtelierThread, AtelierConfidence } = require('./atelier/atelier') as typeof import('./atelier/atelier');
  const thread = renderToStaticMarkup(
    createElement(AtelierThread, { room: 'Floor', client: 'Ama' })
  );
  assert.match(thread, /Client Ama/);
  const local = renderToStaticMarkup(createElement(AtelierConfidence, { state: 'local' }));
  assert.match(local, /Local workspace/);
  assert.equal(local.includes('Acknowledged remotely'), false);
});

test('reduced-motion foundation remains in tokens', () => {
  const css = readFileSync(new URL('./tokens/tokens.css', import.meta.url), 'utf8');
  assert.match(css, /prefers-reduced-motion/);
});
