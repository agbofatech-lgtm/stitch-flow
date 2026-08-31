/**
 * Phase 16 application boundary.
 * Frozen versions in → explicit freeze → T2 snapshot.
 * Does not read AppContext or Studio sliders.
 */

import type { EntityRepository } from '../../shared/persistence/repository';
import { executeTrustedTailoring, type TrustedExecutionInput } from '../../domain/tailoring/execution/execute';
import { persistTrustedTailoringExecution } from '../../domain/persistence/trustedTailoringExecutionStore';
import { assertTrustedExecutionFrozen } from '../../domain/tailoring/execution/version';

export function evaluateTrustedTailoring(input: TrustedExecutionInput) {
  return executeTrustedTailoring(input);
}

export async function freezeGovernedTrustedTailoring(
  repository: EntityRepository,
  input: TrustedExecutionInput
) {
  const evaluated = executeTrustedTailoring(input);
  const record = await persistTrustedTailoringExecution(repository, input);
  if (!record) {
    throw new Error('STOP: trusted execution persist returned empty');
  }
  const version = record.payload as import('../../domain/tailoring/execution/version').TrustedTailoringExecutionRecord;
  assertTrustedExecutionFrozen(version);
  return { evaluated, record, version };
}
