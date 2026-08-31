/**
 * Phase 16 immutable trusted execution snapshot.
 * References frozen authorities. Create-only. Not a second measurement store.
 */

import type { TrustedTailoringExecutionResult, ExecutionProvenance } from './contract';
import { executeTrustedTailoring, executionProvenanceFromResult, type TrustedExecutionInput } from './execute';
import { EXECUTION_CONTRACT_VERSION } from './taxonomy';

export type TrustedTailoringExecutionRecord = {
  kind: 'TrustedTailoringExecution';
  frozen: true;
  id: string;
  schemaVersion: 1;
  executionVersion: typeof EXECUTION_CONTRACT_VERSION;
  measurementVersionId: string;
  specificationVersionId: string;
  compositionVersionId: string;
  result: TrustedTailoringExecutionResult;
  provenance: ExecutionProvenance;
  createdAt: string;
};

function newVersionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `tte-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function freezeTrustedTailoringExecution(input: TrustedExecutionInput & {
  id?: string;
  createdAt?: string;
}): TrustedTailoringExecutionRecord {
  const result = executeTrustedTailoring(input);
  const provenance = executionProvenanceFromResult(result);
  return {
    kind: 'TrustedTailoringExecution',
    frozen: true,
    id: input.id || newVersionId(),
    schemaVersion: 1,
    executionVersion: EXECUTION_CONTRACT_VERSION,
    measurementVersionId: input.measurementVersion.id,
    specificationVersionId: input.specificationVersion.id,
    compositionVersionId: input.compositionVersion.id,
    result,
    provenance,
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

export function assertTrustedExecutionFrozen(record: TrustedTailoringExecutionRecord): void {
  if (record.kind !== 'TrustedTailoringExecution' || record.frozen !== true) {
    throw new Error('STOP: trusted tailoring execution is not frozen');
  }
}

export function refuseFrozenExecutionMutation(
  frozen: TrustedTailoringExecutionRecord,
  patch: Record<string, unknown>
): never {
  assertTrustedExecutionFrozen(frozen);
  const keys = Object.keys(patch).join(',') || 'empty patch';
  throw new Error(`STOP: frozen trusted execution ${frozen.id} cannot be patched (${keys})`);
}
