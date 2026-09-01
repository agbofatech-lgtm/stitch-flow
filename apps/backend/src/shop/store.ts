import type { ShopStore } from './types';

export function createShopStore(): ShopStore {
  return {
    customers: new Map(),
    orders: new Map(),
    artifacts: new Map(),
  };
}
