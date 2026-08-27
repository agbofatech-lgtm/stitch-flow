import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/db/database';
import { getSyncMeta } from '../../src/db/syncMeta';
import {
  customerLocalRepository,
  paymentLocalRepository,
  materialUsageLocalRepository,
} from '../../src/modules/repositories/local/LocalRepository';
import { queueCounts } from '../../src/modules/services/syncQueue';
import {
  syncNow,
  applyDeltaBatch,
  pullDeltaChanges,
} from '../../src/modules/services/syncEngine';
import { storeAuthTokens, clearAuthTokens } from '../../src/shared/utils/api';

const WS = 'ws-test';

/**
 * Mock server implementing the EXACT Phase 3 contracts:
 * 207 /sync/mutations with per-result status, /payments + /materials/usages
 * event lanes with duplicate acknowledgement, /sync/changes with
 * seq-cursor pagination.
 */
type MockChange = {
  seq: string;
  entity: string;
  entityId: string;
  operation: string;
  payload: Record<string, unknown>;
  occurredAt: string;
  clientMutationId: string | null;
};

class MockServer {
  seq = 0;
  changes: MockChange[] = [];
  processed = new Map<string, boolean>();
  payments = new Map<string, Record<string, unknown>>();
  usages = new Map<string, Record<string, unknown>>();
  failNextRequests = 0;
  respond401Once = false;
  refreshShouldSucceed = true;
  requestLog: string[] = [];

  addChange(entity: string, entityId: string, operation: string, payload: Record<string, unknown>, cmid: string | null = null) {
    this.seq += 1;
    this.changes.push({
      seq: String(this.seq), entity, entityId, operation, payload,
      occurredAt: new Date().toISOString(), clientMutationId: cmid,
    });
  }

  fetch = async (input: string, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    this.requestLog.push(`${method} ${url.replace(/^https?:\/\/[^/]+/, '')}`);

    if (this.failNextRequests > 0) {
      this.failNextRequests -= 1;
      throw new TypeError('network failure');
    }

    if (url.includes('/auth/refresh')) {
      if (this.refreshShouldSucceed) {
        return json(200, { accessToken: 'fresh-access', refreshToken: 'fresh-refresh' });
      }
      return json(401, { error: { code: 'INVALID_REFRESH_TOKEN' } });
    }

    if (this.respond401Once) {
      this.respond401Once = false;
      return json(401, { error: { code: 'INVALID_TOKEN' } });
    }

    if (url.includes('/sync/mutations')) {
      const body = JSON.parse(String(init?.body));
      const results = body.mutations.map((m: { clientMutationId: string; entity: string; entityId: string; operation: string; payload: Record<string, unknown> }) => {
        if (['payments', 'order_material_usages', 'invoices'].includes(m.entity)) {
          return { clientMutationId: m.clientMutationId, status: 'rejected', code: 'USE_EVENT_ENDPOINT' };
        }
        if (this.processed.has(m.clientMutationId)) {
          return { clientMutationId: m.clientMutationId, status: 'duplicate' };
        }
        this.processed.set(m.clientMutationId, true);
        this.addChange(m.entity, m.entityId, m.operation, m.payload, m.clientMutationId);
        return { clientMutationId: m.clientMutationId, status: 'applied', seq: String(this.seq) };
      });
      return json(207, { results });
    }

    if (url.includes('/payments')) {
      const body = JSON.parse(String(init?.body));
      if (this.payments.has(body.clientMutationId)) {
        return json(200, { ...this.payments.get(body.clientMutationId), duplicate: true });
      }
      if (body.amount > 100000) return json(400, { message: 'Payment exceeds invoice total' });
      const record = { id: `srv-${body.clientMutationId.slice(0, 8)}`, ...body };
      this.payments.set(body.clientMutationId, record);
      this.addChange('payments', record.id, 'insert', record, body.clientMutationId);
      return json(201, record);
    }

    if (url.includes('/materials/usages')) {
      const body = JSON.parse(String(init?.body));
      if (this.usages.has(body.clientMutationId)) {
        return json(200, { ...this.usages.get(body.clientMutationId), duplicate: true });
      }
      if (body.quantityUsed > 1000) return json(409, { message: 'Not enough stock available' });
      const record = { id: `usage-${body.clientMutationId.slice(0, 8)}`, ...body };
      this.usages.set(body.clientMutationId, record);
      this.addChange('order_material_usages', record.id, 'insert', record, body.clientMutationId);
      return json(201, record);
    }

    if (url.includes('/sync/changes')) {
      const u = new URL(url, 'http://x');
      const cursor = Number(u.searchParams.get('cursor') || '0');
      const limit = Number(u.searchParams.get('limit') || '200');
      const after = this.changes.filter((c) => Number(c.seq) > cursor);
      const page = after.slice(0, limit);
      const hasMore = after.length > limit;
      return json(200, {
        changes: page,
        nextCursor: page.length ? page[page.length - 1].seq : String(cursor),
        hasMore,
      });
    }

    return json(404, { error: { code: 'NOT_FOUND' } });
  };
}

