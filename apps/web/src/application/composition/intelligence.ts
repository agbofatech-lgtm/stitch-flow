/**
 * Phase 15 application boundary: evaluate → explicit freeze → T2 version.
 * Consumes frozen GarmentSpecificationVersion. Does not mutate P13/P14.
 * Does not execute Pattern Engine or Production Assistant (Phase 16 LOCKED).
 */

import type { EntityRepository } from '../../shared/persistence/repository';
import { evaluateComposition } from '../../domain/composition/evaluate';
import type { ExplicitStructuralSelection } from '../../domain/composition/contract';
import { persistGarmentCompositionVersion } from '../../domain/persistence/garmentCompositionVersionStore';
import { assertCompositionFrozen } from '../../domain/composition/version';
import type { GarmentSpecificationVersionRecord } from '../../domain/garment/version';
import { assertGarmentSpecificationFrozen } from '../../domain/garment/version';

export function evaluateGovernedComposition(
  specificationVersion: GarmentSpecificationVersionRecord,
  explicitSelections?: ExplicitStructuralSelection[]
) {
  assertGarmentSpecificationFrozen(specificationVersion);
  return evaluateComposition({ specificationVersion, explicitSelections });
}

export async function freezeGovernedComposition(
  repository: EntityRepository,
  input: {
    specificationVersion: GarmentSpecificationVersionRecord;
    explicitSelections?: ExplicitStructuralSelection[];
  }
) {
  const evaluated = evaluateComposition(input);
  const record = await persistGarmentCompositionVersion(repository, input);
  if (!record) {
    throw new Error('STOP: garment composition version persist returned empty');
  }
  const version = record.payload as import('../../domain/composition/version').GarmentCompositionVersionRecord;
  assertCompositionFrozen(version);
  return { evaluated, record, version };
}

export async function loadCompositionVersion(
  repository: EntityRepository,
  localId: string
) {
  const record = await repository.get(localId);
  if (!record) return null;
  const version = record.payload as import('../../domain/composition/version').GarmentCompositionVersionRecord;
  assertCompositionFrozen(version);
  return version;
}
