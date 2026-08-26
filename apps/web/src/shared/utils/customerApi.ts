import { apiGet, apiPost, apiPut } from './api';

export type ApiCustomer = {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt?: string;
};

export type CustomerPayload = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

export async function getCustomers(): Promise<ApiCustomer[]> {
  return apiGet<ApiCustomer[]>('/customers');
}

export async function createCustomer(payload: CustomerPayload): Promise<ApiCustomer> {
  return apiPost<ApiCustomer>('/customers', payload);
}

export async function updateCustomer(
  id: string,
  payload: CustomerPayload
): Promise<ApiCustomer> {
  return apiPut<ApiCustomer>(`/customers/${id}`, payload);
}
