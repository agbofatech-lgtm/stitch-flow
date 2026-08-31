/**
 * T8 immutable measurement version.
 * Historical truth is a frozen record — live profiles must not patch it.
 */

import {
  projectPatternMeasurements,
  separateLegacyMeasurementBlob,
  type SeparatedMeasurements,
} from './separate';
import { createProvenance, type MeasurementProvenance } from './provenance';
import {
  ENGINE_LENGTH_UNIT,
  convertFieldMap,
  type LengthUnit,
  assertLengthUnit,
} from './units';
import type { PatternKind } from './fields';

export type MeasurementVersionRecord = {
  kind: 'MeasurementVersion';
  frozen: true;
  id: string;
  customerId?: string | null;
  profileId?: string | null;
  orderId?: string | null;
  declaredUnit: LengthUnit;
  canonicalUnit: typeof ENGINE_LENGTH_UNIT;
  body: SeparatedMeasurements['body'];
  garment: SeparatedMeasurements['garment'];
  pattern?: SeparatedMeasurements['pattern'];
  provenance: MeasurementProvenance;
  capturedAt: string;
};

function newVersionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `mv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function freezeMeasurementVersion(input: {
  blob: Record<string, unknown>;
  declaredUnit?: LengthUnit;
  patternKind?: PatternKind;
  customerId?: string | null;
  profileId?: string | null;
  orderId?: string | null;
  capturedBy?: string | null;
  capturedAt?: string;
  version?: number;
  source?: MeasurementProvenance['source'];
  verification?: MeasurementProvenance['verification'];
  id?: string;
}): MeasurementVersionRecord {
  const declaredUnit = input.declaredUnit || ENGINE_LENGTH_UNIT;
  assertLengthUnit(declaredUnit);

  const separated = separateLegacyMeasurementBlob(input.blob, input.patternKind);
  const bodyFields =
    declaredUnit === ENGINE_LENGTH_UNIT
      ? separated.body.fields
      : convertFieldMap(separated.body.fields, declaredUnit, ENGINE_LENGTH_UNIT);
  const garmentFields =
    declaredUnit === ENGINE_LENGTH_UNIT
      ? separated.garment.fields
      : convertFieldMap(separated.garment.fields, declaredUnit, ENGINE_LENGTH_UNIT);

  const canonical: SeparatedMeasurements = {
    body: { class: 'body', unit: ENGINE_LENGTH_UNIT, fields: bodyFields },
    garment: {
      class: 'garment',
      unit: ENGINE_LENGTH_UNIT,
      fields: garmentFields,
      notes: separated.garment.notes,
    },
  };
  if (input.patternKind) {
    canonical.pattern = projectPatternMeasurements(canonical, input.patternKind);
  }

  const provenance = createProvenance({
    source: input.source || 'body-capture',
    capturedBy: input.capturedBy,
    capturedAt: input.capturedAt,
    version: input.version,
    verification: input.verification,
  });

  return {
    kind: 'MeasurementVersion',
    frozen: true,
    id: input.id || newVersionId(),
    customerId: input.customerId ?? null,
    profileId: input.profileId ?? null,
    orderId: input.orderId ?? null,
    declaredUnit,
    canonicalUnit: ENGINE_LENGTH_UNIT,
    body: canonical.body,
    garment: canonical.garment,
    pattern: canonical.pattern,
    provenance,
    capturedAt: provenance.capturedAt,
  };
}

export function assertVersionFrozen(record: MeasurementVersionRecord): void {
  if (record.kind !== 'MeasurementVersion' || record.frozen !== true) {
    throw new Error('STOP: measurement version is not frozen');
  }
}

export function cloneFrozenVersion(record: MeasurementVersionRecord): MeasurementVersionRecord {
  assertVersionFrozen(record);
  return structuredClone
    ? structuredClone(record)
    : (JSON.parse(JSON.stringify(record)) as MeasurementVersionRecord);
}

/**
 * Live profile numbers must not mutate a frozen version.
 * Compare the frozen payload to the numbers captured at freeze time.
 */
export function historicalVersionIntact(
  frozen: MeasurementVersionRecord,
  expectedCanonical: { body: Record<string, number>; garment: Record<string, number> }
): boolean {
  assertVersionFrozen(frozen);
  for (const [key, value] of Object.entries(expectedCanonical.body)) {
    if (frozen.body.fields[key] !== value) return false;
  }
  for (const [key, value] of Object.entries(expectedCanonical.garment)) {
    if (frozen.garment.fields[key] !== value) return false;
  }
  return true;
}

export function refuseFrozenMutation(
  frozen: MeasurementVersionRecord,
  patch: Record<string, unknown>
): never {
  assertVersionFrozen(frozen);
  const keys = Object.keys(patch).join(',') || 'empty patch';
  throw new Error(`STOP: frozen measurement version ${frozen.id} cannot be patched (${keys})`);
}