function json(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

let server: MockServer;

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
  window.localStorage.clear();
  storeAuthTokens('test-access-token', 'test-refresh-token');
  server = new MockServer();
});

describe('Sync engine: push + pull happy path (§21, §48)', () => {
  it('offline create -> queue -> sync -> server -> ack -> queue drained, cursor advanced', async () => {
    await customerLocalRepository.create(WS, { id: 'c-1', fullName: 'Offline Ama' });
    await customerLocalRepository.create(WS, { id: 'c-2', fullName: 'Offline Kojo' });

    const result = await syncNow(WS, server.fetch);
    expect(result.ok).toBe(true);
    expect(result.pushed).toBe(2);
    expect(Number(result.cursor)).toBe(2);

    const counts = await queueCounts(WS);
    expect(counts.pending).toBe(0);
    expect(counts.synced).toBe(2);
    expect((await getSyncMeta(WS)).currentCursor).toBe('2');
  });

  it('empty delta is safe and cursor is unchanged', async () => {
    const result = await syncNow(WS, server.fetch);
    expect(result.ok).toBe(true);
    expect(result.pulled).toBe(0);
    expect(result.cursor).toBe('0');
  });

  it('duplicate delta application is idempotent (same batch twice)', async () => {
    server.addChange('customers', 'c-9', 'insert', { id: 'c-9', fullName: 'Server Row' });
    await pullDeltaChanges(WS, server.fetch);
    // simulate cursor rollback (crash before meta persisted elsewhere) and re-pull
    await db.syncMeta.put({ ...(await getSyncMeta(WS)), currentCursor: '0' });
    await pullDeltaChanges(WS, server.fetch);
    const rows = await db.customers.toArray();
    expect(rows).toHaveLength(1);
  });
});

describe('Idempotency & crash recovery (§41)', () => {
  it('retrying with the SAME clientMutationId yields exactly one server mutation', async () => {
    await customerLocalRepository.create(WS, { id: 'c-retry', fullName: 'Retry Me' });
    const queued = (await db.syncQueue.toArray())[0];

    // first attempt: server processed it but the client "crashed" before ack
    await syncNow(WS, server.fetch);
    expect(server.processed.size).toBe(1);

    // simulate restart: force the item back to pending (same cmid)
    await db.syncQueue.update(queued.id!, { status: 'pending', nextRetryAt: null });
    const result = await syncNow(WS, server.fetch);

    expect(result.duplicates).toBe(1); // acknowledged, not re-applied
    expect(server.processed.size).toBe(1); // exactly one logical mutation
    expect(server.changes.filter((c) => c.entityId === 'c-retry')).toHaveLength(1);
  });
});

