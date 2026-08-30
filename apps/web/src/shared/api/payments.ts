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
  /** Present (true) when the server acknowledged an idempotent replay of the
   *  same clientMutationId instead of creating a second payment (mirrors
   *  POST /payments in apps/backend/src/routes/paymentRoutes.ts). */
  duplicate?: boolean;
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
  /** Idempotency key: server guarantees at most one payment per (workspace, id). */
  clientMutationId?: string;
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

export type PaymentSubmitResult =
  | { status: 'confirmed'; payment: ApiPayment }
  | { status: 'queued-offline'; clientMutationId: string };

/**
 * Offline-aware payment submission (Phase 4, addresses 3.5-R2).
 *
 * Online: the server transaction confirms the payment (authoritative).
 * Network failure: the payment intent is stored locally and queued with the
 * SAME clientMutationId; the sync engine submits it on reconnect and the
 * server's idempotency guarantees exactly one financial event.
 * HTTP rejections (400/404/409/422) are re-thrown: a server "no" is final
 * and must never be converted into a queued retry.
 */
export async function submitPaymentWithOfflineFallback(
  workspaceId: string,
  payload: PaymentPayload & { clientMutationId: string }
): Promise<PaymentSubmitResult> {
  try {
    const payment = await createPayment(payload);
    return { status: 'confirmed', payment };
  } catch (err) {
    const isHttpRejection = err instanceof Error && /^HTTP \d+$/.test(err.message);
    if (isHttpRejection) throw err;

    const { paymentLocalRepository } = await import(
      '../../modules/repositories/local/LocalRepository'
    );
    await paymentLocalRepository.create(
      workspaceId,
      { ...payload, id: `local-${payload.clientMutationId}`, pendingSync: true },
      { clientMutationId: payload.clientMutationId }
    );
    return { status: 'queued-offline', clientMutationId: payload.clientMutationId };
  }
}
