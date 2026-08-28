/**
 * Phase 10 — Developer Control Center client (frontend ONLY).
 *
 * Thin typed wrapper over the certified platform endpoints:
 *   /platform/*  (JWT + platform role, enforced server-side per request)
 *
 * Authorization is NEVER decided here: a 403 from the server is the single
 * source of truth for "this operator may not do that". This module only
 * shapes requests and surfaces typed errors.
 */
import { API_BASE, getAuthHeaders, getRefreshToken, tryRefreshTokens } from '../utils/api';

export class PlatformApiError extends Error {
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

async function platformRequest<T>(method: string, path: string, body?: unknown, retryOn401 = true): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...getAuthHeaders(),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Same app-wide refresh rotation as every first-party client: on 401
  // rotate once and retry.
  if (res.status === 401 && retryOn401 && getRefreshToken()) {
    const refreshed = await tryRefreshTokens();
    if (refreshed) return platformRequest<T>(method, path, body, false);
  }

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    const envelope = json as { error?: { code?: string; message?: string } } | null;
    throw new PlatformApiError(
      res.status,
      envelope?.error?.code ?? null,
      envelope?.error?.message || `Request failed (${res.status})`,
      json
    );
  }
  return json as T;
}

/* ---------- Overview / usage / signals / errors (read) ---------- */

export type PlatformOverview = {
  windowDays: number;
  activeWorkspaces: number;
  dailyActive: number;
  weeklyActive: number;
  monthlyActive: number;
  featureAdoption: Array<{ feature: string; workspaces: number; uses: number }>;
  versionHealth: Array<{ app_version: string; events: number; errors: number }>;
};

export type PlatformWorkspaceRow = {
  id: string;
  name: string;
  plan: string | null;
  subscription_status: string | null;
  members: number;
  customers: number;
  orders: number;
  last_activity: string | null;
  errors_7d: number;
  sync_failures_7d: number;
};

export type PlatformCustomer = {
  id: string;
  email: string;
  phone: string | null;
  full_name: string;
  role: string;
  status: 'active' | 'suspended';
  created_at: string;
  workspace_id: string | null;
  workspace_name: string | null;
  plan: string | null;
  subscription_status: string | null;
  last_activity: string | null;
};

export type PlatformCustomerPage = {
  items: PlatformCustomer[];
  total: number;
  limit: number;
  offset: number;
};

export type PlatformCustomerDetail = {
  user: PlatformCustomer & { role: string };
  workspace: { id: string; name: string; created_at: string } | null;
  members: Array<{ role: string; joined_at: string; user_id: string; email: string; full_name: string; status: string }>;
  subscription: {
    plan_code: string;
    status: string;
    trial_start: string | null;
    trial_end: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    cancelled_at: string | null;
  } | null;
  usage: { events_7d: number; events_30d: number; api_requests_30d: number; last_activity: string | null } | null;
  developer: { api_keys?: number; active_api_keys?: number; endpoints?: number; active_endpoints?: number };
  recentAudit: Array<{ action: string; entity_type: string; entity_id: string | null; created_at: string }>;
};

export type PlatformWorkspaceDetail = {
  workspace: { id: string; name: string; owner_user_id: string; created_at: string };
  owner: { id: string; email: string; full_name: string; status: string } | null;
  members: Array<{ role: string; joined_at: string; user_id: string; email: string; full_name: string; status: string }>;
  subscription: { plan_code: string; status: string; trial_start: string | null; trial_end: string | null } | null;
  stats: {
    customers: number;
    orders: number;
    usage_30d: number;
    api_requests_30d: number;
    api_keys: number;
    webhook_endpoints: number;
    errors_7d: number;
  } | null;
};

export type PlatformAuditEntry = {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type PlatformFlag = { flag_key: string; enabled: boolean; description: string | null };

export const platformApi = {
  overview: () => platformRequest<PlatformOverview>('GET', '/platform/overview'),

  customers: (params: { search?: string; status?: string; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.status) qs.set('status', params.status);
    qs.set('limit', String(params.limit ?? 25));
    qs.set('offset', String(params.offset ?? 0));
    return platformRequest<PlatformCustomerPage>('GET', `/platform/customers?${qs.toString()}`);
  },

  customerDetail: (id: string) => platformRequest<PlatformCustomerDetail>('GET', `/platform/customers/${encodeURIComponent(id)}`),

  createCustomer: (input: { email: string; fullName: string; phone?: string; tier?: 'free' | 'pro' | 'enterprise'; sendReset?: boolean }) =>
    platformRequest<{ user: { id: string; email: string; full_name: string; status: string }; workspace: { id: string; name: string }; resetRequested: boolean }>(
      'POST',
      '/platform/customers',
      input
    ),

  suspendCustomer: (id: string, reason: string) =>
    platformRequest<{ id: string; status: 'suspended' }>('POST', `/platform/customers/${encodeURIComponent(id)}/suspend`, { reason }),

  reactivateCustomer: (id: string, reason: string) =>
    platformRequest<{ id: string; status: 'active' }>('POST', `/platform/customers/${encodeURIComponent(id)}/reactivate`, { reason }),

  revokeSessions: (id: string) =>
    platformRequest<{ id: string; sessionsRevoked: boolean }>('POST', `/platform/customers/${encodeURIComponent(id)}/revoke-sessions`),

  sendPasswordReset: (id: string) =>
    platformRequest<{ id: string; resetRequested: boolean }>('POST', `/platform/customers/${encodeURIComponent(id)}/send-reset`),

  workspaces: (limit = 100) => platformRequest<PlatformWorkspaceRow[]>('GET', `/platform/workspaces?limit=${limit}`),

  workspaceDetail: (id: string) => platformRequest<PlatformWorkspaceDetail>('GET', `/platform/workspaces/${encodeURIComponent(id)}`),

  featureUsage: () => platformRequest<unknown>('GET', '/platform/feature-usage'),

  signals: () => platformRequest<unknown>('GET', '/platform/signals'),

  errors: (limit = 50) => platformRequest<unknown[]>('GET', `/platform/errors?limit=${limit}`),

  incidents: () => platformRequest<unknown[]>('GET', '/platform/incidents'),

  updateIncident: (id: string, status: string, note?: string) =>
    platformRequest<unknown>('PATCH', `/platform/incidents/${encodeURIComponent(id)}`, { status, ...(note ? { note } : {}) }),

  flags: () => platformRequest<PlatformFlag[]>('GET', '/platform/flags'),

  setFlag: (key: string, enabled: boolean) =>
    platformRequest<PlatformFlag>('PATCH', `/platform/flags/${encodeURIComponent(key)}`, { enabled }),

  auditLogs: (params: { limit?: number; offset?: number; action?: string } = {}) => {
    const qs = new URLSearchParams();
    qs.set('limit', String(params.limit ?? 50));
    qs.set('offset', String(params.offset ?? 0));
    if (params.action) qs.set('action', params.action);
    return platformRequest<PlatformAuditEntry[]>('GET', `/platform/audit-logs?${qs.toString()}`);
  },

  setOperatorRole: (email: string, role: string) =>
    platformRequest<{ id: string; email: string; role: string }>('POST', '/platform/operators', { email, role }),

  /** Manual outbox dispatch + single drain pass (operate-level). */
  dispatchWebhooks: () =>
    platformRequest<{ dispatch: unknown; drain: unknown }>('POST', '/platform/webhooks/dispatch'),
};
