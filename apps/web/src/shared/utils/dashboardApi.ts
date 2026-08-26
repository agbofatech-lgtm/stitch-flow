import { apiGet } from '@shared/utils/api';

export type DashboardSummary = {
  totalCustomers: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  pendingBalances: number;
  dueAlerts: number;
  currency: string;
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return apiGet<DashboardSummary>('/dashboard/summary');
}
