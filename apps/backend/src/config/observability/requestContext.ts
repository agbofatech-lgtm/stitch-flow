import { AsyncLocalStorage } from 'async_hooks';

/**
 * Per-request context (Phase 6): correlation data made available to
 * services (audit logging) without threading `req` through every layer.
 * Built-in async_hooks — no new dependency.
 *
 * Values are correlation metadata ONLY (never credentials, never payloads).
 */
export interface RequestContext {
  requestId?: string;
  workspaceId?: string;
  actorId?: string;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/** Mutable store for the current request (safe: one object per request). */
export function setRequestContext(patch: Partial<RequestContext>): void {
  const store = requestContextStorage.getStore();
  if (store) Object.assign(store, patch);
}

export function getRequestContext(): RequestContext {
  return requestContextStorage.getStore() ?? {};
}
