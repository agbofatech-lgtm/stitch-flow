import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';
import { StitchFlowDatabase, db, DOMAIN_TABLES } from '../../src/db/database';
import { SCHEMA_V1, CURRENT_SCHEMA_VERSION } from '../../src/db/schema';
import { getSyncMeta, updateSyncMeta, getSyncDiagnostics } from '../../src/db/syncMeta';
import { migrateLocalStorageToIndexedDb } from '../../src/db/migrateLocalStorage';
import { STORAGE_KEYS } from '../../src/shared/lib/storageKeys';

describe('Dexie database foundation', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it('opens and initializes the full schema at the current version', async () => {
    expect(db.isOpen()).toBe(true);
    expect(db.verno).toBe(CURRENT_SCHEMA_VERSION);
    const names = db.tables.map((table) => table.name);
    for (const table of DOMAIN_TABLES) expect(names).toContain(table);
    expect(names).toContain('syncQueue');
    expect(names).toContain('syncMeta');
  });

  it('persists data across close/reopen (restart simulation)', async () => {
    await db.customers.put({ id: 'c-1', workspaceId: 'ws-1', fullName: 'Ama', deletedAt: null });
    db.close();
    await db.open();
    const row = await db.customers.get('c-1');
    expect(row?.fullName).toBe('Ama');
  });

  it('upgrades from schema v1 to v2 preserving existing data', async () => {
    const name = `upgrade-test-${Date.now()}`;
    // simulate an installation that only ever knew v1
    const old = new Dexie(name);
    old.version(1).stores(SCHEMA_V1);
    await old.open();
    await old.table('customers').put({ id: 'legacy-1', workspaceId: 'ws-1', fullName: 'Old Row' });
    await old.table('syncQueue').put({
      clientMutationId: 'cmid-legacy', workspaceId: 'ws-1', entity: 'customers',
      entityId: 'legacy-1', operation: 'insert', payload: {}, status: 'pending',
      retryCount: 0, createdAt: 'x', updatedAt: 'x', lastAttemptAt: null,
      nextRetryAt: null, processingStartedAt: null, lastError: null, occurredAt: 'x',
    });
    old.close();

    const upgraded = new StitchFlowDatabase(name);
    await upgraded.open();
    expect(upgraded.verno).toBe(CURRENT_SCHEMA_VERSION);
    expect((await upgraded.customers.get('legacy-1'))?.fullName).toBe('Old Row');
    // new v2 compound index works over migrated data
    const pending = await upgraded.syncQueue
      .where('[workspaceId+status]').equals(['ws-1', 'pending']).count();
    expect(pending).toBe(1);
    upgraded.close();
  });

  it('sync metadata: cursor persists and defaults sanely', async () => {
    const meta = await getSyncMeta('ws-1');
    expect(meta.currentCursor).toBe('0');
    await updateSyncMeta('ws-1', { currentCursor: '42', lastSuccessfulSync: 'now' });
    db.close();
    await db.open();
    expect((await getSyncMeta('ws-1')).currentCursor).toBe('42');
  });

  it('diagnostics expose counts and cursor but no secrets', async () => {
    const diag = await getSyncDiagnostics('ws-1');
    expect(diag).toHaveProperty('currentCursor');
    expect(diag).toHaveProperty('pendingMutations');
    expect(JSON.stringify(diag)).not.toMatch(/token|secret|password/i);
  });
});

describe('localStorage migration (§34)', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((table) => table.clear()));
    window.localStorage.clear();
  });

  it('imports legacy rows, is idempotent, and never overwrites IndexedDB data', async () => {
    window.localStorage.setItem(
      STORAGE_KEYS.customers,
      JSON.stringify([
        { id: 'legacy-c1', fullName: 'Legacy One' },
        { id: 'existing-c2', fullName: 'Legacy Two (stale)' },
      ])
    );
    // newer IndexedDB row must win
    await db.customers.put({
      id: 'existing-c2', workspaceId: 'ws-1', fullName: 'Newer IDB Row', deletedAt: null,
    });

    const first = await migrateLocalStorageToIndexedDb('ws-1');
    expect(first.alreadyMigrated).toBe(false);
    expect(first.migrated).toBe(1);
    expect(first.skippedExisting).toBe(1);
    expect((await db.customers.get('existing-c2'))?.fullName).toBe('Newer IDB Row');
    expect((await db.customers.get('legacy-c1'))?.workspaceId).toBe('ws-1');

    // idempotent second run
    const second = await migrateLocalStorageToIndexedDb('ws-1');
    expect(second.alreadyMigrated).toBe(true);
    expect(second.migrated).toBe(0);

    // non-destructive: localStorage untouched
    expect(window.localStorage.getItem(STORAGE_KEYS.customers)).toContain('legacy-c1');
  });
});
