/**
 * T8 measurement versions persist through the T2 measurement repository.
 * No new localStorage key. Frozen records are create-only.
 */

import type { EntityRepository } from '../../shared/persistence/repository';
import { getDataAuthorityRuntime } from '../../shared/persistence/bootstrap';
import { requireOwner } from '../ownership';
import {
  assertVersionFrozen,
  freezeMeasurementVersion,
  refuseFrozenMutation,
  type MeasurementVersionRecord,
} from '../measurement/version';
import type { LengthUnit } from '../measurement/units';
import type { PatternKind } from '../measurement/fields';
import type { MeasurementCaptureSource, VerificationStatus } from '../measurement/provenance';

requireOwner('local-persistence');

export function getMeasurementRepository(): EntityRepository {
  const runtime = getDataAuthorityRuntime();
  if (!runtime) {
    throw new Error('T2 data authority runtime is not started');
  }
  return runtime.repositories.measurement;
}

export async function persistMeasurementVersion(
  repository: EntityRepository,
  input: {
    blob: Record<string, unknown>;
    declaredUnit?: LengthUnit;
    patternKind?: PatternKind;
    customerId?: string | null;
    profileId?: string | null;
    orderId?: string | null;
    capturedBy?: string | null;
    source?: MeasurementCaptureSource;
    verification?: VerificationStatus;
  }
) {
  const version = freezeMeasurementVersion(input);
  assertVersionFrozen(version);
  return repository.create(version as unknown as Record<string, unknown>);
}

export async function readMeasurementVersion(
  repository: EntityRepository,
  localId: string
): Promise<MeasurementVersionRecord | null> {
  const record = await repository.get(localId);
  if (!record) return null;
  const payload = record.payload as MeasurementVersionRecord;
  assertVersionFrozen(payload);
  return payload;
}

export async function rejectFrozenVersionUpdate(
  repository: EntityRepository,
  localId: string,
  patch: Record<string, unknown>
): Promise<never> {
  const current = await readMeasurementVersion(repository, localId);
  if (!current) {
    throw new Error(`STOP: measurement version ${localId} not found`);
  }
  return refuseFrozenMutation(current, patch);
}
