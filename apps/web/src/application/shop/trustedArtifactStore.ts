/**
 * SAC-2 Class D access. Append-only. Does not recompute engines or mutate frozen payloads.
 */

import { getDataAuthorityRuntime } from '../../shared/persistence/bootstrap';
import type { TrustedTailoringExecutionRecord } from '../../domain/tailoring/execution/version';

export async function readTrustedExecutionById(
  executionId: string
): Promise<TrustedTailoringExecutionRecord | null> {
  const runtime = getDataAuthorityRuntime();
  if (!runtime || !executionId) return null;
  const rows = await runtime.repositories.production.listActive();
  for (const row of rows) {
    const payload = row.payload as Partial<TrustedTailoringExecutionRecord>;
    if (payload.kind === 'TrustedTailoringExecution' && payload.id === executionId) {
      return payload as TrustedTailoringExecutionRecord;
    }
    if (row.metadata.localId === executionId && payload.kind === 'TrustedTailoringExecution') {
      return payload as TrustedTailoringExecutionRecord;
    }
  }
  return null;
}
