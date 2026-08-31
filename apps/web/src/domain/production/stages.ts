/**
 * Canonical production stage codes.
 * FACT copied from productionStageService.ts templates — engine file is not edited.
 * Do not invent UI stage codes.
 */

import { requireOwner } from '../ownership';

requireOwner('production-stage-codes');

export const PRODUCTION_STAGE_SEQUENCE = [
  'measurement',
  'cutting',
  'sewing',
  'embroidery',
  'first_fitting',
  'second_fitting',
  'final_press',
  'ready',
  'delivered',
] as const;

export type CanonicalProductionStageCode = (typeof PRODUCTION_STAGE_SEQUENCE)[number];

export type CanonicalStageStatus = 'pending' | 'active' | 'completed' | 'skipped';

const STAGE_RANK: Record<CanonicalStageStatus, number> = {
  pending: 0,
  active: 1,
  skipped: 1,
  completed: 2,
};

export function isCanonicalStageCode(code: string): code is CanonicalProductionStageCode {
  return (PRODUCTION_STAGE_SEQUENCE as readonly string[]).includes(code);
}

export function stageStatusRank(status: CanonicalStageStatus): number {
  return STAGE_RANK[status];
}
