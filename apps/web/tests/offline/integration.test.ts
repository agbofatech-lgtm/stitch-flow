import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/db/database';
import { mirrorSnapshotToIndexedDb, flushMirrorForTests } from '../../src/db/appStateBridge';
import { resolveActiveWorkspaceId } from '../../src/offline/bootstrap';
import { STORAGE_KEYS } from '../../src/shared/lib/storageKeys';

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
  window.localStorage.clear();
});

describe('App integration bridge (§36–§37)', () => {
  it('mirrors AppContext snapshots into IndexedDB without touching the UI', async () => {
    mirrorSnapshotToIndexedDb({
      currentWorkspaceId: 'ws-ui',
      customers: [{ id: 'c-ui-1', fullName: 'From UI' }],
      orders: [{ id: 'o-ui-1', customerId: 'c-ui-1' }],
      invoices: [], payments: [], fabricRecords: [{ id: 'f-1', name: 'Silk' }],
      materialUsages: [], measurementProfiles: [],
    } as never);
    await flushMirrorForTests();

    expect((await db.customers.get('c-ui-1'))?.workspaceId).toBe('ws-ui');
    expect((await db.fabrics.get('f-1'))?.name).toBe('Silk');
    expect(await db.orders.count()).toBe(1);
  });

  it('debounce coalesces rapid snapshots (last one wins)', async () => {
    for (let i = 0; i < 5; i += 1) {
      mirrorSnapshotToIndexedDb({
        currentWorkspaceId: 'ws-ui',
        customers: [{ id: 'c-deb', fullName: `Rev ${i}` }],
        orders: [], invoices: [], payments: [], fabricRecords: [],
        materialUsages: [], measurementProfiles: [],
      } as never);
    }
    await flushMirrorForTests();
    expect((await db.customers.get('c-deb'))?.fullName).toBe('Rev 4');
  });

  it('resolveActiveWorkspaceId reads the existing storage key with safe fallback', () => {
    expect(resolveActiveWorkspaceId()).toBe('default-workspace');
    window.localStorage.setItem(STORAGE_KEYS.currentWorkspaceId, JSON.stringify('ws-42'));
    expect(resolveActiveWorkspaceId()).toBe('ws-42');
  });
});
