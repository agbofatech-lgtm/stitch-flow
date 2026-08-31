/**
 * T3 measurement persistence consumes T2 repositories.
 * No new localStorage keys.
 */

import type { EntityRepository } from '../../shared/persistence/repository';
import { getDataAuthorityRuntime } from '../../shared/persistence/bootstrap';
import {
  flattenSeparated,
  separateLegacyMeasurementBlob,
  type SeparatedMeasurements,
} from '../measurement/separate';
import type { PatternKind } from '../measurement/fields';
import { requireOwner } from '../ownership';

requireOwner('local-persistence');

export type MeasurementRecordPayload = {
  kind: 'MeasurementSet';
  customerId?: string;
  patternKind?: PatternKind;
  body: SeparatedMeasurements['body'];
  garment: SeparatedMeasurements['garment'];
  pattern?: SeparatedMeasurements['pattern'];
};

export function getMeasurementRepository(): EntityRepository {
  const runtime = getDataAuthorityRuntime();
  if (!runtime) {
    throw new Error('T2 data authority runtime is not started');
  }
  return runtime.repositories.measurement;
}

export async function persistSeparatedMeasurements(
  repository: EntityRepository,
  input: {
    blob: Record<string, unknown>;
    customerId?: string;
    patternKind?: PatternKind;
    localId?: string;
  }
) {
  const separated = separateLegacyMeasurementBlob(input.blob, input.patternKind);
  const payload: MeasurementRecordPayload = {
    kind: 'MeasurementSet',
    customerId: input.customerId,
    patternKind: input.patternKind,
    body: separated.body,
    garment: separated.garment,
    pattern: separated.pattern,
  };

  if (input.localId) {
    return repository.update(input.localId, payload as unknown as Record<string, unknown>);
  }
  return repository.create(payload as unknown as Record<string, unknown>);
}

export function legacyBlobFromPayload(payload: MeasurementRecordPayload): Record<string, unknown> {
  return flattenSeparated({
    body: payload.body,
    garment: payload.garment,
    pattern: payload.pattern,
  });
}
