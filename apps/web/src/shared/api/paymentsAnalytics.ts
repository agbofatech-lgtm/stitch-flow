import { apiGet } from '../utils/api';

export interface PaymentsAnalytics {
  totalPaid: number;
  totalPending: number;
  weeklyData: number[];
}
export async function getPaymentsAnalytics(): Promise<PaymentsAnalytics> {
  try { return await apiGet<PaymentsAnalytics>('/dashboard/payments-analytics'); } catch { return { totalPaid: 0, totalPending: 0, weeklyData: [] }; }
}