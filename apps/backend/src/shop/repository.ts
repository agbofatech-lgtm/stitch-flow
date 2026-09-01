import type { ShopCustomer, ShopOrder, ShopTrustedArtifact } from './types';

export type ShopScope = {
  tenantId: string;
  workspaceId: string;
};

export type ShopChange = {
  seq: number;
  tenantId: string;
  workspaceId: string;
  entityType: string;
  entityId: string;
  operationType: string;
  version: number;
  payload: Record<string, unknown>;
  occurredAt: string;
};

export type ShopSyncOpRow = {
  tenantId: string;
  workspaceId: string;
  operationId: string;
  entityType: string;
  entityId: string;
  operationType: string;
  status: string;
  result: Record<string, unknown>;
  processedAt: string;
};

export type ShopRepository = {
  insertCustomer(row: ShopCustomer): Promise<void>;
  listCustomers(scope: ShopScope): Promise<ShopCustomer[]>;
  getCustomer(scope: ShopScope, id: string): Promise<ShopCustomer | null>;
  existsCustomer(id: string): Promise<boolean>;
  updateCustomer(scope: ShopScope, row: ShopCustomer, expectedVersion: number): Promise<ShopCustomer | null>;
  insertOrder(row: ShopOrder): Promise<void>;
  listOrders(scope: ShopScope): Promise<ShopOrder[]>;
  getOrder(scope: ShopScope, id: string): Promise<ShopOrder | null>;
  existsOrder(id: string): Promise<boolean>;
  updateOrder(scope: ShopScope, row: ShopOrder, expectedVersion?: number): Promise<ShopOrder | null>;
  insertArtifact(row: ShopTrustedArtifact): Promise<void>;
  getArtifact(scope: ShopScope, id: string): Promise<ShopTrustedArtifact | null>;
  existsArtifact(id: string): Promise<boolean>;
  getSyncOperation(scope: ShopScope, operationId: string): Promise<ShopSyncOpRow | null>;
  putSyncOperation(row: ShopSyncOpRow): Promise<void>;
  insertChange(row: Omit<ShopChange, 'seq' | 'occurredAt'> & { occurredAt?: string }): Promise<ShopChange>;
  listChanges(scope: ShopScope, afterSeq: number, limit: number): Promise<ShopChange[]>;
};
