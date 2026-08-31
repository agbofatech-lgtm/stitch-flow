import { STORAGE_KEYS } from '../lib/storageKeys';

export const LEGACY_LOCALSTORAGE_STATUS = 'TRANSITIONAL' as const;

export const LEGACY_KEY_MAP = {
  customer: STORAGE_KEYS.customers,
  order: STORAGE_KEYS.orders,
  invoice: STORAGE_KEYS.invoices,
  payment: STORAGE_KEYS.payments,
  measurement: STORAGE_KEYS.measurementProfiles,
  material: STORAGE_KEYS.fabricRecords,
  inventory: STORAGE_KEYS.fabricRecords,
  design: STORAGE_KEYS.designInspirations,
  garment: STORAGE_KEYS.studioSession,
} as const;

export function readLegacyLocalStorageKey(key: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage.getItem(key);
}

export function listLegacyPersistencePaths() {
  return Object.entries(LEGACY_KEY_MAP).map(([entity, key]) => ({
    entity,
    key,
    status: LEGACY_LOCALSTORAGE_STATUS,
    retirement: 'T2+ dual-read then remove after owner-approved migration. Not deleted in T2.',
  }));
}
