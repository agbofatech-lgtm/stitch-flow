import { migrateLocalStorageToIndexedDb } from '../db/migrateLocalStorage';
import { syncNow } from '../modules/services/syncEngine';
import { getAccessToken } from '../shared/utils/api';
import { STORAGE_KEYS } from '../shared/lib/storageKeys';

/**
 * Offline foundation bootstrap (§30, §46–§48).
 *
 * Controlled sync triggers only: startup, browser 'online' event, and a
 * conservative periodic attempt. No uncontrolled polling; syncNow() itself
 * is single-flight. Everything here is fail-safe: the app must start and
 * run fully offline (§47), so no error escapes this module.
 */
const PERIODIC_SYNC_MS = 5 * 60 * 1000;

export function resolveActiveWorkspaceId(): string {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.currentWorkspaceId);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string' && parsed) return parsed;
    }
  } catch {
    // fall through
  }
  return 'default-workspace';
}

export async function bootstrapOfflineFoundation(): Promise<void> {
  try {
    const workspaceId = resolveActiveWorkspaceId();

    // one-time, idempotent, non-destructive legacy import
    await migrateLocalStorageToIndexedDb(workspaceId);

    // startup sync (skips safely when unauthenticated/offline)
    if (getAccessToken()) {
      void syncNow(workspaceId);
    }

    // reconnect trigger — actual request success decides availability (§29)
    window.addEventListener('online', () => {
      void syncNow(resolveActiveWorkspaceId());
    });

    // conservative periodic attempt
    window.setInterval(() => {
      if (getAccessToken()) {
        void syncNow(resolveActiveWorkspaceId());
      }
    }, PERIODIC_SYNC_MS);
  } catch {
    // offline-first: bootstrap failures must never block the UI
  }
}
