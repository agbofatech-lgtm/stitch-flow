/**
 * Phase 17 local structured interpreter.
 * FACT: not an LLM. Deterministic advisory from governed context.
 * Never invents measurements or component laws.
 */

import type {
  IntelligenceEvidence,
  IntelligenceObservation,
  IntelligenceRecommendation,
  TailoringIntelligenceResult,
} from './contract';
import type { GovernedIntelligenceContext } from './context';
import { intelligenceContextFingerprint } from './context';
import { governedPrompt } from './prompts';
import { INTELLIGENCE_CONTRACT_VERSION, type IntelligenceOperationType } from './taxonomy';
import { rejectInventedHipValue } from './validate';

function newOpId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}`;
}

export function interpretGovernedContext(input: {
  operationType: IntelligenceOperationType;
  context: GovernedIntelligenceContext;
  executionTimestamp?: string;
}): TailoringIntelligenceResult {
  const prompt = governedPrompt(input.operationType);
  const facts = input.context.authorityFacts;
  const evidence: IntelligenceEvidence[] = [
    {
      id: 'ev-spec',
      statement: `Garment type status is ${facts.garmentTypeStatus}${facts.garmentType ? ` (${facts.garmentType})` : ''}.`,
      classification: 'FACT',
      sourceReference: facts.specificationVersionId,
    },
    {
      id: 'ev-composition',
      statement: `Composition completeness is ${facts.compositionCompleteness}.`,
      classification: 'FACT',
      sourceReference: facts.compositionVersionId,
    },
    {
      id: 'ev-execution',
      statement: `Trusted execution status is ${input.context.deterministicOutputs.executionStatus}.`,
      classification: 'FACT',
      sourceReference: facts.executionId,
    },
    {
      id: 'ev-hip',
      statement: 'Hip defaults 98/100/102 remain unresolved and are not selected.',
      classification: 'FACT',
      sourceReference: 'HIP_DEFAULT_CONFLICT',
    },
  ];

  const observations: IntelligenceObservation[] = [];
  const uncertainties: IntelligenceObservation[] = [];
  const recommendations: IntelligenceRecommendation[] = [];

  observations.push({
    id: 'obs-inputs',
    statement: `Frozen measurement keys present: ${facts.measurementKeysPresent.join(', ') || '(none)'}.`,
    classification: 'FACT',
    reason: 'engineInputFromVersion on frozen MeasurementVersion',
    confidence: 'HIGH',
    evidenceIds: ['ev-spec'],
  });

  if (facts.patternProjectionKind) {
    observations.push({
      id: 'obs-projection',
      statement: `Pattern projection ${facts.patternProjectionKind} is observed computational support, not composition identity.`,
      classification: 'INFERENCE',
      reason: 'Phase 15 patternProjection.notCompositionIdentity',
      confidence: 'HIGH',
      evidenceIds: ['ev-composition'],
    });
  }

  if (facts.measurementKeysMissingForProjection.length) {
    const obs: IntelligenceObservation = {
      id: 'obs-missing',
      statement:
        'INFERENCE: projection-declared measurement keys are absent. No authoritative substitute was derived.',
      classification: 'INFERENCE',
      reason: `Missing: ${facts.measurementKeysMissingForProjection.join(', ')}`,
      confidence: 'HIGH',
      evidenceIds: ['ev-composition'],
    };
    observations.push(obs);
    uncertainties.push({
      ...obs,
      id: 'unc-missing',
      classification: 'UNCERTAINTY',
    });
    recommendations.push({
      id: 'rec-review-measurements',
      category: 'measurement-review',
      statement: 'Review missing projection measurements with the customer. Do not invent values.',
      rationale: 'Pattern projection lists required engine keys that are not present on the frozen version.',
      evidence: [evidence[1]],
      confidence: 'HIGH',
      limitations: ['Does not certify which value is correct.', 'Does not fill engine defaults.'],
      requiresHumanApproval: true,
      authority: 'REQUIRES_HUMAN_REVIEW',
    });
  }

  if (!facts.measurementKeysPresent.includes('hip')) {
    recommendations.push({
      id: 'rec-review-hip',
      category: 'configuration-review',
      statement:
        'Review the hip measurement. No authoritative hip value was derived. Do not use 98, 100, or 102 as authority.',
      rationale: 'Legacy path-specific hip defaults conflict and remain unresolved.',
      evidence: [evidence[3]],
      confidence: 'HIGH',
      limitations: ['AI must not pick 98, 100, or 102.'],
      requiresHumanApproval: true,
      authority: 'REQUIRES_HUMAN_REVIEW',
    });
  }

  if (facts.garmentTypeStatus !== 'known') {
    uncertainties.push({
      id: 'unc-type',
      statement: 'UNKNOWN: garment identity is not a known GarmentType. Not coerced to bodice.',
      classification: 'UNKNOWN',
      reason: 'Phase 14/16 unknown preservation',
      confidence: 'HIGH',
      evidenceIds: ['ev-spec'],
    });
    recommendations.push({
      id: 'rec-review-type',
      category: 'composition-review',
      statement: 'Identify the garment type with the tailor. Do not coerce unknown types to bodice.',
      rationale: 'Unknown types stay unknown in specification and trusted execution.',
      evidence: [evidence[0]],
      confidence: 'HIGH',
      limitations: ['No component graph is invented.'],
      requiresHumanApproval: true,
      authority: 'REQUIRES_HUMAN_REVIEW',
    });
  }

  if (input.context.deterministicOutputs.patternSkipped || input.context.deterministicOutputs.productionSkipped) {
    observations.push({
      id: 'obs-skipped',
      statement: 'FACT: one or more deterministic engines were skipped because authority was insufficient.',
      classification: 'FACT',
      reason: 'Trusted execution skip flags',
      confidence: 'HIGH',
      evidenceIds: ['ev-execution'],
    });
  }

  const summary =
    input.operationType === 'observe-measurements'
      ? 'Measurement observations only. No values were invented.'
      : input.operationType === 'recommend-review'
        ? 'Human review recommendations only. No authoritative mutation.'
        : input.operationType === 'explain-execution'
          ? 'Deterministic execution explained. Engines remain the calculation authority.'
          : 'Frozen tailoring authorities explained. AI did not modify them.';

  const result: TailoringIntelligenceResult = {
    summary,
    observations,
    recommendations,
    uncertainties,
    evidence,
    confidence: recommendations.length ? 'HIGH' : 'MEDIUM',
    limitations: [
      { code: 'NOT_TAILORING_ACCURACY', statement: 'This does not certify tailoring correctness.' },
      { code: 'NOT_LLM', statement: 'local-governed interpreter is structured advisory, not a language model.' },
      { code: 'READ_ONLY', statement: 'No frozen authority was mutated.' },
    ],
    classification: recommendations.length ? 'RECOMMENDATION' : observations.some((o) => o.classification === 'INFERENCE') ? 'INFERENCE' : 'FACT',
    humanApproval: recommendations.length ? 'REQUIRES_HUMAN_REVIEW' : 'NOT_APPLICABLE',
    provenance: {
      operationId: newOpId('intel'),
      operationType: input.operationType,
      provider: 'local-governed',
      model: 'structured-interpreter-v1',
      promptId: prompt.promptId,
      promptVersion: prompt.promptVersion,
      contractVersion: INTELLIGENCE_CONTRACT_VERSION,
      inputFingerprint: intelligenceContextFingerprint(input.context),
      executionTimestamp: input.executionTimestamp || new Date().toISOString(),
      readOnly: true,
      mutatedAuthoritativeData: false,
    },
    availability: 'available',
  };

  rejectInventedHipValue(JSON.stringify(result));
  return result;
}
