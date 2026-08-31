/**
 * Phase 15 composition evaluation.
 * Consumes frozen GarmentSpecificationVersion only.
 * Does not fill required components. Does not coerce unknown → bodice.
 * Does not call Pattern Engine or Production Assistant.
 */

import type { GarmentSpecificationVersionRecord } from '../garment/version';
import { assertGarmentSpecificationFrozen } from '../garment/version';
import { legacyPatternKindCompatibility } from '../garment/taxonomy';
import {
  COMPOSITION_RESOLVER_VERSION,
  COMPOSITION_SCHEMA_VERSION,
  orderClassForRole,
  type ComponentRole,
  type ComponentStatus,
  type ComponentType,
} from './taxonomy';
import type {
  CanonicalGarmentComposition,
  CompositionComponent,
  CompositionEvaluationReason,
  CompositionEvidence,
  ExplicitStructuralSelection,
  PatternProjectionObservation,
} from './contract';
import { fingerprintGarmentComposition } from './canonicalize';
import { sortCompositionComponents, sortCompositionRelationships } from './canonicalize';
import {
  activeCompositionRules,
  canonicalRequiredComponentRules,
  compositionRuleRegistryVersion,
} from './registry';
import {
  createCompositionProvenance,
  type CompositionProvenance,
} from './provenance';
import type { CompositionCompleteness } from './taxonomy';

export type GarmentCompositionEvaluation = {
  composition: CanonicalGarmentComposition;
  completeness: CompositionCompleteness;
  knownComponents: CompositionComponent[];
  unknownComponents: CompositionComponent[];
  unsupportedComponents: CompositionComponent[];
  evidence: CompositionEvidence[];
  provenance: CompositionProvenance;
  fingerprint: {
    algorithm: 'fnv1a-64';
    value: string;
    cryptographic: false;
  };
  deterministicVersion: typeof COMPOSITION_RESOLVER_VERSION;
  reason: CompositionEvaluationReason;
};

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'x';
}

function evidenceId(sourceType: string, reference: string): string {
  return `ev-${slug(sourceType)}-${slug(reference)}`;
}

function componentId(input: {
  componentType: ComponentType;
  role: ComponentRole;
  source: string;
  label?: string;
}): string {
  const labelPart = input.label ? `-${slug(input.label)}` : '';
  return `cmp-${input.componentType}-${input.role}-${slug(input.source)}${labelPart}`;
}

function assertNoLiveStudio(input: GarmentSpecificationVersionRecord): void {
  assertGarmentSpecificationFrozen(input);
}

/**
 * Authority order (do not reverse):
 * 1. Frozen GarmentSpecificationVersion
 * 2. Explicit user structural selections
 * 3. Evidence-backed canonical rules (none active)
 * 4. Existing engine observations (pattern projection metadata only)
 * 5. Legacy heuristics (cited, not applied as components)
 * 6. UNKNOWN
 */