describe('Cursor safety (§11, §42)', () => {
  it('cursor does NOT advance when delta application fails mid-batch', async () => {
    server.addChange('customers', 'ok-1', 'insert', { id: 'ok-1', fullName: 'Fine' });
    server.addChange('customers', 'boom', 'insert', { id: 'boom', fullName: 'Explodes' });

    // Poison one change: payload that breaks structured clone (a function)
    const poisoned = server.changes.map((c) =>
      c.entityId === 'boom'
        ? { ...c, payload: { id: 'boom', bad: () => 1 } as unknown as Record<string, unknown> }
        : c
    );

    await expect(
      applyDeltaBatch(WS, poisoned as Parameters<typeof applyDeltaBatch>[1], '2')
    ).rejects.toBeTruthy();

    // transaction rolled back: neither row exists, cursor still 0
    expect(await db.customers.get('ok-1')).toBeUndefined();
    expect(await db.customers.get('boom')).toBeUndefined();
    expect((await getSyncMeta(WS)).currentCursor).toBe('0');

    // retry with clean payloads: everything applies, no skipped records
    await pullDeltaChanges(WS, server.fetch);
    expect(await db.customers.get('ok-1')).toBeTruthy();
    expect((await getSyncMeta(WS)).currentCursor).toBe('2');
  });

  it('pagination: large delta (120 changes) applies batch-by-batch with correct cursor', async () => {
    for (let i = 1; i <= 120; i += 1) {
      server.addChange('customers', `bulk-${i}`, 'insert', { id: `bulk-${i}`, fullName: `Bulk ${i}` });
    }
    const result = await syncNow(WS, server.fetch);
    expect(result.pulled).toBe(120);
    expect((await getSyncMeta(WS)).currentCursor).toBe('120');
    expect(await db.customers.count()).toBe(120);
  });
});

describe('Tombstones (§23)', () => {
  it('Device B learns about deletion and stale updates cannot resurrect', async () => {
    // Device A (server-side): create then delete
    server.addChange('customers', 'c-dead', 'insert', { id: 'c-dead', fullName: 'Walking' });
    server.addChange('customers', 'c-dead', 'delete', { id: 'c-dead', deletedAt: '2026-08-27T00:00:00Z' });

    await syncNow(WS, server.fetch);
    const row = await db.customers.get('c-dead');
    expect(row?.deletedAt).toBeTruthy(); // tombstoned locally
    expect(await customerLocalRepository.get(WS, 'c-dead')).toBeUndefined();

    // stale update WITHOUT deletedAt arrives later -> must not resurrect
    await applyDeltaBatch(
      WS,
      [{ seq: '99', entity: 'customers', entityId: 'c-dead', operation: 'update', payload: { id: 'c-dead', fullName: 'Zombie' } }],
      '99'
    );
    const after = await db.customers.get('c-dead');
    expect(after?.deletedAt).toBeTruthy();
    expect(after?.fullName).not.toBe('Zombie');
  });
});

describe('Financial + inventory offline flows (§25–§26)', () => {
  it('offline payment -> reconnect -> server commit -> duplicate retry acknowledged once', async () => {
    const cmid = '11111111-1111-4111-8111-111111111111';
    await paymentLocalRepository.create(
      WS,
      { id: 'pay-local-1', invoiceId: 'inv-1', customerId: 'c-1', amount: 100, method: 'Cash', referenceCode: 'PAY-1' },
      { clientMutationId: cmid }
    );

    const first = await syncNow(WS, server.fetch);
    expect(first.pushed).toBe(1);
    expect(server.payments.size).toBe(1);

    // duplicate retry (restart simulation, same cmid)
    const item = (await db.syncQueue.toArray())[0];
    await db.syncQueue.update(item.id!, { status: 'pending', nextRetryAt: null });
    const second = await syncNow(WS, server.fetch);
    expect(second.duplicates).toBe(1);
    expect(server.payments.size).toBe(1); // exactly one payment on the server
  });

  it('server rejection (insufficient stock) marks mutation failed — no infinite retry', async () => {
    await materialUsageLocalRepository.create(WS, {
      id: 'use-1', orderId: 'o-1', fabricRecordId: 'f-1', quantityUsed: 5000, unit: 'yards',
    });

    const result = await syncNow(WS, server.fetch);
    expect(result.failed).toBe(1);
    const counts = await queueCounts(WS);
    expect(counts.failed).toBe(1);
    expect(counts.pending).toBe(0); // not retrying

    const again = await syncNow(WS, server.fetch);
    expect(again.failed).toBe(0); // failed item is not resubmitted
  });

  it('financial entities never travel the generic state lane', async () => {
    await paymentLocalRepository.create(WS, {
      id: 'p-lane', invoiceId: 'i', customerId: 'c', amount: 10, method: 'Cash', referenceCode: 'R',
    });
    await syncNow(WS, server.fetch);
    const paymentCalls = server.requestLog.filter((r) => r.includes('/payments'));
    const mutationCalls = server.requestLog.filter((r) => r.includes('/sync/mutations'));
    expect(paymentCalls.length).toBeGreaterThan(0);
    expect(mutationCalls.length).toBe(0);
  });
});

