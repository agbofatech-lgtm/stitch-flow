import { apiGet } from '@shared/utils/api';

export type DashboardSummary = {
  totalCustomers: number;
  totalOrders: number;
  pendingOrders: number;
  /** Collected Revenue = captured payments (F-1: never order value). */
  totalRevenue: number;
  /** Order Value = Σ order totals (excl. cancelled). Distinct from revenue. */
  totalOrderValue?: number;
  pendingBalances: number;
  dueAlerts: number;
  currency: string;
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return apiGet<DashboardSummary>('/dashboard/summary');
}
