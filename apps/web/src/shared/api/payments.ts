import { apiGet, apiPost } from '../utils/api';

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  date: string;
}

export async function fetchInvoicePayments(invoiceId: string): Promise<InvoicePayment[]> {
  try {
    return await apiGet<InvoicePayment[]>(`/invoices/${invoiceId}/payments`);
  } catch {
    return [];
  }
}

export async function createPayment(invoiceId: string, data: { amount: number; method: string }): Promise<InvoicePayment> {
  return apiPost<InvoicePayment>(`/invoices/${invoiceId}/payments`, data);
}