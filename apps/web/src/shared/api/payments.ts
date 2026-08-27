import { apiGet, apiPost } from '../utils/api';

/**
 * Payment API contract. Mirrors apps/backend/src/routes/paymentRoutes.ts:
 *   GET  /payments
 *   GET  /payments/invoice/:invoiceId
 *   POST /payments
 */
export interface ApiPayment {
  id: string;
  invoiceId: string;
  customerId: string;
  orderId: string | null;
  amount: number;
  method: string;
  referenceCode: string;
  paymentStatus: string;
  paidAt: string;
  notes: string;
  createdAt: string;
}

/** Body accepted by POST /payments. */
export type PaymentPayload = {
  invoiceId: string;
  customerId: string;
  orderId?: string | null;
  amount: number;
  method: string;
  referenceCode: string;
  paymentStatus?: string;
  paidAt?: string;
  notes?: string;
};

export async function fetchPayments(): Promise<ApiPayment[]> {
  try { return await apiGet<ApiPayment[]>('/payments'); } catch { return []; }
}

export async function fetchInvoicePayments(invoiceId: string): Promise<ApiPayment[]> {
  try {
    return await apiGet<ApiPayment[]>(`/payments/invoice/${encodeURIComponent(invoiceId)}`);
  } catch {
    return [];
  }
}

export async function createPayment(payload: PaymentPayload): Promise<ApiPayment> {
  return apiPost<ApiPayment>('/payments', payload);
}
