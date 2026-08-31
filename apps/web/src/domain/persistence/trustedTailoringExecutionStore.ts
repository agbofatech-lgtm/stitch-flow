/**
 * Phase 16 execution snapshots persist through the T2 production repository.
 * References version ids. No new localStorage key. Create-only.
 */

import type { EntityRepository } from '../../shared/persistence/repository';
import { getDataAuthorityRuntime } from '../../shared/persistence/bootstrap';
import { requireOwner } from '../ownership';
import {
  assertTrustedExecutionFrozen,
  freezeTrustedTailoringExecution,
  refuseFrozenExecutionMutation,
  type TrustedTailoringExecutionRecord,
} from '../tailoring/execution/version';
import type { TrustedExecutionInput } from '../tailoring/execution/execute';

requireOwner('local-persistence');

export function getProductionRepository(): EntityRepository {
  const runtime = getDataAuthorityRuntime();
  if (!runtime) {
    throw new Error('T2 data authority runtime is not started');
  }
  return runtime.repositories.production;
}

export async function persistTrustedTailoringExecution(
  repository: EntityRepository,
  input: TrustedExecutionInput
) {
  const version = freezeTrustedTailoringExecution(input);
  assertTrustedExecutionFrozen(version);
  return repository.create(version as unknown as Record<string, unknown>);
}

export async function readTrustedTailoringExecution(
  repository: EntityRepository,
  localId: string
): Promise<TrustedTailoringExecutionRecord | null> {
  const record = await repository.get(localId);
  if (!record) return null;
  const payload = record.payload as TrustedTailoringExecutionRecord;
  assertTrustedExecutionFrozen(payload);
  return payload;
}

export async function rejectFrozenExecutionUpdate(
  repository: EntityRepository,
  localId: string,
  patch: Record<string, unknown>
): Promise<never> {
  const current = await readTrustedTailoringExecution(repository, localId);
  if (!current) {
    throw new Error(`STOP: trusted execution ${localId} not found`);
  }
  return refuseFrozenExecutionMutation(current, patch);
}