export function evaluateComposition(input: {
  specificationVersion: GarmentSpecificationVersionRecord;
  explicitSelections?: ExplicitStructuralSelection[];
}): GarmentCompositionEvaluation {
  const specificationVersion = input.specificationVersion;
  assertNoLiveStudio(specificationVersion);

  const spec = specificationVersion.specification;
  const evidence: CompositionEvidence[] = [];
  const components: CompositionComponent[] = [];
  const unknownAreas: string[] = [];

  evidence.push({
    id: evidenceId('SPECIFICATION', specificationVersion.id),
    sourceType: 'SPECIFICATION',
    sourceReference: specificationVersion.id,
    classification: 'FACT',
    confidence: 'HIGH',
    note: 'Frozen garment identity is intent, not structure.',
  });

  const styleKeys = ['sleeveStyle', 'collarStyle', 'neckline', 'pocketStyle', 'lengthType'] as const;
  for (const key of styleKeys) {
    if (spec[key]) {
      evidence.push({
        id: evidenceId('SPECIFICATION', key),
        sourceType: 'SPECIFICATION',
        sourceReference: `CanonicalGarmentSpecification.${key}`,
        classification: 'FACT',
        confidence: 'HIGH',
        note: `${key} is a specification style string, not a structural component.`,
      });
    }
  }

  const appliedRules = activeCompositionRules();
  const projectionRule = appliedRules.find((rule) => rule.id === 'OBS-PATTERN-PROJECTION');
  const cuttingRule = appliedRules.find((rule) => rule.id === 'OBS-PRODUCTION-CUTTING-LIST');

  let patternProjection: PatternProjectionObservation | undefined;
  if (projectionRule && spec.garmentTypeStatus === 'known' && spec.garmentType) {
    const compatibility = legacyPatternKindCompatibility(spec.garmentType);
    patternProjection = {
      patternKind: compatibility.patternKind,
      authority: 'legacy-map',
      classification: 'OBSERVATION',
      notCompositionIdentity: true,
      sourceReference: 'mapGarmentTypeToPatternKind',
    };
    evidence.push({
      id: evidenceId('LEGACY_MAPPING', 'mapGarmentTypeToPatternKind'),
      sourceType: 'LEGACY_MAPPING',
      sourceReference: 'mapGarmentTypeToPatternKind',
      classification: 'OBSERVATION',
      confidence: 'MEDIUM',
      note: `PatternKind ${compatibility.patternKind} is a computational projection, not composition identity.`,
    });
    evidence.push({
      id: evidenceId('PATTERN_ENGINE', compatibility.patternKind),
      sourceType: 'PATTERN_ENGINE',
      sourceReference: `patternKind:${compatibility.patternKind}`,
      classification: 'OBSERVATION',
      confidence: 'MEDIUM',
      note: 'Engine kind observed. Dual-block composition is not implemented.',
    });
  }

  if (cuttingRule && spec.garmentTypeStatus === 'known' && spec.garmentType) {
    evidence.push({
      id: evidenceId('PRODUCTION_ASSISTANT', 'buildCuttingList'),
      sourceType: 'PRODUCTION_ASSISTANT',
      sourceReference: 'buildCuttingList',
      classification: 'OBSERVATION',
      confidence: 'LOW',
      note: 'Cutting-piece names are production heuristics and are not applied as composition components.',
    });
  }

  const explicitSelections = input.explicitSelections || [];
  for (const selection of explicitSelections) {
    const status: ComponentStatus = selection.unsupported
      ? 'UNSUPPORTED'
      : selection.componentType === 'UNKNOWN'
        ? 'UNKNOWN'
        : 'CUSTOM';
    const role: ComponentRole = selection.role || (status === 'UNKNOWN' ? 'unknown' : 'custom');
    const selectionEvidence: CompositionEvidence = {
      id: evidenceId('USER_SELECTION', `${selection.componentType}-${selection.label || role}`),
      sourceType: 'USER_SELECTION',
      sourceReference: selection.label || selection.componentType,
      classification: 'FACT',
      confidence: 'HIGH',
      note: 'Explicit structural selection. Not inferred from garment type.',
    };
    evidence.push(selectionEvidence);
    const component: CompositionComponent = {
      id: componentId({
        componentType: selection.componentType,
        role,
        source: 'USER_SELECTION',
        label: selection.label,
      }),
      componentType: selection.componentType,
      role,
      source: 'USER_SELECTION',
      status,
      evidenceIds: [selectionEvidence.id],
      orderClass: orderClassForRole(role),
    };
    if (selection.label) component.label = selection.label;
    if (selection.attributes) component.attributes = selection.attributes;
    components.push(component);
  }

  const canonicalRequired = canonicalRequiredComponentRules();
  if (canonicalRequired.length === 0) {
    if (spec.garmentTypeStatus === 'known') {
      unknownAreas.push('required-structure');
    }
  }

  if (spec.garmentTypeStatus === 'unknown' || spec.garmentTypeStatus === 'absent') {
    unknownAreas.push('garment-identity');
    unknownAreas.push('required-structure');
  }

  const unsupportedComponents = components.filter((item) => item.status === 'UNSUPPORTED');
  const unknownComponents = components.filter((item) => item.status === 'UNKNOWN');
  const knownComponents = components.filter((item) =>
    item.status === 'CONFIRMED' || item.status === 'OBSERVED' || item.status === 'CUSTOM' || item.status === 'INFERRED'
  );

  let completeness: CompositionCompleteness;
  let reason: CompositionEvaluationReason;
  let authorityStatus: CanonicalGarmentComposition['authorityStatus'];

  if (unsupportedComponents.length > 0) {
    completeness = 'unsupported';
    reason = 'COMPOSITION_UNSUPPORTED';
    authorityStatus = 'explicit';
  } else if (spec.garmentTypeStatus !== 'known' || spec.garmentType === null) {
    completeness = 'unknown';
    reason = 'COMPOSITION_UNKNOWN';
    authorityStatus = 'insufficient';
  } else if (canonicalRequired.length > 0 && unknownAreas.length === 0) {
    completeness = 'complete';
    reason = 'COMPOSITION_COMPLETE';
    authorityStatus = 'canonical';
  } else {
    completeness = 'partial';
    reason = 'COMPOSITION_PARTIAL';
    authorityStatus =
      explicitSelections.length > 0 ? 'explicit' : 'partial-observed';
  }

  const composition: CanonicalGarmentComposition = {
    schemaVersion: COMPOSITION_SCHEMA_VERSION,
    resolverVersion: COMPOSITION_RESOLVER_VERSION,
    ruleRegistryVersion: compositionRuleRegistryVersion(),
    sourceSpecificationVersionId: specificationVersion.id,
    garmentType: spec.garmentType,
    garmentTypeStatus: spec.garmentTypeStatus,
    components: sortCompositionComponents(components),
    relationships: sortCompositionRelationships([]),
    evidence: [...evidence].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    authorityStatus,
    completeness,
    unknownAreas: [...unknownAreas].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
  };
  if (spec.rawGarmentType) composition.rawGarmentType = spec.rawGarmentType;
  if (patternProjection) composition.patternProjection = patternProjection;

  const fingerprint = fingerprintGarmentComposition(composition);
  const provenance = createCompositionProvenance({
    source: explicitSelections.length > 0 ? 'user-selection' : 'specification-version',
    extractionPath:
      explicitSelections.length > 0 ? 'explicit-selection' : 'p14-specification-version',
    authorityLevel:
      completeness === 'unknown' ? 'insufficient' : completeness === 'partial' ? 'observed' : 'governed',
    specificationVersionId: specificationVersion.id,
    resolverVersion: COMPOSITION_RESOLVER_VERSION,
    ruleRegistryVersion: compositionRuleRegistryVersion(),
    measurementVersionId: spec.measurementVersionId,
  });

  return {
    composition,
    completeness,
    knownComponents: sortCompositionComponents(knownComponents),
    unknownComponents: sortCompositionComponents(unknownComponents),
    unsupportedComponents: sortCompositionComponents(unsupportedComponents),
    evidence: composition.evidence,
    provenance,
    fingerprint,
    deterministicVersion: COMPOSITION_RESOLVER_VERSION,
    reason,
  };
}

export function validateComposition(composition: CanonicalGarmentComposition): void {
  if (composition.schemaVersion !== COMPOSITION_SCHEMA_VERSION) {
    throw new Error('STOP: unsupported composition schema version');
  }
  if (!composition.sourceSpecificationVersionId) {
    throw new Error('STOP: composition requires a frozen specification version id');
  }
  if (composition.completeness === 'complete' && canonicalRequiredComponentRules().length === 0) {
    throw new Error('STOP: composition cannot be complete without canonical required-component rules');
  }
}