describe('Failure injection (§40)', () => {
  it('network failure: mutation retried later, never lost', async () => {
    await customerLocalRepository.create(WS, { id: 'c-net', fullName: 'Net Fail' });
    server.failNextRequests = 1;

    const first = await syncNow(WS, server.fetch);
    expect(first.pushed).toBe(0);
    let counts = await queueCounts(WS);
    expect(counts.pending).toBe(1); // preserved with backoff

    // clear backoff and retry
    const item = (await db.syncQueue.toArray())[0];
    await db.syncQueue.update(item.id!, { nextRetryAt: null });
    const second = await syncNow(WS, server.fetch);
    expect(second.pushed).toBe(1);
    counts = await queueCounts(WS);
    expect(counts.pending).toBe(0);
  });

  it('401 -> refresh -> retry succeeds transparently (§19)', async () => {
    await customerLocalRepository.create(WS, { id: 'c-401', fullName: 'Auth Retry' });
    server.respond401Once = true;

    const result = await syncNow(WS, server.fetch);
    expect(result.ok).toBe(true);
    expect(result.pushed).toBe(1);
    expect(server.requestLog.filter((r) => r.includes('/auth/refresh'))).toHaveLength(1);
  });

  it('failed refresh pauses sync and preserves the queue (§35)', async () => {
    await customerLocalRepository.create(WS, { id: 'c-pause', fullName: 'Paused' });
    server.respond401Once = true;
    server.refreshShouldSucceed = false;

    const result = await syncNow(WS, server.fetch);
    expect(result.ok).toBe(false);
    const counts = await queueCounts(WS);
    expect(counts.pending + counts.processing).toBe(1); // nothing lost
  });

  it('unauthenticated sync is skipped, queue preserved (§45)', async () => {
    await customerLocalRepository.create(WS, { id: 'c-loggedout', fullName: 'Kept' });
    clearAuthTokens(); // logout does NOT destroy local data or the queue

    const result = await syncNow(WS, server.fetch);
    expect(result.skipped).toBe(true);
    expect((await queueCounts(WS)).pending).toBe(1);
    expect(await db.customers.get('c-loggedout')).toBeTruthy();
  });
});

describe('Concurrency + large queue (§43, §49)', () => {
  it('concurrent syncNow() calls collapse into one run', async () => {
    await customerLocalRepository.create(WS, { id: 'c-conc', fullName: 'Once' });

    const [r1, r2, r3] = await Promise.all([
      syncNow(WS, server.fetch),
      syncNow(WS, server.fetch),
      syncNow(WS, server.fetch),
    ]);

    // all callers share the same result object (single flight)
    expect(r1).toBe(r2);
    expect(r2).toBe(r3);
    expect(server.processed.size).toBe(1); // one logical submission
  });

  it('drains a 60-mutation queue; one poison mutation does not block the rest', async () => {
    for (let i = 0; i < 60; i += 1) {
      await customerLocalRepository.create(WS, { id: `bulk-c-${i}`, fullName: `Bulk ${i}` });
    }
    // poison: an invoice mutation is rejected by the server (event-only entity)
    await db.syncQueue.add({
      clientMutationId: '22222222-2222-4222-8222-222222222222',
      workspaceId: WS, entity: 'invoices', entityId: 'inv-x', operation: 'insert',
      payload: {}, status: 'pending', retryCount: 0,
      createdAt: 'x', updatedAt: 'x', lastAttemptAt: null, nextRetryAt: null,
      processingStartedAt: null, lastError: null, occurredAt: new Date().toISOString(),
    });

    const result = await syncNow(WS, server.fetch);
    expect(result.pushed).toBe(60);
    expect(result.failed).toBe(1);
    const counts = await queueCounts(WS);
    expect(counts.synced).toBe(60);
    expect(counts.failed).toBe(1);
    expect(counts.pending).toBe(0);
  });
});

describe('Offline startup (§47)', () => {
  it('local data is available with no network and no fatal dependency', async () => {
    await customerLocalRepository.create(WS, { id: 'c-off', fullName: 'Boot Offline' });
    db.close();
    await db.open(); // browser restart

    const rows = await customerLocalRepository.list(WS);
    expect(rows.map((r) => r.id)).toContain('c-off');
    // no fetch was needed for any of the above
  });
});
