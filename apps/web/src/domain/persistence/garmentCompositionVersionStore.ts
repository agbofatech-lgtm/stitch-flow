/**
 * Phase 15 composition versions persist through the T2 garment repository.
 * No new localStorage key. Frozen records are create-only.
 */

import type { EntityRepository } from '../../shared/persistence/repository';
import { getDataAuthorityRuntime } from '../../shared/persistence/bootstrap';
import { requireOwner } from '../ownership';
import {
  assertCompositionFrozen,
  freezeComposition,
  refuseFrozenCompositionMutation,
  type GarmentCompositionVersionRecord,
} from '../composition/version';
import type { GarmentSpecificationVersionRecord } from '../garment/version';
import type { ExplicitStructuralSelection } from '../composition/contract';

requireOwner('local-persistence');

export function getGarmentRepositoryForComposition(): EntityRepository {
  const runtime = getDataAuthorityRuntime();
  if (!runtime) {
    throw new Error('T2 data authority runtime is not started');
  }
  return runtime.repositories.garment;
}

export async function persistGarmentCompositionVersion(
  repository: EntityRepository,
  input: {
    specificationVersion: GarmentSpecificationVersionRecord;
    explicitSelections?: ExplicitStructuralSelection[];
  }
) {
  const version = freezeComposition(input);
  assertCompositionFrozen(version);
  return repository.create(version as unknown as Record<string, unknown>);
}

export async function readGarmentCompositionVersion(
  repository: EntityRepository,
  localId: string
): Promise<GarmentCompositionVersionRecord | null> {
  const record = await repository.get(localId);
  if (!record) return null;
  const payload = record.payload as GarmentCompositionVersionRecord;
  assertCompositionFrozen(payload);
  return payload;
}

export async function rejectFrozenCompositionUpdate(
  repository: EntityRepository,
  localId: string,
  patch: Record<string, unknown>
): Promise<never> {
  const current = await readGarmentCompositionVersion(repository, localId);
  if (!current) {
    throw new Error(`STOP: garment composition version ${localId} not found`);
  }
  return refuseFrozenCompositionMutation(current, patch);
}
