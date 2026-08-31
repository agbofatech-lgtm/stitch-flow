/**
 * Offline / missing-provider adapter.
 * Deterministic tailoring must still succeed when this is used.
 */

import type { TailoringIntelligenceResult } from '../../domain/intelligence/contract';
import { INTELLIGENCE_CONTRACT_VERSION } from '../../domain/intelligence/taxonomy';
import { governedPrompt } from '../../domain/intelligence/prompts';
import { intelligenceContextFingerprint } from '../../domain/intelligence/context';
import type { TailoringIntelligenceProvider } from './provider';

export function unavailableIntelligenceProvider(): TailoringIntelligenceProvider {
  return {
    id: 'unavailable',
    model: 'none',
    available: false,
    async interpret(input) {
      const prompt = governedPrompt(input.operationType);
      const result: TailoringIntelligenceResult = {
        summary: 'AI advisory unavailable. Deterministic tailoring is unaffected.',
        observations: [],
        recommendations: [],
        uncertainties: [
          {
            id: 'unc-unavailable',
            statement: 'UNKNOWN: intelligence provider is unavailable.',
            classification: 'UNKNOWN',
            reason: 'offline or provider not configured',
            confidence: 'UNKNOWN',
            evidenceIds: [],
          },
        ],
        evidence: [],
        confidence: 'UNKNOWN',
        limitations: [{ code: 'AI_UNAVAILABLE', statement: 'Advisory features only. Execution does not wait.' }],
        classification: 'UNKNOWN',
        humanApproval: 'NOT_APPLICABLE',
        provenance: {
          operationId: `intel-unavailable-${Date.now()}`,
          operationType: input.operationType,
          provider: 'unavailable',
          model: 'none',
          promptId: prompt.promptId,
          promptVersion: prompt.promptVersion,
          contractVersion: INTELLIGENCE_CONTRACT_VERSION,
          inputFingerprint: intelligenceContextFingerprint(input.context),
          executionTimestamp: new Date().toISOString(),
          readOnly: true,
          mutatedAuthoritativeData: false,
        },
        availability: 'unavailable',
      };
      return result;
    },
  };
}
