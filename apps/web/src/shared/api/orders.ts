import { apiGet } from '../utils/api';

export interface ApiOrder {
  id: string;
  amount: number;
  status: string;
  date: string;
}
export async function fetchOrders(): Promise<ApiOrder[]> {
  try { return await apiGet<ApiOrder[]>('/orders'); } catch { return []; }
}
export async function fetchOrderById(id: string): Promise<ApiOrder | null> {
  try { return await apiGet<ApiOrder>(`/orders/${id}`); } catch { return null; }
}