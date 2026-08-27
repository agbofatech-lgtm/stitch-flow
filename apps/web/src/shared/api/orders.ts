import { apiGet } from '../utils/api';

/**
 * Order API contract. Mirrors apps/backend/src/routes/orderRoutes.ts
 * (`mapOrderRow`): JSON columns are surfaced as `unknown` and narrowed by
 * consumers at the domain boundary.
 */
export interface ApiOrder {
  id: string;
  customerId: string;
  assignedTo: string | null;
  orderNumber: string;
  status: string;
  orderType: string;
  garmentType: string | null;
  fitType: string | null;
  dueDate: string | null;
  notes: string;
  styleNotes: string | null;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  totalAmount: number;
  currency: string;
  measurementSnapshot: unknown;
  garmentMeasurements: unknown;
  productionPlan: unknown;
  productionStages: unknown;
  inspirationAnalysis: unknown;
  selectedFabricId: string | null;
  designInspirationId: string | null;
  selectedPatternId: string | null;
  selectedMeasurementProfileId: string | null;
  selectedMeasurementProfileLabel: string | null;
  selectedMeasurementProfileType: string | null;
  createdAt: string;
}

export async function fetchOrders(): Promise<ApiOrder[]> {
  try { return await apiGet<ApiOrder[]>('/orders'); } catch { return []; }
}
export async function fetchOrderById(id: string): Promise<ApiOrder | null> {
  try { return await apiGet<ApiOrder>(`/orders/${id}`); } catch { return null; }
}
