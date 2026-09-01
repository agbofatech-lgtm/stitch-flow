/**
 * In-memory adapter of productionStageService transition guards.
 * Does not edit the protected SQL service. Codes and guards match that file.
 */

import { randomUUID } from 'crypto';
import type {
  ProductionStageCode,
  ProductionStageStatus,
  StageAction,
} from '../services/productionStageService';
import type { ShopStage } from './types';

/** FACT copy of STAGE_TEMPLATES in productionStageService.ts — do not invent codes. */
export const SHOP_STAGE_TEMPLATES: Array<{
  code: ProductionStageCode;
  label: string;
  sequence: number;
}> = [
  { code: 'measurement', label: 'Measurement', sequence: 1 },
  { code: 'cutting', label: 'Cutting', sequence: 2 },
  { code: 'sewing', label: 'Sewing', sequence: 3 },
  { code: 'embroidery', label: 'Embroidery', sequence: 4 },
  { code: 'first_fitting', label: 'First Fitting', sequence: 5 },
  { code: 'second_fitting', label: 'Second Fitting', sequence: 6 },
  { code: 'final_press', label: 'Final Press', sequence: 7 },
  { code: 'ready', label: 'Ready', sequence: 8 },
  { code: 'delivered', label: 'Delivered', sequence: 9 },
];

export function seedDraftStages(): ShopStage[] {
  return SHOP_STAGE_TEMPLATES.map((stage, index) => ({
    id: randomUUID(),
    code: stage.code,
    label: stage.label,
    sequence: stage.sequence,
    status: (index === 0 ? 'active' : 'pending') as ProductionStageStatus,
    startedAt: index === 0 ? new Date().toISOString() : null,
    completedAt: null,
    skippedAt: null,
    reopenedAt: null,
    notes: '',
  }));
}

function openIndex(stages: ShopStage[]) {
  return stages.findIndex((stage) => stage.status !== 'completed' && stage.status !== 'skipped');
}

export function deriveOrderStatusFromStages(
  stages: ShopStage[]
): 'draft' | 'in_progress' | 'ready' | 'delivered' {
  const delivered = stages.find((stage) => stage.code === 'delivered');
  const ready = stages.find((stage) => stage.code === 'ready');
  const hasProgress = stages.some(
    (stage) => stage.status === 'active' || stage.status === 'completed' || stage.status === 'skipped'
  );
  if (delivered?.status === 'completed') return 'delivered';
  if (ready?.status === 'completed') return 'ready';
  if (hasProgress) return 'in_progress';
  return 'draft';
}

export function applyStageAction(
  stages: ShopStage[],
  stageCode: ProductionStageCode,
  action: StageAction
): ShopStage[] {
  const next = stages.map((stage) => ({ ...stage }));
  const targetIndex = next.findIndex((stage) => stage.code === stageCode);
  if (targetIndex === -1) {
    throw new Error('Production stage not found');
  }
  const target = next[targetIndex];
  const currentOpen = openIndex(next);
  const now = new Date().toISOString();

  if (action === 'start') {
    if (target.status !== 'pending' || targetIndex !== currentOpen) {
      throw new Error('Only the current pending stage can be started');
    }
    target.status = 'active';
    target.startedAt = target.startedAt || now;
    target.skippedAt = null;
    return next;
  }

  if (action === 'complete') {
    if (target.status !== 'active') {
      throw new Error('Only an active stage can be completed');
    }
    target.status = 'completed';
    target.startedAt = target.startedAt || now;
    target.completedAt = now;
    target.skippedAt = null;
    const following = next[targetIndex + 1];
    if (following && following.status === 'pending') {
      following.status = 'active';
      following.startedAt = following.startedAt || now;
    }
    return next;
  }

  if (action === 'skip') {
    if (
      (target.status !== 'pending' && target.status !== 'active') ||
      targetIndex !== currentOpen
    ) {
      throw new Error('Only the current open stage can be skipped');
    }
    target.status = 'skipped';
    target.completedAt = null;
    target.skippedAt = now;
    const following = next[targetIndex + 1];
    if (following && following.status === 'pending') {
      following.status = 'active';
      following.startedAt = following.startedAt || now;
    }
    return next;
  }

  if (action === 'reopen') {
    if (target.status !== 'completed' && target.status !== 'skipped') {
      throw new Error('Only completed or skipped stages can be reopened');
    }
    for (let i = targetIndex; i < next.length; i += 1) {
      const stage = next[i];
      stage.status = 'pending';
      stage.startedAt = null;
      stage.completedAt = null;
      stage.skippedAt = null;
      if (stage.id === target.id) stage.reopenedAt = now;
    }
    return next;
  }

  throw new Error('Unsupported stage action');
}
