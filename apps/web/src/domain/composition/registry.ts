/**
 * Phase 15 composition rule registry.
 * Canonical required-component rules are intentionally empty (STOP-P15-C).
 * OBSERVED rules record existing mappings without promoting them to tailoring law.
 * DISABLED / PROVISIONAL / experimental rules must not affect evaluation.
 */

import type { RuleAuthority } from './taxonomy';
import { COMPOSITION_RULE_REGISTRY_VERSION } from './taxonomy';

export type CompositionRule = {
  id: string;
  authority: RuleAuthority;
  sourceEvidence: string[];
  description: string;
  experimental?: boolean;
};

/**
 * FACT: no CANONICAL required-component graph exists in this repository.
 * OBSERVED: T3 mapGarmentTypeToPatternKind is a computational projection.
 * OBSERVED: Production Assistant cutting lists exist but are heuristics — cited, not applied as components.
 */
export const COMPOSITION_RULES: readonly CompositionRule[] = [
  {
    id: 'OBS-PATTERN-PROJECTION',
    authority: 'OBSERVED',
    sourceEvidence: [
      'apps/web/src/domain/pattern/gateway.ts#mapGarmentTypeToPatternKind',
      'apps/web/src/domain/garment/taxonomy.ts#legacyPatternKindCompatibility',
    ],
    description:
      'Known GarmentType values have a legacy PatternKind projection. This is not composition identity.',
  },
  {
    id: 'OBS-PRODUCTION-CUTTING-LIST',
    authority: 'OBSERVED',
    sourceEvidence: ['apps/web/src/modules/services/productionAssistant.ts#buildCuttingList'],
    description:
      'Production Assistant emits heuristic cutting-piece names. Cited as observation only; not applied as components.',
  },
  {
    id: 'CANONICAL-REQUIRED-COMPONENTS',
    authority: 'DISABLED',
    sourceEvidence: ['docs/phases/phase-15/PHASE_15_GARMENT_COMPOSITION_FORENSICS.md'],
    description: 'No evidence-backed required-component sets. Disabled to avoid STOP-P15-C.',
  },
];

export function activeCompositionRules(): CompositionRule[] {
  return COMPOSITION_RULES.filter(
    (rule) =>
      rule.authority !== 'DISABLED' &&
      rule.authority !== 'PROVISIONAL' &&
      rule.experimental !== true
  );
}

export function canonicalRequiredComponentRules(): CompositionRule[] {
  return COMPOSITION_RULES.filter((rule) => rule.id === 'CANONICAL-REQUIRED-COMPONENTS').filter(
    (rule) => rule.authority === 'CANONICAL'
  );
}

export function compositionRuleRegistryVersion(): string {
  return COMPOSITION_RULE_REGISTRY_VERSION;
}
