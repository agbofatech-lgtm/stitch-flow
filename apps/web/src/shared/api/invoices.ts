import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

/**
 * Invoice API contract.
 *
 * Shapes mirror what apps/backend/src/routes/invoiceRoutes.ts actually
 * returns (`mapInvoiceRow` / `getInvoiceItems`) and accepts (POST/PUT body).
 */
export interface ApiInvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ApiInvoice {
  id: string;
  customerId: string;
  orderId?: string | null;
  invoiceNumber: string;
  status: string;
  dueDate: string | null;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  currency: string;
  notes: string;
  createdAt: string;
  items?: ApiInvoiceLineItem[];
}

/** Body accepted by POST /invoices and PUT /invoices/:id (status is computed server-side). */
export type InvoicePayload = {
  customerId: string;
  orderId?: string | null;
  invoiceNumber: string;
  dueDate?: string | null;
  totalAmount: number;
  amountPaid?: number;
  balanceDue?: number;
  currency?: string;
  notes?: string;
  items?: Array<{
    id?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total?: number;
  }>;
};

export async function fetchInvoices(): Promise<ApiInvoice[]> {
  try { return await apiGet<ApiInvoice[]>('/invoices'); } catch { return []; }
}
export async function fetchInvoiceById(id: string): Promise<ApiInvoice | null> {
  try { return await apiGet<ApiInvoice>(`/invoices/${id}`); } catch { return null; }
}
export async function createInvoice(data: InvoicePayload): Promise<ApiInvoice> {
  return apiPost<ApiInvoice>('/invoices', data);
}
export async function updateInvoice(id: string, data: Partial<InvoicePayload>): Promise<ApiInvoice> {
  return apiPut<ApiInvoice>(`/invoices/${id}`, data);
}
export async function deleteInvoice(id: string): Promise<void> {
  await apiDelete(`/invoices/${id}`);
}
