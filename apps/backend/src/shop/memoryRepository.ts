import type { ShopCustomer, ShopOrder, ShopStore, ShopTrustedArtifact } from './types';
import { createShopStore } from './store';
import type { ShopChange, ShopRepository, ShopScope, ShopSyncOpRow } from './repository';

export function createMemoryShopRepository(store: ShopStore = createShopStore()): ShopRepository {
  const syncOps = new Map<string, ShopSyncOpRow>();
  const changes: ShopChange[] = [];
  let seq = 0;

  function scoped<T extends { tenantId: string; workspaceId: string }>(row: T | undefined, scope: ShopScope) {
    if (!row) return null;
    if (row.tenantId !== scope.tenantId || row.workspaceId !== scope.workspaceId) return null;
    return row;
  }

  function opKey(scope: ShopScope, operationId: string) {
    return `${scope.tenantId}:${scope.workspaceId}:${operationId}`;
  }

  return {
    async insertCustomer(row) {
      store.customers.set(row.id, row);
    },
    async listCustomers(scope) {
      return [...store.customers.values()].filter(
        (row) => row.tenantId === scope.tenantId && row.workspaceId === scope.workspaceId && !row.deletedAt
      );
    },
    async getCustomer(scope, id) {
      return scoped(store.customers.get(id), scope);
    },
    async existsCustomer(id) {
      return store.customers.has(id);
    },
    async updateCustomer(scope, row, expectedVersion) {
      const existing = scoped(store.customers.get(row.id), scope);
      if (!existing || existing.deletedAt) return null;
      if (existing.version !== expectedVersion) return null;
      store.customers.set(row.id, row);
      return row;
    },
    async insertOrder(row) {
      store.orders.set(row.id, row);
    },
    async listOrders(scope) {
      return [...store.orders.values()].filter(
        (row) => row.tenantId === scope.tenantId && row.workspaceId === scope.workspaceId && !row.deletedAt
      );
    },
    async getOrder(scope, id) {
      return scoped(store.orders.get(id), scope);
    },
    async existsOrder(id) {
      return store.orders.has(id);
    },
    async updateOrder(scope, row, expectedVersion) {
      const existing = scoped(store.orders.get(row.id), scope);
      if (!existing || existing.deletedAt) return null;
      if (expectedVersion !== undefined && existing.version !== expectedVersion) return null;
      store.orders.set(row.id, row);
      return row;
    },
    async insertArtifact(row) {
      store.artifacts.set(row.id, row);
    },
    async getArtifact(scope, id) {
      return scoped(store.artifacts.get(id), scope);
    },
    async existsArtifact(id) {
      return store.artifacts.has(id);
    },
    async getSyncOperation(scope, operationId) {
      return syncOps.get(opKey(scope, operationId)) || null;
    },
    async putSyncOperation(row) {
      syncOps.set(opKey({ tenantId: row.tenantId, workspaceId: row.workspaceId }, row.operationId), row);
    },
    async insertChange(row) {
      seq += 1;
      const change: ShopChange = {
        seq,
        tenantId: row.tenantId,
        workspaceId: row.workspaceId,
        entityType: row.entityType,
        entityId: row.entityId,
        operationType: row.operationType,
        version: row.version,
        payload: row.payload,
        occurredAt: row.occurredAt || new Date().toISOString(),
      };
      changes.push(change);
      return change;
    },
    async listChanges(scope, afterSeq, limit) {
      return changes
        .filter(
          (row) =>
            row.tenantId === scope.tenantId && row.workspaceId === scope.workspaceId && row.seq > afterSeq
        )
        .slice(0, limit);
    },
  };
}
