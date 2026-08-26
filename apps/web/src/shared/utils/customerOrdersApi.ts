import { apiGet } from '@shared/utils/api';
import type { ApiOrder } from '@shared/api/orders';

export async function getCustomerOrders(customerId: string): Promise<ApiOrder[]> {
  return apiGet<ApiOrder[]>(`/customers/${customerId}/orders`);
}
