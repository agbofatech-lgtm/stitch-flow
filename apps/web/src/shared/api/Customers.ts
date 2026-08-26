import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

export interface ApiCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export async function fetchCustomers(): Promise<ApiCustomer[]> {
  try { return await apiGet<ApiCustomer[]>('/customers'); } catch { return []; }
}
export async function createCustomer(data: Omit<ApiCustomer, 'id'>): Promise<ApiCustomer> {
  return apiPost<ApiCustomer>('/customers', data);
}
export async function updateCustomer(id: string, data: Partial<ApiCustomer>): Promise<ApiCustomer> {
  return apiPut<ApiCustomer>(`/customers/${id}`, data);
}
export async function deleteCustomer(id: string): Promise<void> {
  await apiDelete(`/customers/${id}`);
}