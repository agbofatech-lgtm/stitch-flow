/**
 * Phase 14 garment specification versions persist through the T2 garment repository.
 * No new localStorage key. Frozen records are create-only.
 */

import type { EntityRepository } from '../../shared/persistence/repository';
import { getDataAuthorityRuntime } from '../../shared/persistence/bootstrap';
import { requireOwner } from '../ownership';
import {
  assertGarmentSpecificationFrozen,
  freezeGarmentSpecification,
  refuseFrozenGarmentSpecificationMutation,
  type GarmentSpecificationVersionRecord,
} from '../garment/version';
import type { GarmentIntentInput } from '../garment/contract';
import type { GarmentSpecificationProvenance, GarmentSpecificationSource } from '../garment/provenance';

requireOwner('local-persistence');

export function getGarmentRepository(): EntityRepository {
  const runtime = getDataAuthorityRuntime();
  if (!runtime) {
    throw new Error('T2 data authority runtime is not started');
  }
  return runtime.repositories.garment;
}

export async function persistGarmentSpecificationVersion(
  repository: EntityRepository,
  input: {
    intent: GarmentIntentInput;
    source?: GarmentSpecificationSource;
    extractionPath?: GarmentSpecificationProvenance['extractionPath'];
  }
) {
  const version = freezeGarmentSpecification(input);
  assertGarmentSpecificationFrozen(version);
  return repository.create(version as unknown as Record<string, unknown>);
}

export async function readGarmentSpecificationVersion(
  repository: EntityRepository,
  localId: string
): Promise<GarmentSpecificationVersionRecord | null> {
  const record = await repository.get(localId);
  if (!record) return null;
  const payload = record.payload as GarmentSpecificationVersionRecord;
  assertGarmentSpecificationFrozen(payload);
  return payload;
}

export async function rejectFrozenGarmentSpecificationUpdate(
  repository: EntityRepository,
  localId: string,
  patch: Record<string, unknown>
): Promise<never> {
  const current = await readGarmentSpecificationVersion(repository, localId);
  if (!current) {
    throw new Error(`STOP: garment specification version ${localId} not found`);
  }
  return refuseFrozenGarmentSpecificationMutation(current, patch);
}
