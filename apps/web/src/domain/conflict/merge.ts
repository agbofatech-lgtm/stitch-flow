import { separateLegacyMeasurementBlob, flattenSeparated } from '../measurement/separate';
import type { PatternKind } from '../measurement/fields';
import {
  isCanonicalStageCode,
  stageStatusRank,
  type CanonicalStageStatus,
  PRODUCTION_STAGE_SEQUENCE,
} from '../production/stages';
import { requireOwner } from '../ownership';

export type MergeConflict = {
  path: string;
  local: unknown;
  remote: unknown;
  reason: string;
};

export type MergeResult<T = Record<string, unknown>> =
  | { status: 'merged'; value: T; conflicts: [] }
  | { status: 'conflict'; value: T; conflicts: MergeConflict[] };

const ORDER_STATUS_RANK: Record<string, number> = {
  draft: 0,
  in_progress: 1,
  ready: 2,
  delivered: 3,
};

const IDENTITY_ORDER_FIELDS = ['id', 'customerId', 'orderNumber', 'workspaceId'] as const;
const MONEY_ORDER_FIELDS = ['totalAmount', 'subtotal', 'taxTotal', 'discountTotal'] as const;

function numbersEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.05;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function mergeMeasurementPayloads(
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
  patternKind?: PatternKind
): MergeResult {
  requireOwner('body-measurement');
  const localSep = separateLegacyMeasurementBlob(local, patternKind);
  const remoteSep = separateLegacyMeasurementBlob(remote, patternKind);
  const conflicts: MergeConflict[] = [];
  const body: Record<string, number> = {};
  const garment: Record<string, number> = {};

  const bodyKeys = new Set([
    ...Object.keys(localSep.body.fields),
    ...Object.keys(remoteSep.body.fields),
  ]);
  for (const key of bodyKeys) {
    const lv = localSep.body.fields[key];
    const rv = remoteSep.body.fields[key];
    if (lv === undefined) {
      body[key] = rv;
      continue;
    }
    if (rv === undefined) {
      body[key] = lv;
      continue;
    }
    if (numbersEqual(lv, rv)) {
      body[key] = lv;
      continue;
    }
    conflicts.push({
      path: `body.${key}`,
      local: lv,
      remote: rv,
      reason: 'body measurement disagreement — not overwritten',
    });
    body[key] = lv;
  }

  const garmentKeys = new Set([
    ...Object.keys(localSep.garment.fields),
    ...Object.keys(remoteSep.garment.fields),
  ]);
  for (const key of garmentKeys) {
    const lv = localSep.garment.fields[key];
    const rv = remoteSep.garment.fields[key];
    if (lv === undefined) {
      garment[key] = rv;
      continue;
    }
    if (rv === undefined) {
      garment[key] = lv;
      continue;
    }
    if (numbersEqual(lv, rv)) {
      garment[key] = lv;
      continue;
    }
    conflicts.push({
      path: `garment.${key}`,
      local: lv,
      remote: rv,
      reason: 'garment measurement disagreement — not overwritten',
    });
    garment[key] = lv;
  }

  const notes =
    localSep.garment.notes &&
    remoteSep.garment.notes &&
    localSep.garment.notes !== remoteSep.garment.notes
      ? (conflicts.push({
          path: 'garment.notes',
          local: localSep.garment.notes,
          remote: remoteSep.garment.notes,
          reason: 'notes disagreement — not overwritten',
        }),
        localSep.garment.notes)
      : localSep.garment.notes || remoteSep.garment.notes;

  const mergedSeparated = {
    body: { class: 'body' as const, unit: 'cm' as const, fields: body },
    garment: { class: 'garment' as const, unit: 'cm' as const, fields: garment, notes },
  };

  const value = flattenSeparated(mergedSeparated);
  if (conflicts.length) {
    return { status: 'conflict', value, conflicts };
  }
  return { status: 'merged', value, conflicts: [] };
}

