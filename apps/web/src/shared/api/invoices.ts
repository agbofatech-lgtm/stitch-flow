import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

export interface ApiInvoice {
  id: string;
  orderId?: string;
  amount: number;
  status: string;
  date: string;
}
export async function fetchInvoices(): Promise<ApiInvoice[]> {
  try { return await apiGet<ApiInvoice[]>('/invoices'); } catch { return []; }
}
export async function fetchInvoiceById(id: string): Promise<ApiInvoice | null> {
  try { return await apiGet<ApiInvoice>(`/invoices/${id}`); } catch { return null; }
}
export async function createInvoice(data: Omit<ApiInvoice, 'id'>): Promise<ApiInvoice> {
  return apiPost<ApiInvoice>('/invoices', data);
}
export async function updateInvoice(id: string, data: Partial<ApiInvoice>): Promise<ApiInvoice> {
  return apiPut<ApiInvoice>(`/invoices/${id}`, data);
}
export async function deleteInvoice(id: string): Promise<void> {
  await apiDelete(`/invoices/${id}`);
}