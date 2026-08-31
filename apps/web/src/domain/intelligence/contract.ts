/**
 * Phase 17 governed AI contract.
 * Read-only advisory. Provider-neutral. No silent mutation.
 */

import type {
  HumanApprovalRequirement,
  IntelligenceClassification,
  IntelligenceConfidence,
  IntelligenceOperationType,
  IntelligenceProviderId,
  INTELLIGENCE_CONTRACT_VERSION,
} from './taxonomy';

export type IntelligenceEvidence = {
  id: string;
  statement: string;
  classification: IntelligenceClassification;
  sourceReference: string;
};

export type IntelligenceObservation = {
  id: string;
  statement: string;
  classification: IntelligenceClassification;
  reason: string;
  confidence: IntelligenceConfidence;
  evidenceIds: string[];
};

export type IntelligenceRecommendation = {
  id: string;
  category: 'measurement-review' | 'composition-review' | 'execution-review' | 'configuration-review';
  statement: string;
  rationale: string;
  evidence: IntelligenceEvidence[];
  confidence: IntelligenceConfidence;
  limitations: string[];
  requiresHumanApproval: true;
  authority: 'REQUIRES_HUMAN_REVIEW';
};

export type IntelligenceLimitation = {
  code: string;
  statement: string;
};

export type IntelligenceProvenance = {
  operationId: string;
  operationType: IntelligenceOperationType;
  provider: IntelligenceProviderId;
  model: string;
  promptId: string;
  promptVersion: string;
  contractVersion: typeof INTELLIGENCE_CONTRACT_VERSION;
  inputFingerprint: string;
  executionTimestamp: string;
  readOnly: true;
  mutatedAuthoritativeData: false;
};

export type TailoringIntelligenceResult = {
  summary: string;
  observations: IntelligenceObservation[];
  recommendations: IntelligenceRecommendation[];
  uncertainties: IntelligenceObservation[];
  evidence: IntelligenceEvidence[];
  confidence: IntelligenceConfidence;
  limitations: IntelligenceLimitation[];
  classification: IntelligenceClassification;
  humanApproval: HumanApprovalRequirement;
  provenance: IntelligenceProvenance;
  availability: 'available' | 'unavailable';
};

export type IntelligenceOperationRequest = {
  operationType: IntelligenceOperationType;
  executionId: string;
  measurementVersionId: string;
  specificationVersionId: string;
  compositionVersionId: string;
  inputFingerprint: string;
};
