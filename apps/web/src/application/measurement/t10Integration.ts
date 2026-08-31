/**
 * Phase 13 → T10 integration.
 * Frozen MeasurementVersion → completeness gate → governed deterministic pattern.
 * Does not rewrite Design Studio. Does not apply hip/bust engine defaults.
 */

import { engineInputFromVersion } from '../../domain/measurement/contract';
import {
  assessPatternInputCompleteness,
  assertPatternInputComplete,
} from '../../domain/measurement/completeness';
import type { PatternKind } from '../../domain/measurement/fields';
import type { MeasurementVersionRecord } from '../../domain/measurement/version';
import { assertFrozenVersionAuthority } from './versionAuthority';
import { governedPatternFromLoose } from '../tailoring/governedAdapter';
import type { DeterministicComputationResult } from '../../domain/tailoring/deterministic';
import type { StylePatternResult } from '../design/patternAdapter';

export function executeGovernedPatternFromVersion(
  version: MeasurementVersionRecord,
  kind: PatternKind
): DeterministicComputationResult<StylePatternResult> {
  assertFrozenVersionAuthority(version);
  const completeness = assessPatternInputCompleteness(
    { body: version.body, garment: version.garment, pattern: version.pattern },
    kind
  );
  assertPatternInputComplete(completeness);
  const measurements = engineInputFromVersion(version);
  return governedPatternFromLoose({
    kind,
    measurements,
    declaredUnit: version.canonicalUnit,
    measurementVersionId: version.id,
  });
}
