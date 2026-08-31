/**
 * Phase 17 prompt governance.
 * Prompts are application artifacts, not React copy. Traceable versions.
 */

import type { IntelligenceOperationType } from './taxonomy';

export type GovernedPrompt = {
  promptId: string;
  promptVersion: string;
  purpose: string;
  allowedInputs: readonly string[];
  expectedOutputSchema: 'TailoringIntelligenceResult';
  safetyRules: readonly string[];
  authorityRules: readonly string[];
};

const SAFETY = [
  'Do not invent measurements.',
  'Do not resolve hip 98/100/102.',
  'Do not coerce unknown garment types to bodice.',
  'Do not present inference as FACT.',
  'Do not instruct silent mutation of frozen versions.',
] as const;

const AUTHORITY = [
  'MeasurementVersion / SpecificationVersion / CompositionVersion / TrustedTailoringExecution remain authoritative.',
  'AI output is advisory.',
  'Recommendations require human review.',
] as const;

export const GOVERNED_PROMPTS: Record<IntelligenceOperationType, GovernedPrompt> = {
  'explain-tailoring': {
    promptId: 'p17-explain-tailoring',
    promptVersion: '1',
    purpose: 'Explain frozen inputs without modification.',
    allowedInputs: ['authorityFacts', 'unknowns', 'unresolvedConflicts'],
    expectedOutputSchema: 'TailoringIntelligenceResult',
    safetyRules: SAFETY,
    authorityRules: AUTHORITY,
  },
  'explain-execution': {
    promptId: 'p17-explain-execution',
    promptVersion: '1',
    purpose: 'Explain deterministic execution outputs as observations.',
    allowedInputs: ['authorityFacts', 'deterministicOutputs'],
    expectedOutputSchema: 'TailoringIntelligenceResult',
    safetyRules: SAFETY,
    authorityRules: AUTHORITY,
  },
  'observe-measurements': {
    promptId: 'p17-observe-measurements',
    promptVersion: '1',
    purpose: 'Observe missing or conflicting measurement fields. Do not fill values.',
    allowedInputs: ['authorityFacts', 'measurementKeys', 'unresolvedConflicts'],
    expectedOutputSchema: 'TailoringIntelligenceResult',
    safetyRules: SAFETY,
    authorityRules: AUTHORITY,
  },
  'recommend-review': {
    promptId: 'p17-recommend-review',
    promptVersion: '1',
    purpose: 'Recommend human review. Never auto-accept.',
    allowedInputs: ['authorityFacts', 'unknowns', 'unresolvedConflicts'],
    expectedOutputSchema: 'TailoringIntelligenceResult',
    safetyRules: SAFETY,
    authorityRules: AUTHORITY,
  },
};

export function governedPrompt(operationType: IntelligenceOperationType): GovernedPrompt {
  return GOVERNED_PROMPTS[operationType];
}
