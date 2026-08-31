export {
  COMPOSITION_SCHEMA_VERSION,
  COMPOSITION_RESOLVER_VERSION,
  COMPOSITION_RULE_REGISTRY_VERSION,
  COMPONENT_TYPES,
  COMPONENT_STATUSES,
  RELATIONSHIP_TYPES,
} from './taxonomy';
export { evaluateComposition, validateComposition } from './evaluate';
export {
  canonicalizeGarmentComposition,
  fingerprintGarmentComposition,
  COMPOSITION_FINGERPRINT_ALGORITHM,
} from './canonicalize';
export {
  freezeComposition,
  refuseFrozenCompositionMutation,
  historicalCompositionIntact,
} from './version';
export { COMPOSITION_RULES, activeCompositionRules } from './registry';
