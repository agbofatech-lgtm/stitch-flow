/**
 * Phase 17 intelligence vocabulary.
 * Advisory only. Not tailoring law. Not an LLM.
 */

export const INTELLIGENCE_CONTRACT_VERSION = 'tailoring-intelligence-v1' as const;

export const INTELLIGENCE_CLASSIFICATIONS = [
  'FACT',
  'INFERENCE',
  'RECOMMENDATION',
  'UNCERTAINTY',
  'UNKNOWN',
] as const;

export type IntelligenceClassification = (typeof INTELLIGENCE_CLASSIFICATIONS)[number];

export const INTELLIGENCE_CONFIDENCE = ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'] as const;
export type IntelligenceConfidence = (typeof INTELLIGENCE_CONFIDENCE)[number];

export const INTELLIGENCE_OPERATION_TYPES = [
  'explain-tailoring',
  'explain-execution',
  'observe-measurements',
  'recommend-review',
] as const;

export type IntelligenceOperationType = (typeof INTELLIGENCE_OPERATION_TYPES)[number];

export const INTELLIGENCE_PROVIDERS = [
  'local-governed',
  'openai',
  'gemini',
  'claude',
  'unavailable',
] as const;

export type IntelligenceProviderId = (typeof INTELLIGENCE_PROVIDERS)[number];

export const HUMAN_APPROVAL = ['NOT_APPLICABLE', 'REQUIRES_HUMAN_REVIEW'] as const;
export type HumanApprovalRequirement = (typeof HUMAN_APPROVAL)[number];
