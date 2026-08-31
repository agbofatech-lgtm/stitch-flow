/**
 * Phase 17 structured-output validation.
 * Malformed AI output fails safely. Invalid classifications are rejected.
 */

import type { TailoringIntelligenceResult } from './contract';
import {
  INTELLIGENCE_CLASSIFICATIONS,
  INTELLIGENCE_CONFIDENCE,
  INTELLIGENCE_OPERATION_TYPES,
  INTELLIGENCE_PROVIDERS,
  type IntelligenceClassification,
  type IntelligenceConfidence,
} from './taxonomy';
import { INTELLIGENCE_CONTRACT_VERSION } from './taxonomy';

const CLASS_SET = new Set<string>(INTELLIGENCE_CLASSIFICATIONS);
const CONF_SET = new Set<string>(INTELLIGENCE_CONFIDENCE);
const OP_SET = new Set<string>(INTELLIGENCE_OPERATION_TYPES);
const PROVIDER_SET = new Set<string>(INTELLIGENCE_PROVIDERS);

export class IntelligenceOutputError extends Error {
  constructor(message: string) {
    super(`STOP: intelligence output rejected — ${message}`);
    this.name = 'IntelligenceOutputError';
  }
}

export function assertClassification(value: unknown): asserts value is IntelligenceClassification {
  if (typeof value !== 'string' || !CLASS_SET.has(value)) {
    throw new IntelligenceOutputError(`invalid classification "${String(value)}"`);
  }
}

export function assertConfidence(value: unknown): asserts value is IntelligenceConfidence {
  if (typeof value !== 'string' || !CONF_SET.has(value)) {
    throw new IntelligenceOutputError(`invalid confidence "${String(value)}"`);
  }
}

export function validateIntelligenceResult(raw: unknown): TailoringIntelligenceResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new IntelligenceOutputError('result is not an object');
  }
  const value = raw as TailoringIntelligenceResult;
  if (typeof value.summary !== 'string' || !value.summary.trim()) {
    throw new IntelligenceOutputError('summary missing');
  }
  if (!Array.isArray(value.observations) || !Array.isArray(value.recommendations)) {
    throw new IntelligenceOutputError('observations/recommendations must be arrays');
  }
  if (!Array.isArray(value.uncertainties) || !Array.isArray(value.evidence) || !Array.isArray(value.limitations)) {
    throw new IntelligenceOutputError('uncertainties/evidence/limitations must be arrays');
  }
  assertClassification(value.classification);
  assertConfidence(value.confidence);
  if (!value.provenance || typeof value.provenance !== 'object') {
    throw new IntelligenceOutputError('provenance missing');
  }
  if (!OP_SET.has(value.provenance.operationType)) {
    throw new IntelligenceOutputError('invalid operationType');
  }
  if (!PROVIDER_SET.has(value.provenance.provider)) {
    throw new IntelligenceOutputError('invalid provider');
  }
  if (value.provenance.contractVersion !== INTELLIGENCE_CONTRACT_VERSION) {
    throw new IntelligenceOutputError('unsupported contract version');
  }
  if (value.provenance.readOnly !== true || value.provenance.mutatedAuthoritativeData !== false) {
    throw new IntelligenceOutputError('result is not read-only');
  }
  for (const rec of value.recommendations) {
    if (rec.requiresHumanApproval !== true || rec.authority !== 'REQUIRES_HUMAN_REVIEW') {
      throw new IntelligenceOutputError('recommendation missing human-approval boundary');
    }
    assertClassification('RECOMMENDATION');
  }
  if (value.availability !== 'available' && value.availability !== 'unavailable') {
    throw new IntelligenceOutputError('invalid availability');
  }
  return value;
}

export function rejectInventedHipValue(text: string): void {
  const lower = text.toLowerCase();
  if (!lower.includes('hip')) return;
  const invented = /\b(use|choose|set|default to|should be)\s+10[028]\b/.test(lower);
  const negated = /\b(do not|don't|must not|never)\b/.test(lower);
  if (invented && !negated) {
    throw new IntelligenceOutputError('must not invent a hip default');
  }
}
