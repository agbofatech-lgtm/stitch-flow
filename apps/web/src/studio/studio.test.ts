import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  businessSurfaceFromView,
  viewForWorkspace,
  workspaceFromView,
  STUDIO_WORKSPACES,
} from './workspaces';

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
});

test('design workspace still hosts DesignStudio without a new router', () => {
  const shell = readFileSync(new URL('./StudioShell.tsx', import.meta.url), 'utf8');
  assert.match(shell, /workspace === 'design'/);
  assert.equal(shell.includes('createBrowserRouter'), false);
});
