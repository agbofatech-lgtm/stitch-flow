/**
 * Phase 8 — Developer console client (frontend ONLY).
 *
 * Thin typed wrapper over the already-certified backend contracts:
 *   /developers/*  (DEVELOPER_API flag, staff JWT + workspace)
 *   /webhooks/*    (WEBHOOK_MANAGEMENT flag, staff JWT + workspace)
 *   /usage/summary (Phase 7 usage pipeline)
 *   /api/v1/me     (API-key self-test; X-API-Key, NOT the staff JWT)
 *
 * Secrets are handled with one-time semantics: they are returned by the
 * create calls exactly once and must be discarded by the UI after display.
 */
import { API_BASE, getAuthHeaders, getRefreshToken, tryRefreshTokens } from '../utils/api';

export class DeveloperApiError extends Error {
  status: number;
  code: string | null;
  detail: unknown;
  constructor(status: number, code: string | null, message: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

async function devRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
  retryOn401 = true
): Promise<T> {
  // When an API key is presented (key self-test) the staff JWT must NOT be
  // sent: /api/v1 authenticates the key only.
  const auth = headers['X-API-Key'] ? {} : getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...auth,
      ...headers,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Honor the app-wide refresh-token rotation: on 401 rotate once and retry,
  // exactly like every other first-party API client in this app.
  if (res.status === 401 && retryOn401 && !headers['X-API-Key'] && getRefreshToken()) {
    const refreshed = await tryRefreshTokens();
    if (refreshed) return devRequest<T>(method, path, body, headers, false);
  }
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    const err = (json ?? {}) as { code?: string; message?: string; error?: { code?: string; message?: string } };
    const code = err.code ?? err.error?.code ?? null;
    const message =
      err.message ?? err.error?.message ?? `Request failed with HTTP ${res.status}`;
    throw new DeveloperApiError(res.status, code, message, json);
  }
  return json as T;
}

/* ------------------------------- types ---------------------------------- */

export interface ApiKeyRow {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  status: 'active' | 'revoked' | 'expired';
  expires_at: string | null;
  last_used_at: string | null;
  request_count: string | number;
  created_at: string;
  revoked_at: string | null;
}

export interface ScopeCatalog {
  enforceable: string[];
  reserved: string[];
}

export interface WebhookEndpointRow {
  id: string;
  workspace_id: string;
  url: string;
  description: string | null;
  status: 'active' | 'disabled';
  subscribed_events: string[];
  secret_prefix: string;
  max_attempts: number;
  backoff_base_seconds: number;
  failure_count: number;
  last_delivery_at: string | null;
  created_at: string;
  total_deliveries?: number;
  delivered_count?: number;
  dead_letter_count?: number;
}

export interface WebhookDeliveryRow {
  id: string;
  delivery_key: string;
  workspace_id: string;
  endpoint_id: string | null;
  event_type: string;
  attempt: number;
  status: 'PENDING' | 'DELIVERING' | 'DELIVERED' | 'RETRYING' | 'DEAD_LETTER';
  response_status: number | null;
  response_time_ms: number | null;
  failure_reason: string | null;
  next_retry_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface UsageSummary {
  windowDays: number;
  activity: { active_users: number; total_events: number };
  featureAdoption: { feature: string; uses: number }[];
  workflows: Record<string, number>;
}

/** Business events emitted through the integration outbox (Phase 7/8). */
export const WEBHOOK_EVENT_CATALOG = [
  'CUSTOMER_CREATED',
  'CUSTOMER_UPDATED',
  'ORDER_CREATED',
  'ORDER_STATUS_CHANGED',
  'PAYMENT_RECORDED',
  'FITTING_CREATED',
  'FITTING_COMPLETED',
  'APPOINTMENT_CREATED',
  'APPOINTMENT_COMPLETED',
  'REFERRAL_CREATED',
  'REFERRAL_CONVERTED',
] as const;

/* ----------------------------- API keys --------------------------------- */

export const developerApi = {
  scopes: () => devRequest<ScopeCatalog>('GET', '/developers/scopes'),
  listKeys: () => devRequest<ApiKeyRow[]>('GET', '/developers/keys'),
  createKey: (input: { name: string; scopes: string[]; expiresAt?: string }) =>
    devRequest<{ key: ApiKeyRow; secret: string }>('POST', '/developers/keys', input),
  revokeKey: (id: string) =>
    devRequest<{ revoked: true; id: string }>('POST', `/developers/keys/${encodeURIComponent(id)}/revoke`),
  setKeyScopes: (id: string, scopes: string[]) =>
    devRequest<{ id: string; scopes: string[] }>('PATCH', `/developers/keys/${encodeURIComponent(id)}/scopes`, { scopes }),

  /* ----------------------------- webhooks -------------------------------- */
  listEndpoints: () => devRequest<WebhookEndpointRow[]>('GET', '/webhooks/endpoints'),
  createEndpoint: (input: {
    url: string;
    description?: string;
    subscribedEvents: string[];
    maxAttempts?: number;
    backoffBaseSeconds?: number;
  }) => devRequest<{ endpoint: WebhookEndpointRow; secret: string }>('POST', '/webhooks/endpoints', input),
  updateEndpoint: (
    id: string,
    patch: { url?: string; description?: string; status?: 'active' | 'disabled'; subscribedEvents?: string[] }
  ) => devRequest<WebhookEndpointRow>('PATCH', `/webhooks/endpoints/${encodeURIComponent(id)}`, patch),
  deleteEndpoint: (id: string) =>
    devRequest<{ deleted: true; id: string }>('DELETE', `/webhooks/endpoints/${encodeURIComponent(id)}`),
  testEndpoint: (id: string) =>
    devRequest<{ queued: true }>('POST', `/webhooks/endpoints/${encodeURIComponent(id)}/test`),
  listDeliveries: (status?: string) =>
    devRequest<WebhookDeliveryRow[]>('GET', status ? `/webhooks/deliveries?status=${encodeURIComponent(status)}` : '/webhooks/deliveries'),
  listDeadLetters: () => devRequest<WebhookDeliveryRow[]>('GET', '/webhooks/dead-letters'),
  replayDeadLetter: (id: string) =>
    devRequest<{ replayed: true }>('POST', `/webhooks/dead-letters/${encodeURIComponent(id)}/replay`),

  /* ------------------------------- usage --------------------------------- */
  usageSummary: () => devRequest<UsageSummary>('GET', '/usage/summary'),

  /* --------------------- API-key self-test (no staff JWT) ---------------- */
  selfTest: (secret: string) =>
    devRequest<{ keyId: string; name: string; workspaceId: string; scopes: string[]; status: string }>(
      'GET',
      '/api/v1/me',
      undefined,
      { 'X-API-Key': secret }
    ),
};
