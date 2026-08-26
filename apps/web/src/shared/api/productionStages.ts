import { apiGet, apiPost, apiPut } from '../utils/api';

export interface ApiProductionStage {
  id: string;
  orderId: string;
  stage: string;
  status: string;
}
export async function fetchOrderProductionStages(orderId: string): Promise<ApiProductionStage[]> {
  try { return await apiGet<ApiProductionStage[]>(`/orders/${orderId}/stages`); } catch { return []; }
}
export async function transitionOrderProductionStage(orderId: string, stageId: string, action: string): Promise<ApiProductionStage> {
  return apiPost<ApiProductionStage>(`/orders/${orderId}/stages/${stageId}/transition`, { action });
}
export async function updateProductionStage(orderId: string, stageId: string, data: Partial<ApiProductionStage>): Promise<ApiProductionStage> {
  return apiPut<ApiProductionStage>(`/orders/${orderId}/stages/${stageId}`, data);
}