import { apiGet, apiPost } from '../utils/api';

/**
 * Production stage API contract. Mirrors
 * apps/backend/src/services/productionStageService.ts (`ProductionStageDto`)
 * and the routes mounted in apps/backend/src/routes/orderRoutes.ts:
 *   GET  /orders/:orderId/production-stages
 *   POST /orders/:orderId/production-stages/:stageCode/transition
 *   POST /orders/:orderId/production-stages/:stageCode/note
 */
export interface ApiProductionStage {
  id: string;
  code: string;
  label: string;
  sequence: number;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  skippedAt: string | null;
  reopenedAt: string | null;
  notes: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StageTransitionResult {
  orderStatus: string;
  productionStages: ApiProductionStage[];
}

export async function fetchOrderProductionStages(orderId: string): Promise<ApiProductionStage[]> {
  return apiGet<ApiProductionStage[]>(
    `/orders/${encodeURIComponent(orderId)}/production-stages`
  );
}

export async function transitionOrderProductionStage(
  orderId: string,
  stageCode: string,
  action: string,
  note?: string
): Promise<StageTransitionResult> {
  return apiPost<StageTransitionResult>(
    `/orders/${encodeURIComponent(orderId)}/production-stages/${encodeURIComponent(stageCode)}/transition`,
    { action, note }
  );
}

export async function addOrderProductionStageNote(
  orderId: string,
  stageCode: string,
  note: string
): Promise<{ productionStages: ApiProductionStage[] }> {
  return apiPost<{ productionStages: ApiProductionStage[] }>(
    `/orders/${encodeURIComponent(orderId)}/production-stages/${encodeURIComponent(stageCode)}/note`,
    { note }
  );
}
