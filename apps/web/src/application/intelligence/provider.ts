/**
 * Phase 17 provider-neutral intelligence port.
 * Domain depends on this contract, not on OpenAI / Gemini / Anthropic SDKs.
 */

import type { TailoringIntelligenceResult } from '../../domain/intelligence/contract';
import type { GovernedIntelligenceContext } from '../../domain/intelligence/context';
import type { IntelligenceOperationType, IntelligenceProviderId } from '../../domain/intelligence/taxonomy';

export type LanguageModelCompletion = {
  text: string;
  provider: IntelligenceProviderId;
  model: string;
};

/** Injected I/O only. No vendor SDK types. */
export type LanguageModelPort = {
  complete(input: { promptId: string; promptVersion: string; payload: unknown }): Promise<LanguageModelCompletion>;
};

export type TailoringIntelligenceProvider = {
  id: IntelligenceProviderId;
  model: string;
  available: boolean;
  interpret(input: {
    operationType: IntelligenceOperationType;
    context: GovernedIntelligenceContext;
  }): Promise<TailoringIntelligenceResult>;
};

export type IntelligenceFailure = {
  provider: IntelligenceProviderId;
  reason: string;
};
