/**
 * Phase 17 — AI Tailoring Intelligence API client + domain types.
 *
 * CRITICAL BOUNDARIES:
 * - AI is ADVISORY. It never mutates tailoring data.
 * - No API key ever exists in the browser: the browser calls OUR backend,
 *   which holds provider secrets server-side.
 * - Every call is triggered by an explicit user action, never on render.
 * - AI failure must never break a workflow: callers render deterministic
 *   content regardless.
 */

import { apiGet, apiPost } from '../utils/api';

// ---------------------------------------------------------------------------
// Domain types (mirror apps/backend/src/modules/ai/types.ts)
// ---------------------------------------------------------------------------

export type AIPurpose =
  | 'measurement_review'
  | 'design_review'
  | 'fabric_review'
  | 'production_review'
  | 'customer_explanation';

/** Where a statement came from — never blended invisibly. */
export type EvidenceSource =
  | 'deterministic'
  | 'ai_inference'
  | 'recommendation'
  | 'unknown'
  | 'human_input';

export type AISeverity = 'info' | 'advisory' | 'attention' | 'critical';
export type AIConfidence = 'none' | 'low' | 'medium' | 'high';
export type AIAdvisoryStatus = 'ok' | 'degraded' | 'unavailable';

export type AIFindingCategory =
  | 'measurement'
  | 'design'
  | 'fabric'
  | 'pattern'
  | 'layout'
  | 'materials'
  | 'workflow'
  | 'quality'
  | 'fit_risk'
  | 'communication';

export interface AIFinding {
  code: string;
  category: AIFindingCategory;
  severity: AISeverity;
  message: string;
  explanation: string;
  source: EvidenceSource;
  evidence: string[];
  confidence: AIConfidence;
  requiresHumanVerification: boolean;
}

export interface AIRecommendation {
  code: string;
  category: AIFindingCategory;
  action: string;
  rationale: string;
  priority: number;
  source: EvidenceSource;
  evidence: string[];
  confidence: AIConfidence;
}

export interface AILimitation {
  code: string;
  description: string;
  resolution: string;
}

export interface DeterministicConflict {
  deterministicCode: string;
  deterministicStatement: string;
  suppressedAIClaim: string;
  reason: string;
}

export interface AIProvenance {
  purpose: AIPurpose;
  provider: string;
  model: string | null;
  deterministicInputs: string[];
  requestId: string | null;
  workspaceId: string;
  generatedAt: string;
  degraded: boolean;
}

export interface AIAdvisory {
  purpose: AIPurpose;
  status: AIAdvisoryStatus;
  summary: string;
  findings: AIFinding[];
  recommendations: AIRecommendation[];
  risks: AIFinding[];
  limitations: AILimitation[];
  confidence: AIConfidence;
  advisory: true;
  aiGenerated: boolean;
  requiresHumanReview: boolean;
  deterministicConflicts: DeterministicConflict[];
  provenance: AIProvenance;
}

export type AIFailureReason =
  | 'NO_PROVIDER'
  | 'PROVIDER_DISABLED'
  | 'INVALID_API_CONFIGURATION'
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'NETWORK_FAILURE'
  | 'MALFORMED_RESPONSE'
  | 'SCHEMA_VALIDATION_FAILURE'
  | 'PROVIDER_ERROR'
  | 'EMPTY_RESPONSE';

export interface AIProviderStatus {
  configured: boolean;
  enabled: boolean;
  provider: string | null;
  reason: AIFailureReason | null;
}

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------

/** Human label for an evidence source — used to visibly separate fact from AI. */
export function sourceLabel(source: EvidenceSource): string {
  switch (source) {
    case 'deterministic':
      return 'Verified by StitchFlow';
    case 'ai_inference':
      return 'AI interpretation';
    case 'recommendation':
      return 'Suggested action';
    case 'human_input':
      return 'Entered by you';
    case 'unknown':
    default:
      return 'Insufficient evidence';
  }
}

/** Plain-language reason the AI layer is unavailable. */
export function unavailableMessage(status: AIProviderStatus): string {
  switch (status.reason) {
    case 'NO_PROVIDER':
      return 'AI assistance is not configured. All StitchFlow calculations continue to work normally.';
    case 'PROVIDER_DISABLED':
      return 'AI assistance is turned off for this workspace. All StitchFlow calculations continue to work normally.';
    default:
      return 'AI assistance is unavailable right now. All StitchFlow calculations continue to work normally.';
  }
}

// ---------------------------------------------------------------------------
// API client — all AI calls are explicit user actions
// ---------------------------------------------------------------------------

export const aiApi = {
  status: () => apiGet<AIProviderStatus>('/ai/status'),

  reviewMeasurements: (profileId: string) =>
    apiPost<AIAdvisory>(`/ai/measurement-review/${profileId}`, {}),

  reviewDesign: (payload: {
    designSpecificationId: string;
    garmentType: string;
    fitType: string;
    designStatus: string;
    components?: Array<{ type: string; label: string }>;
    easeConfiguration?: Array<{ area: string; easeCm: number; source: string }>;
    readinessItems?: Array<{ code: string; status: string; message: string }>;
    hasInspiration?: boolean;
    observationCount?: number;
  }) => apiPost<AIAdvisory>('/ai/design-review', payload),

  reviewFabric: (planId: string) => apiPost<AIAdvisory>(`/ai/fabric-review/${planId}`, {}),

  reviewProduction: (planId: string) => apiPost<AIAdvisory>(`/ai/production-review/${planId}`, {}),

  explain: (payload: {
    subjectId: string;
    topic: string;
    technicalStatements: string[];
    garmentType?: string | null;
  }) => apiPost<AIAdvisory>('/ai/explain', payload),
};
