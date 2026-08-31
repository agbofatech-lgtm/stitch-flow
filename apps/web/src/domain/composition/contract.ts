/**
 * Phase 15 canonical composition contract.
 * Structural representation only. Does not invent required parts.
 * Measurements remain Phase 13. Intent remains Phase 14. Geometry remains locked.
 */

import type { KnownGarmentType } from '../garment/taxonomy';
import type { GarmentTypeStatus } from '../garment/taxonomy';
import type { PatternKind } from '../measurement/fields';
import {
  COMPOSITION_SCHEMA_VERSION,
  type ComponentOrderClass,
  type ComponentRole,
  type ComponentSource,
  type ComponentStatus,
  type ComponentType,
  type CompositionAuthorityStatus,
  type CompositionCompleteness,
  type EvidenceClassification,
  type EvidenceConfidence,
  type EvidenceSourceType,
  type RelationshipType,
} from './taxonomy';

export type CompositionEvidence = {
  id: string;
  sourceType: EvidenceSourceType;
  sourceReference: string;
  classification: EvidenceClassification;
  confidence?: EvidenceConfidence;
  note?: string;
};

export type CompositionComponent = {
  id: string;
  componentType: ComponentType;
  role: ComponentRole;
  source: ComponentSource;
  status: ComponentStatus;
  evidenceIds: string[];
  orderClass: ComponentOrderClass;
  label?: string;
  attributes?: Record<string, unknown>;
};

export type CompositionRelationship = {
  id: string;
  type: RelationshipType;
  fromComponentId: string;
  toComponentId: string;
  evidenceIds: string[];
  status: ComponentStatus;
};

export type PatternProjectionObservation = {
  patternKind: PatternKind;
  authority: 'legacy-map';
  classification: 'OBSERVATION';
  notCompositionIdentity: true;
  sourceReference: 'mapGarmentTypeToPatternKind';
};

export type CanonicalGarmentComposition = {
  schemaVersion: typeof COMPOSITION_SCHEMA_VERSION;
  resolverVersion: string;
  ruleRegistryVersion: string;
  sourceSpecificationVersionId: string;
  garmentType: KnownGarmentType | null;
  garmentTypeStatus: GarmentTypeStatus;
  rawGarmentType?: string;
  components: CompositionComponent[];
  relationships: CompositionRelationship[];
  evidence: CompositionEvidence[];
  authorityStatus: CompositionAuthorityStatus;
  completeness: CompositionCompleteness;
  unknownAreas: string[];
  patternProjection?: PatternProjectionObservation;
};

export type ExplicitStructuralSelection = {
  componentType: ComponentType;
  role?: ComponentRole;
  label?: string;
  unsupported?: boolean;
  attributes?: Record<string, unknown>;
};

export type CompositionEvaluationReason =
  | 'COMPOSITION_UNKNOWN'
  | 'COMPOSITION_PARTIAL'
  | 'COMPOSITION_UNSUPPORTED'
  | 'COMPOSITION_COMPLETE';
