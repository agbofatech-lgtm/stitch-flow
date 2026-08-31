/**
 * Phase 15 structural vocabulary.
 * FACT: these identifiers are types, not a required-component graph.
 * Do not treat membership in this list as “every garment contains this part”.
 */

export const COMPOSITION_SCHEMA_VERSION = 1 as const;
export const COMPOSITION_RESOLVER_VERSION = '1' as const;
export const COMPOSITION_RULE_REGISTRY_VERSION = 'p15-observed-v1' as const;

export const COMPONENT_TYPES = [
  'BODICE',
  'SLEEVE',
  'SKIRT',
  'TROUSER_LEG',
  'COLLAR',
  'CUFF',
  'WAISTBAND',
  'POCKET',
  'LINING',
  'PANEL',
  'NECKLINE',
  'CUSTOM',
  'UNKNOWN',
] as const;

export type ComponentType = (typeof COMPONENT_TYPES)[number];

export const COMPONENT_STATUSES = [
  'CONFIRMED',
  'OBSERVED',
  'INFERRED',
  'CUSTOM',
  'UNKNOWN',
  'UNSUPPORTED',
] as const;

export type ComponentStatus = (typeof COMPONENT_STATUSES)[number];

export const COMPONENT_SOURCES = [
  'SPECIFICATION',
  'USER_SELECTION',
  'CANONICAL_RULE',
  'PATTERN_ENGINE',
  'PRODUCTION_ASSISTANT',
  'LEGACY_MAPPING',
] as const;

export type ComponentSource = (typeof COMPONENT_SOURCES)[number];

export const COMPONENT_ROLES = [
  'pattern-projection',
  'primary-structure',
  'secondary-structure',
  'attachment',
  'optional',
  'custom',
  'unknown',
] as const;

export type ComponentRole = (typeof COMPONENT_ROLES)[number];

/** Serialization order only — not tailoring law. */
export const COMPONENT_ORDER_CLASSES = [
  'PRIMARY_STRUCTURE',
  'SECONDARY_STRUCTURE',
  'ATTACHMENTS',
  'OPTIONAL_COMPONENTS',
  'CUSTOM_COMPONENTS',
  'UNKNOWN',
] as const;

export type ComponentOrderClass = (typeof COMPONENT_ORDER_CLASSES)[number];

export const RELATIONSHIP_TYPES = [
  'CONTAINS',
  'ATTACHES_TO',
  'EXTENDS',
  'COVERS',
  'REQUIRES',
  'OPTIONAL_WITH',
  'DERIVED_FROM',
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const COMPOSITION_COMPLETENESS = [
  'complete',
  'partial',
  'unknown',
  'unsupported',
] as const;

export type CompositionCompleteness = (typeof COMPOSITION_COMPLETENESS)[number];

export const COMPOSITION_AUTHORITY_STATUSES = [
  'canonical',
  'explicit',
  'partial-observed',
  'insufficient',
] as const;

export type CompositionAuthorityStatus = (typeof COMPOSITION_AUTHORITY_STATUSES)[number];

export const EVIDENCE_SOURCE_TYPES = [
  'SPECIFICATION',
  'PATTERN_ENGINE',
  'PRODUCTION_ASSISTANT',
  'DESIGN_STUDIO',
  'LEGACY_MAPPING',
  'USER_SELECTION',
] as const;

export type EvidenceSourceType = (typeof EVIDENCE_SOURCE_TYPES)[number];

export const EVIDENCE_CLASSIFICATIONS = ['FACT', 'OBSERVATION', 'INFERENCE'] as const;
export type EvidenceClassification = (typeof EVIDENCE_CLASSIFICATIONS)[number];

export const EVIDENCE_CONFIDENCE = ['HIGH', 'MEDIUM', 'LOW'] as const;
export type EvidenceConfidence = (typeof EVIDENCE_CONFIDENCE)[number];

export const RULE_AUTHORITIES = ['CANONICAL', 'OBSERVED', 'PROVISIONAL', 'DISABLED'] as const;
export type RuleAuthority = (typeof RULE_AUTHORITIES)[number];

const TYPE_SET = new Set<string>(COMPONENT_TYPES);
const STATUS_SET = new Set<string>(COMPONENT_STATUSES);

export function isComponentType(value: string): value is ComponentType {
  return TYPE_SET.has(value);
}

export function isComponentStatus(value: string): value is ComponentStatus {
  return STATUS_SET.has(value);
}

/**
 * Serialization class from role. Not a required-part declaration.
 */
export function orderClassForRole(role: ComponentRole): ComponentOrderClass {
  switch (role) {
    case 'primary-structure':
    case 'pattern-projection':
      return 'PRIMARY_STRUCTURE';
    case 'secondary-structure':
      return 'SECONDARY_STRUCTURE';
    case 'attachment':
      return 'ATTACHMENTS';
    case 'optional':
      return 'OPTIONAL_COMPONENTS';
    case 'custom':
      return 'CUSTOM_COMPONENTS';
    case 'unknown':
    default:
      return 'UNKNOWN';
  }
}

export function orderClassIndex(orderClass: ComponentOrderClass): number {
  return COMPONENT_ORDER_CLASSES.indexOf(orderClass);
}
