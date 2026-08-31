/**
 * Phase 14 application boundary: evaluate → explicit freeze → T2 version.
 * Does not compose MeasurementVersion into pattern execution (Phase 15 LOCKED).
 */

import type { EntityRepository } from '../../shared/persistence/repository';
import { evaluateGarmentSpecification } from '../../domain/garment/evaluate';
import type { GarmentIntentInput } from '../../domain/garment/contract';
import type { GarmentSpecificationSource } from '../../domain/garment/provenance';
import type { GarmentSpecificationProvenance } from '../../domain/garment/provenance';
import { persistGarmentSpecificationVersion } from '../../domain/persistence/garmentSpecificationVersionStore';
import { assertGarmentSpecificationFrozen } from '../../domain/garment/version';
import { extractStudioGarmentIntent } from './studioAdapter';

export function evaluateGovernedGarmentSpecification(
  intent: GarmentIntentInput,
  source: GarmentSpecificationSource = 'manual'
) {
  return evaluateGarmentSpecification(intent, { source, extractionPath: 'manual' });
}

export async function freezeGovernedGarmentSpecification(
  repository: EntityRepository,
  input: {
    intent: GarmentIntentInput;
    source?: GarmentSpecificationSource;
    extractionPath?: GarmentSpecificationProvenance['extractionPath'];
  }
) {
  const evaluated = evaluateGarmentSpecification(input.intent, {
    source: input.source,
    extractionPath: input.extractionPath,
  });
  const record = await persistGarmentSpecificationVersion(repository, input);
  if (!record) {
    throw new Error('STOP: garment specification version persist returned empty');
  }
  const version = record.payload as import('../../domain/garment/version').GarmentSpecificationVersionRecord;
  assertGarmentSpecificationFrozen(version);
  return { evaluated, record, version };
}

export async function freezeStudioGarmentSpecification(
  repository: EntityRepository,
  source: Record<string, unknown>
) {
  return freezeGovernedGarmentSpecification(repository, {
    intent: extractStudioGarmentIntent(source),
    source: 'studio',
    extractionPath: 'studio-adapter',
  });
}
