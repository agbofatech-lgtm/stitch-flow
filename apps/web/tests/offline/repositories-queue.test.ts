import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/db/database';
import {
  customerLocalRepository,
  paymentLocalRepository,
  buildQueueRecord,
} from '../../src/modules/repositories/local/LocalRepository';
import {
  duePending,
  markProcessing,
  markRetryable,
  markFailed,
  markSynced,
  recoverStaleProcessing,
  queueCounts,
  backoffMs,
  MAX_RETRIES,
} from '../../src/modules/services/syncQueue';

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('Local repositories (offline-first, no network)', () => {
  it('create writes locally AND queues a mutation atomically', async () => {
    const row = await customerLocalRepository.create('ws-1', {
      id: 'c-1',
      fullName: 'Efua Offline',
      phone: '+233200000030',
    });
    expect(row.id).toBe('c-1');

    const stored = await customerLocalRepository.get('ws-1', 'c-1');
    expect(stored?.fullName).toBe('Efua Offline');

    const queue = await db.syncQueue.toArray();
    expect(queue).toHaveLength(1);
    expect(queue[0].entity).toBe('customers');
    expect(queue[0].operation).toBe('insert');
    expect(queue[0].status).toBe('pending');
    expect(queue[0].clientMutationId).toMatch(/[0-9a-f-]{36}/);
  });

  it('read/update/softDelete/list respect the workspace boundary (§44)', async () => {
    await customerLocalRepository.create('ws-A', { id: 'a-1', fullName: 'A One' });
    await customerLocalRepository.create('ws-B', { id: 'b-1', fullName: 'B One' });

    // cross-workspace get/update/delete are refused at the repository layer
    expect(await customerLocalRepository.get('ws-B', 'a-1')).toBeUndefined();
    expect(await customerLocalRepository.update('ws-B', 'a-1', { fullName: 'HACK' })).toBeUndefined();
    expect(await customerLocalRepository.softDelete('ws-B', 'a-1')).toBe(false);

    expect((await customerLocalRepository.list('ws-A')).map((r) => r.id)).toEqual(['a-1']);
    expect((await customerLocalRepository.list('ws-B')).map((r) => r.id)).toEqual(['b-1']);
  });

  it('softDelete tombstones (record hidden but retained) and queues DELETE', async () => {
    await customerLocalRepository.create('ws-1', { id: 'c-del', fullName: 'Bye' });
    const ok = await customerLocalRepository.softDelete('ws-1', 'c-del');
    expect(ok).toBe(true);

    expect(await customerLocalRepository.get('ws-1', 'c-del')).toBeUndefined();
    const raw = await db.customers.get('c-del');
    expect(raw?.deletedAt).toBeTruthy(); // tombstone, not physical delete

    const deletes = (await db.syncQueue.toArray()).filter((q) => q.operation === 'delete');
    expect(deletes).toHaveLength(1);
  });

  it('payments are recorded locally as immutable intent (event lane)', async () => {
    const payment = await paymentLocalRepository.create('ws-1', {
      id: 'pay-1',
      invoiceId: 'inv-1',
      customerId: 'c-1',
      amount: 100,
      method: 'Cash',
      referenceCode: 'PAY-OFF-1',
    });
    expect(payment.id).toBe('pay-1');
    const queue = await db.syncQueue.toArray();
    expect(queue[0].entity).toBe('payments');
  });
});

describe('Durable sync queue (§15–§18)', () => {
  function enqueue(overrides: Partial<ReturnType<typeof buildQueueRecord>> = {}) {
    return db.syncQueue.add({
      ...buildQueueRecord({
        workspaceId: 'ws-1',
        entity: 'customers',
        entityId: 'c-1',
        operation: 'insert',
        payload: { id: 'c-1' },
      }),
      ...overrides,
    });
  }

  it('persists across simulated restart (close/reopen)', async () => {
    await enqueue();
    db.close();
    await db.open();
    const counts = await queueCounts('ws-1');
    expect(counts.pending).toBe(1);
  });

  it('clientMutationId is retained across retries (§14)', async () => {
    const id = await enqueue();
    const before = (await db.syncQueue.get(id))!;
    await markProcessing(before);
    await markRetryable(before, 'network down');
    const after = (await db.syncQueue.get(id))!;
    expect(after.status).toBe('pending');
    expect(after.retryCount).toBe(1);
    expect(after.nextRetryAt).toBeTruthy();
    expect(after.clientMutationId).toBe(before.clientMutationId); // never regenerated
  });

  it('backoff is exponential and bounded; retries exhaust into failed', async () => {
    expect(backoffMs(1)).toBe(2000);
    expect(backoffMs(2)).toBe(4000);
    expect(backoffMs(30)).toBe(5 * 60 * 1000); // cap

    const id = await enqueue({ retryCount: MAX_RETRIES });
    const item = (await db.syncQueue.get(id))!;
    await markRetryable(item, 'still down');
    expect((await db.syncQueue.get(id))!.status).toBe('failed');
  });

  it('duePending respects nextRetryAt and FIFO order', async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    await enqueue({ entityId: 'first' });
    await enqueue({ entityId: 'delayed', nextRetryAt: future });
    await enqueue({ entityId: 'second' });

    const due = await duePending('ws-1');
    expect(due.map((q) => q.entityId)).toEqual(['first', 'second']);
  });

  it('permanent failure is terminal and does not retry', async () => {
    const id = await enqueue();
    const item = (await db.syncQueue.get(id))!;
    await markFailed(item, 'HTTP 422 invalid');
    expect(await duePending('ws-1')).toHaveLength(0);
    expect((await db.syncQueue.get(id))!.status).toBe('failed');
  });

  it('stale-processing recovery returns crashed items to pending (§17)', async () => {
    const id = await enqueue();
    const item = (await db.syncQueue.get(id))!;
    await markProcessing(item);
    // simulate a crash: processingStartedAt far in the past
    await db.syncQueue.update(id, {
      processingStartedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    });

    const recovered = await recoverStaleProcessing('ws-1');
    expect(recovered).toBe(1);
    const after = (await db.syncQueue.get(id))!;
    expect(after.status).toBe('pending');
    expect(after.clientMutationId).toBe(item.clientMutationId);
  });

  it('fresh processing items are NOT stolen by recovery', async () => {
    const id = await enqueue();
    await markProcessing((await db.syncQueue.get(id))!);
    const recovered = await recoverStaleProcessing('ws-1');
    expect(recovered).toBe(0);
  });

  it('markSynced clears errors and finishes the lifecycle', async () => {
    const id = await enqueue();
    const item = (await db.syncQueue.get(id))!;
    await markProcessing(item);
    await markSynced(item);
    const after = (await db.syncQueue.get(id))!;
    expect(after.status).toBe('synced');
    expect(after.lastError).toBeNull();
  });
});
