/**
 * Phase 14 immutable garment specification version.
 * Independent of MeasurementVersion. Create-only. No silent freeze.
 */

import type { CanonicalGarmentSpecification } from './contract';
import { evaluateGarmentSpecification } from './evaluate';
import { fingerprintGarmentSpecification } from './canonicalize';
import {
  createGarmentProvenance,
  type GarmentSpecificationProvenance,
  type GarmentSpecificationSource,
} from './provenance';
import type { GarmentIntentInput } from './contract';

export type GarmentSpecificationVersionRecord = {
  kind: 'GarmentSpecificationVersion';
  frozen: true;
  id: string;
  schemaVersion: 1;
  specification: CanonicalGarmentSpecification;
  fingerprint: {
    algorithm: 'fnv1a-64';
    value: string;
    cryptographic: false;
  };
  provenance: GarmentSpecificationProvenance;
  createdAt: string;
};

function newVersionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `gsv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function freezeGarmentSpecification(input: {
  intent: GarmentIntentInput;
  source?: GarmentSpecificationSource;
  extractionPath?: GarmentSpecificationProvenance['extractionPath'];
  id?: string;
  createdAt?: string;
}): GarmentSpecificationVersionRecord {
  const evaluated = evaluateGarmentSpecification(input.intent, {
    source: input.source,
    extractionPath: input.extractionPath,
  });
  const fingerprint = fingerprintGarmentSpecification(evaluated.canonical);
  const createdAt = input.createdAt || new Date().toISOString();
  const provenance = createGarmentProvenance({
    source: input.source || 'manual',
    extractionPath: input.extractionPath || 'manual',
    authorityLevel: 'frozen',
  });

  return {
    kind: 'GarmentSpecificationVersion',
    frozen: true,
    id: input.id || newVersionId(),
    schemaVersion: 1,
    specification: evaluated.canonical,
    fingerprint,
    provenance,
    createdAt,
  };
}

export function assertGarmentSpecificationFrozen(record: GarmentSpecificationVersionRecord): void {
  if (record.kind !== 'GarmentSpecificationVersion' || record.frozen !== true) {
    throw new Error('STOP: garment specification version is not frozen');
  }
}

export function refuseFrozenGarmentSpecificationMutation(
  frozen: GarmentSpecificationVersionRecord,
  patch: Record<string, unknown>
): never {
  assertGarmentSpecificationFrozen(frozen);
  const keys = Object.keys(patch).join(',') || 'empty patch';
  throw new Error(
    `STOP: frozen garment specification version ${frozen.id} cannot be patched (${keys})`
  );
}

export function historicalGarmentSpecificationIntact(
  frozen: GarmentSpecificationVersionRecord,
  expected: CanonicalGarmentSpecification
): boolean {
  assertGarmentSpecificationFrozen(frozen);
  return fingerprintGarmentSpecification(frozen.specification).value ===
    fingerprintGarmentSpecification(expected).value;
}
