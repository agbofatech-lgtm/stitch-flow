/**
 * External model adapters (OpenAI / Gemini / Claude).
 * Depend on LanguageModelPort only — vendor SDKs must not leak into domain.
 * No automatic fallback between providers.
 */

import { validateIntelligenceResult } from '../../../domain/intelligence/validate';
import { governedPrompt } from '../../../domain/intelligence/prompts';
import { intelligenceContextFingerprint } from '../../../domain/intelligence/context';
import { INTELLIGENCE_CONTRACT_VERSION, type IntelligenceProviderId } from '../../../domain/intelligence/taxonomy';
import type { TailoringIntelligenceProvider, LanguageModelPort } from '../provider';

function parseStructured(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('STOP: intelligence output rejected — malformed JSON');
  }
}

export function externalIntelligenceAdapter(input: {
  id: Exclude<IntelligenceProviderId, 'local-governed' | 'unavailable'>;
  model: string;
  port: LanguageModelPort;
}): TailoringIntelligenceProvider {
  return {
    id: input.id,
    model: input.model,
    available: true,
    async interpret(request) {
      const prompt = governedPrompt(request.operationType);
      const completion = await input.port.complete({
        promptId: prompt.promptId,
        promptVersion: prompt.promptVersion,
        payload: {
          operationType: request.operationType,
          context: request.context,
          expectedOutputSchema: prompt.expectedOutputSchema,
          safetyRules: prompt.safetyRules,
          authorityRules: prompt.authorityRules,
        },
      });
      if (completion.provider !== input.id) {
        throw new Error('STOP: provider metadata mismatch — silent model switch is forbidden');
      }
      const parsed = parseStructured(completion.text);
      const validated = validateIntelligenceResult({
        ...(parsed as object),
        provenance: {
          operationId: `intel-${input.id}-${Date.now()}`,
          operationType: request.operationType,
          provider: input.id,
          model: completion.model,
          promptId: prompt.promptId,
          promptVersion: prompt.promptVersion,
          contractVersion: INTELLIGENCE_CONTRACT_VERSION,
          inputFingerprint: intelligenceContextFingerprint(request.context),
          executionTimestamp: new Date().toISOString(),
          readOnly: true,
          mutatedAuthoritativeData: false,
        },
        availability: 'available',
      });
      return validated;
    },
  };
}

export function openaiAdapter(port: LanguageModelPort, model = 'openai-compatible'): TailoringIntelligenceProvider {
  return externalIntelligenceAdapter({ id: 'openai', model, port });
}

export function geminiAdapter(port: LanguageModelPort, model = 'gemini-compatible'): TailoringIntelligenceProvider {
  return externalIntelligenceAdapter({ id: 'gemini', model, port });
}

export function claudeAdapter(port: LanguageModelPort, model = 'claude-compatible'): TailoringIntelligenceProvider {
  return externalIntelligenceAdapter({ id: 'claude', model, port });
}
