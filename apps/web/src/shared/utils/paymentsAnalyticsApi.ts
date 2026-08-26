import { apiGet } from '@shared/utils/api';

export type PaymentsAnalytics = {
  bars: Array<{
    label: string;
    value: number;
  }>;
  thisWeekTotal: number;
  previousWeekTotal: number;
  trendPercent: number;
  hasRevenue: boolean;
};

export async function getPaymentsAnalytics(): Promise<PaymentsAnalytics> {
  return apiGet<PaymentsAnalytics>('/dashboard/payments-analytics');
}
