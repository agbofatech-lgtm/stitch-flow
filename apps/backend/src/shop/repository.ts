import type { ShopCustomer, ShopOrder, ShopTrustedArtifact } from './types';

export type ShopScope = {
  tenantId: string;
  workspaceId: string;
};

export type ShopRepository = {
  insertCustomer(row: ShopCustomer): Promise<void>;
  listCustomers(scope: ShopScope): Promise<ShopCustomer[]>;
  getCustomer(scope: ShopScope, id: string): Promise<ShopCustomer | null>;
  existsCustomer(id: string): Promise<boolean>;
  insertOrder(row: ShopOrder): Promise<void>;
  listOrders(scope: ShopScope): Promise<ShopOrder[]>;
  getOrder(scope: ShopScope, id: string): Promise<ShopOrder | null>;
  existsOrder(id: string): Promise<boolean>;
  updateOrder(scope: ShopScope, row: ShopOrder): Promise<void>;
  insertArtifact(row: ShopTrustedArtifact): Promise<void>;
  getArtifact(scope: ShopScope, id: string): Promise<ShopTrustedArtifact | null>;
  existsArtifact(id: string): Promise<boolean>;
};
