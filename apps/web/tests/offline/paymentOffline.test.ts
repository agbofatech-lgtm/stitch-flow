import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { db } from '../../src/db/database';
import { submitPaymentWithOfflineFallback } from '../../src/shared/api/payments';
import { storeAuthTokens } from '../../src/shared/utils/api';

const CMID = '33333333-3333-4333-8333-333333333333';

function payload() {
  return {
    invoiceId: 'inv-1',
    customerId: 'c-1',
    amount: 120,
    method: 'Cash',
    referenceCode: 'PAY-OFFLINE-UX',
    clientMutationId: CMID,
  };
}

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
  window.localStorage.clear();
  storeAuthTokens('t-access', 't-refresh');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Payment offline UX (Phase 4, 3.5-R2)', () => {
  it('network failure queues the payment locally with the SAME clientMutationId', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('fetch failed');
    }));

    const result = await submitPaymentWithOfflineFallback('ws-ux', payload());
    expect(result.status).toBe('queued-offline');

    const queue = await db.syncQueue.toArray();
    expect(queue).toHaveLength(1);
    expect(queue[0].entity).toBe('payments');
    expect(queue[0].clientMutationId).toBe(CMID);
    expect(queue[0].status).toBe('pending');

    const local = await db.payments.get(`local-${CMID}`);
    expect(local?.pendingSync).toBe(true); // clearly NOT server-confirmed
  });

  it('server HTTP rejection is FINAL: re-thrown, nothing queued', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Payment exceeds invoice total' }),
    })));

    await expect(submitPaymentWithOfflineFallback('ws-ux', payload())).rejects.toThrow('HTTP 400');
    expect(await db.syncQueue.count()).toBe(0);
    expect(await db.payments.count()).toBe(0);
  });

  it('online success is server-confirmed and nothing is queued', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 201,
      json: async () => ({ id: 'srv-1', amount: 120 }),
    })));

    const result = await submitPaymentWithOfflineFallback('ws-ux', payload());
    expect(result.status).toBe('confirmed');
    expect(await db.syncQueue.count()).toBe(0);
  });
});
