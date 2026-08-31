import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIGURATION_AUTHORITY_REGISTRY,
  defaultsForPath,
  hipConflictUnresolved,
  selectConfigurationPath,
} from './configuration';

test('hip defaults remain path-specific and unresolved', () => {
  assert.equal(hipConflictUnresolved(), true);
  const engine = defaultsForPath('pattern-engine').find((row) => row.field === 'hip');
  const job = defaultsForPath('job-sheet').find((row) => row.field === 'hip');
  const assistant = defaultsForPath('production-assistant').find((row) => row.field === 'hip');
  assert.equal(engine?.value, 98);
  assert.equal(job?.value, 100);
  assert.equal(assistant?.value, 102);
  assert.equal(engine?.appliedByCore, false);
  assert.equal(selectConfigurationPath('pattern-engine'), 'pattern-engine');
});

test('core does not apply engine hip default itself', () => {
  const applied = CONFIGURATION_AUTHORITY_REGISTRY.filter((row) => row.appliedByCore);
  assert.deepEqual(
    applied.map((row) => row.field),
    ['CM_PER_INCH']
  );
});
