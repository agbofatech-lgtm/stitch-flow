/**
 * Default offline provider: local structured interpreter.
 * Not an LLM. No network. No vendor SDK.
 */

import { interpretGovernedContext } from '../../domain/intelligence/interpreter';
import type { TailoringIntelligenceProvider } from './provider';

export function localGovernedIntelligenceProvider(): TailoringIntelligenceProvider {
  return {
    id: 'local-governed',
    model: 'structured-interpreter-v1',
    available: true,
    async interpret(input) {
      return interpretGovernedContext({
        operationType: input.operationType,
        context: input.context,
      });
    },
  };
}
