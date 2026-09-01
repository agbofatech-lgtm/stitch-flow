import type { ShopCustomer, ShopOrder, ShopStore, ShopTrustedArtifact } from './types';
import { createShopStore } from './store';
import type { ShopRepository, ShopScope } from './repository';

export function createMemoryShopRepository(store: ShopStore = createShopStore()): ShopRepository {
  function scoped<T extends { tenantId: string; workspaceId: string }>(row: T | undefined, scope: ShopScope) {
    if (!row) return null;
    if (row.tenantId !== scope.tenantId || row.workspaceId !== scope.workspaceId) return null;
    return row;
  }

  return {
    async insertCustomer(row) {
      store.customers.set(row.id, row);
    },
    async listCustomers(scope) {
      return [...store.customers.values()].filter(
        (row) => row.tenantId === scope.tenantId && row.workspaceId === scope.workspaceId
      );
    },
    async getCustomer(scope, id) {
      return scoped(store.customers.get(id), scope);
    },
    async existsCustomer(id) {
      return store.customers.has(id);
    },
    async insertOrder(row) {
      store.orders.set(row.id, row);
    },
    async listOrders(scope) {
      return [...store.orders.values()].filter(
        (row) => row.tenantId === scope.tenantId && row.workspaceId === scope.workspaceId
      );
    },
    async getOrder(scope, id) {
      return scoped(store.orders.get(id), scope);
    },
    async existsOrder(id) {
      return store.orders.has(id);
    },
    async updateOrder(scope, row) {
      const existing = scoped(store.orders.get(row.id), scope);
      if (!existing) return;
      store.orders.set(row.id, row);
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
  };
}
