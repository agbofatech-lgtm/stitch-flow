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
  assert.equal(prefersReducedMotion(), false);
});

test('experience layer does not import protected engines', () => {
  const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
  assert.equal(source.includes('patternEngine'), false);
  assert.equal(source.includes('productionAssistant'), false);
  assert.equal(source.includes('localStorage'), false);
});

test('T2 domain-merge policy remains after T4', () => {
  assert.equal(ENTITY_CONFLICT_POLICY.measurement, 'domain-merge');
  assert.equal(ENTITY_CONFLICT_POLICY.order, 'domain-merge');
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