export function mergeOrderPayloads(
  local: Record<string, unknown>,
  remote: Record<string, unknown>
): MergeResult {
  requireOwner('order-job');
  const conflicts: MergeConflict[] = [];
  const value: Record<string, unknown> = { ...remote, ...local };

  for (const field of IDENTITY_ORDER_FIELDS) {
    if (
      local[field] !== undefined &&
      remote[field] !== undefined &&
      local[field] !== remote[field]
    ) {
      conflicts.push({
        path: field,
        local: local[field],
        remote: remote[field],
        reason: 'identity disagreement — not overwritten',
      });
      value[field] = local[field];
    } else {
      value[field] = local[field] ?? remote[field];
    }
  }

  const localStatus = typeof local.status === 'string' ? local.status : undefined;
  const remoteStatus = typeof remote.status === 'string' ? remote.status : undefined;
  if (localStatus && remoteStatus && localStatus !== remoteStatus) {
    if (localStatus === 'cancelled' || remoteStatus === 'cancelled') {
      conflicts.push({
        path: 'status',
        local: localStatus,
        remote: remoteStatus,
        reason: 'cancelled vs active status — not overwritten',
      });
      value.status = localStatus;
    } else if (
      ORDER_STATUS_RANK[localStatus] !== undefined &&
      ORDER_STATUS_RANK[remoteStatus] !== undefined
    ) {
      value.status =
        ORDER_STATUS_RANK[localStatus] >= ORDER_STATUS_RANK[remoteStatus]
          ? localStatus
          : remoteStatus;
    } else {
      conflicts.push({
        path: 'status',
        local: localStatus,
        remote: remoteStatus,
        reason: 'unknown status pair — not overwritten',
      });
      value.status = localStatus;
    }
  } else {
    value.status = localStatus ?? remoteStatus;
  }

  for (const field of MONEY_ORDER_FIELDS) {
    const lv = local[field];
    const rv = remote[field];
    if (typeof lv === 'number' && typeof rv === 'number' && !numbersEqual(lv, rv)) {
      conflicts.push({
        path: field,
        local: lv,
        remote: rv,
        reason: 'money field disagreement — not overwritten',
      });
      value[field] = lv;
    } else {
      value[field] = lv ?? rv;
    }
  }

  if (local.notes && remote.notes && local.notes !== remote.notes) {
    conflicts.push({
      path: 'notes',
      local: local.notes,
      remote: remote.notes,
      reason: 'order notes disagreement — not overwritten',
    });
    value.notes = local.notes;
  } else {
    value.notes = local.notes ?? remote.notes;
  }

  if (local.garmentMeasurements || remote.garmentMeasurements) {
    const measurementMerge = mergeMeasurementPayloads(
      asRecord(local.garmentMeasurements),
      asRecord(remote.garmentMeasurements)
    );
    value.garmentMeasurements = measurementMerge.value;
    for (const conflict of measurementMerge.conflicts) {
      conflicts.push({ ...conflict, path: `garmentMeasurements.${conflict.path}` });
    }
  }

  if (local.productionPlan && remote.productionPlan) {
    const localPlan = JSON.stringify(stripGeneratedAt(asRecord(local.productionPlan)));
    const remotePlan = JSON.stringify(stripGeneratedAt(asRecord(remote.productionPlan)));
    if (localPlan !== remotePlan) {
      conflicts.push({
        path: 'productionPlan',
        local: local.productionPlan,
        remote: remote.productionPlan,
        reason: 'derived production plan disagreement — not overwritten',
      });
      value.productionPlan = local.productionPlan;
    }
  } else {
    value.productionPlan = local.productionPlan ?? remote.productionPlan;
  }

  if (local.productionStages || remote.productionStages) {
    const stageMerge = mergeProductionPayloads(
      { stages: local.productionStages },
      { stages: remote.productionStages }
    );
    value.productionStages = asRecord(stageMerge.value).stages;
    for (const conflict of stageMerge.conflicts) {
      conflicts.push(conflict);
    }
  }

  if (conflicts.length) {
    return { status: 'conflict', value, conflicts };
  }
  return { status: 'merged', value, conflicts: [] };
}

function stripGeneratedAt(plan: Record<string, unknown>): Record<string, unknown> {
  const { generatedAt: _generatedAt, ...rest } = plan;
  return rest;
}

export function mergeProductionPayloads(
  local: Record<string, unknown>,
  remote: Record<string, unknown>
): MergeResult {
  requireOwner('production-plan-record');
  const conflicts: MergeConflict[] = [];
  const localStages = Array.isArray(local.stages)
    ? local.stages
    : Array.isArray(local.productionStages)
    ? local.productionStages
    : [];
  const remoteStages = Array.isArray(remote.stages)
    ? remote.stages
    : Array.isArray(remote.productionStages)
    ? remote.productionStages
    : [];

  const byCode = new Map<string, Record<string, unknown>>();

  function ingest(stage: unknown, side: 'local' | 'remote') {
    const record = asRecord(stage);
    const code = typeof record.code === 'string' ? record.code : '';
    if (!code) return;
    if (!isCanonicalStageCode(code)) {
      conflicts.push({
        path: `stages.${code}`,
        local: side === 'local' ? record : undefined,
        remote: side === 'remote' ? record : undefined,
        reason: 'non-canonical stage code — not invented, not merged',
      });
      return;
    }
    const existing = byCode.get(code);
    if (!existing) {
      byCode.set(code, { ...record, code });
      return;
    }
    const existingStatus = existing.status as CanonicalStageStatus | undefined;
    const nextStatus = record.status as CanonicalStageStatus | undefined;
    if (!existingStatus) {
      byCode.set(code, { ...existing, ...record });
      return;
    }
    if (!nextStatus) return;
    if (existingStatus === 'skipped' && nextStatus === 'completed') {
      conflicts.push({
        path: `stages.${code}.status`,
        local: existingStatus,
        remote: nextStatus,
        reason: 'skipped vs completed — not overwritten',
      });
      return;
    }
    if (existingStatus === 'completed' && nextStatus === 'skipped') {
      conflicts.push({
        path: `stages.${code}.status`,
        local: existingStatus,
        remote: nextStatus,
        reason: 'completed vs skipped — not overwritten',
      });
      return;
    }
    if (stageStatusRank(nextStatus) > stageStatusRank(existingStatus)) {
      byCode.set(code, { ...existing, ...record, status: nextStatus, code });
    }
  }

  for (const stage of localStages) ingest(stage, 'local');
  for (const stage of remoteStages) ingest(stage, 'remote');

  const stages = PRODUCTION_STAGE_SEQUENCE.filter((code) => byCode.has(code)).map(
    (code) => byCode.get(code)
  );

  const value = { stages };
  if (conflicts.length) {
    return { status: 'conflict', value, conflicts };
  }
  return { status: 'merged', value, conflicts: [] };
}

export function mergeEntityPayloads(
  entity: string,
  local: Record<string, unknown>,
  remote: Record<string, unknown>
): MergeResult {
  if (entity === 'measurement') return mergeMeasurementPayloads(local, remote);
  if (entity === 'order') return mergeOrderPayloads(local, remote);
  if (entity === 'production') return mergeProductionPayloads(local, remote);
  return {
    status: 'conflict',
    value: local,
    conflicts: [
      {
        path: entity,
        local,
        remote,
        reason: 'no T3 domain merge rule — detect-only, not overwritten',
      },
    ],
  };
}
