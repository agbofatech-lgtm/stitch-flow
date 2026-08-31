/**
 * Phase 13 version authority. Freezes live blobs to T8 MeasurementVersion via T2.
 * Does not replace AppContext profiles. Does not patch frozen records.
 */

import type { EntityRepository } from '../../shared/persistence/repository';
import {
  persistMeasurementVersion,
  readMeasurementVersion,
} from '../../domain/persistence/measurementVersionStore';
import {
  assertVersionFrozen,
  refuseFrozenMutation,
  type MeasurementVersionRecord,
} from '../../domain/measurement/version';
import type { LengthUnit } from '../../domain/measurement/units';
import type { PatternKind } from '../../domain/measurement/fields';
import type { MeasurementCaptureSource, VerificationStatus } from '../../domain/measurement/provenance';
import { classifyMeasurementRecord } from '../../domain/measurement/taxonomy';

export async function freezeLiveBlobToVersion(
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
  const created = await persistMeasurementVersion(repository, {
    ...input,
    source: input.source || 'profile',
  });
  if (!created) {
    throw new Error('STOP: measurement version persist returned empty');
  }
  const loaded = await readMeasurementVersion(repository, created.metadata.localId);
  if (!loaded) {
    throw new Error('STOP: measurement version not readable after persist');
  }
  assertVersionFrozen(loaded);
  const taxonomy = classifyMeasurementRecord({ kind: loaded.kind, frozen: loaded.frozen });
  if (taxonomy.authority !== 'frozen-version') {
    throw new Error('STOP: persisted record is not a frozen measurement version');
  }
  return { record: created, version: loaded };
}

export function assertFrozenVersionAuthority(version: MeasurementVersionRecord): void {
  assertVersionFrozen(version);
  const taxonomy = classifyMeasurementRecord({ kind: version.kind, frozen: version.frozen });
  if (taxonomy.authority !== 'frozen-version' || taxonomy.mutability !== 'frozen') {
    throw new Error('STOP: record is not frozen version authority');
  }
}

export function rejectLivePatchOnFrozenVersion(
  version: MeasurementVersionRecord,
  liveProfile: Record<string, unknown>
): never {
  assertFrozenVersionAuthority(version);
  return refuseFrozenMutation(version, liveProfile);
}
