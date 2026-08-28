/**
 * Phase 8 — Developer Dashboard (frontend for the certified backend).
 *
 * Surfaces the existing Phase 8 contracts in the browser:
 *   - API keys (one-time secret, prefix-only listing, scopes, revoke)
 *   - Webhook endpoints (one-time signing secret, SSRF-validated URLs,
 *     event subscriptions, disable/delete, test delivery)
 *   - Delivery history (DELIVERED / RETRYING / PENDING / DEAD_LETTER,
 *     attempts, failure reasons) + dead-letter replay
 *   - Usage / API activity (Phase 7 usage pipeline)
 *
 * Secrets are shown exactly once in a modal and discarded from state on
 * close; listings only ever render prefixes. All data is workspace-scoped
 * by the backend; this view adds no cross-workspace capability.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Code2,
  Copy,
  Check,
  KeyRound,
  Webhook,
  Activity,
  RefreshCw,
  Plus,
  ShieldAlert,
  Send,
  RotateCcw,
  Trash2,
  Power,
  FlaskConical,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  developerApi,
  DeveloperApiError,
  WEBHOOK_EVENT_CATALOG,
  type ApiKeyRow,
  type ScopeCatalog,
  type UsageSummary,
  type WebhookDeliveryRow,
  type WebhookEndpointRow,
} from '@shared/api/developer';
import { getAuthWorkspaceId } from '@shared/utils/api';

type Tab = 'overview' | 'keys' | 'webhooks' | 'deliveries';

function describeError(err: unknown): string {
  if (err instanceof DeveloperApiError) {
    if (err.status === 401) {
      return 'Not signed in. The Developer console requires an authenticated workspace session (the server rejected the request with 401).';
    }
    if (err.status === 403 && err.code === 'FEATURE_DISABLED') {
      return 'This capability is currently disabled for the deployment (feature flag OFF). Ask a platform administrator to enable it.';
    }
    if (err.status === 403) {
      return 'Your account is not allowed to perform this action (403).';
    }
    return `${err.message}${err.code ? ` [${err.code}]` : ''} (HTTP ${err.status})`;
  }
  return err instanceof Error ? err.message : 'Unexpected error';
}

function Badge({ tone, children }: { tone: 'green' | 'amber' | 'red' | 'slate' | 'blue'; children: React.ReactNode }) {
  const cls =
    tone === 'green'
      ? 'bg-emerald-100 text-emerald-700'
      : tone === 'amber'
        ? 'bg-amber-100 text-amber-700'
        : tone === 'red'
          ? 'bg-red-100 text-red-700'
          : tone === 'blue'
            ? 'bg-sky-100 text-sky-700'
            : 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {children}
    </span>
  );
}

function deliveryTone(status: string): 'green' | 'amber' | 'red' | 'slate' | 'blue' {
  if (status === 'DELIVERED') return 'green';
  if (status === 'RETRYING' || status === 'PENDING' || status === 'DELIVERING') return 'amber';
  if (status === 'DEAD_LETTER') return 'red';
  return 'slate';
}

function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  icon,
  tone = 'red',
  busy,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  icon?: React.ReactNode;
  tone?: 'red' | 'slate';
  busy?: boolean;
}) {
  const [arming, setArming] = useState(false);
  useEffect(() => {
    if (!arming) return;
    const t = window.setTimeout(() => setArming(false), 4000);
    return () => window.clearTimeout(t);
  }, [arming]);
  const base =
    tone === 'red'
      ? 'text-red-600 hover:bg-red-50 border-red-200'
      : 'text-slate-600 hover:bg-slate-100 border-slate-200';
  return (
    <button
      type="button"
      disabled={busy}
      aria-label={arming ? confirmLabel : label}
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition disabled:opacity-50 ${
        arming ? 'bg-red-600 text-white border-red-600' : base
      }`}
      onClick={() => {
        if (arming) {
          setArming(false);
          onConfirm();
        } else {
          setArming(true);
        }
      }}
    >
      {icon}
      {arming ? confirmLabel : label}
    </button>
  );
}

/* ------------------------- one-time secret modal ------------------------- */
function SecretModal({
  kind,
  secret,
  onClose,
  onSelfTest,
}: {
  kind: 'api-key' | 'webhook';
  secret: string;
  onClose: () => void;
  onSelfTest?: (secret: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setTestResult('Clipboard unavailable in this browser — select and copy manually.');
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-3 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-slate-800">
            {kind === 'api-key' ? 'API key created — copy the secret now' : 'Webhook endpoint created — copy the signing secret now'}
          </h3>
        </div>
        <p className="mb-3 text-sm text-slate-600">
          This secret is displayed <strong>only once</strong>. It is stored as a hash / sealed
          envelope server-side and can never be shown again. Leaving or reloading this page
          will not reveal it again.
        </p>
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <code data-testid="one-time-secret" className="flex-1 break-all font-mono text-xs text-slate-800">
            {secret}
          </code>
          <button
            type="button"
            onClick={copy}
            aria-label="Copy secret"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        {onSelfTest && (
          <button
            type="button"
            onClick={() => onSelfTest(secret)}
            className="mb-3 inline-flex items-center gap-1 rounded-lg border border-sky-200 px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50"
          >
            <FlaskConical className="h-4 w-4" /> Run a live /api/v1/me request with this key
          </button>
        )}
        {testResult && <p className="mb-3 text-xs text-slate-600">{testResult}</p>}
        <button
          type="button"
          data-testid="secret-dismiss"
          onClick={onClose}
          className="w-full rounded-xl bg-[#0F6E8C] py-2 text-sm font-semibold text-white hover:bg-[#0C5C74]"
        >
          I have stored it securely — close (secret will be discarded)
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ main view ------------------------------- */
export function DeveloperDashboard() {
  const { currentWorkspace } = useApp();
  const [tab, setTab] = useState<Tab>('overview');

  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [scopes, setScopes] = useState<ScopeCatalog | null>(null);
  const [endpoints, setEndpoints] = useState<WebhookEndpointRow[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDeliveryRow[]>([]);
  const [deadLetters, setDeadLetters] = useState<WebhookDeliveryRow[]>([]);
  const [deliveryFilter, setDeliveryFilter] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [secret, setSecret] = useState<{ kind: 'api-key' | 'webhook'; value: string } | null>(null);

  /* key form */
  const [keyName, setKeyName] = useState('');
  const [keyScopes, setKeyScopes] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  /* webhook form */
  const [whUrl, setWhUrl] = useState('');
  const [whDesc, setWhDesc] = useState('');
  const [whEvents, setWhEvents] = useState<string[]>([]);

  const workspaceId = useMemo(() => getAuthWorkspaceId(), []);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const [u, k, s, e, d, dl] = await Promise.all([
          developerApi.usageSummary().catch((err) => {
            throw err;
          }),
          developerApi.listKeys(),
          developerApi.scopes(),
          developerApi.listEndpoints(),
          developerApi.listDeliveries(deliveryFilter || undefined),
          developerApi.listDeadLetters(),
        ]);
        setUsage(u);
        setKeys(k);
        setScopes(s);
        setEndpoints(e);
        setDeliveries(d);
        setDeadLetters(dl);
      } catch (err) {
        setError(describeError(err));
      } finally {
        setLoading(false);
      }
    },
    [deliveryFilter]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const endpointById = useMemo(() => {
    const m = new Map<string, WebhookEndpointRow>();
    endpoints.forEach((e) => m.set(e.id, e));
    return m;
  }, [endpoints]);

  /* ------------------------------ actions ------------------------------- */
  const createKey = async () => {
    setFormError(null);
    const name = keyName.trim();
    if (!name) return setFormError('Key name is required.');
    if (keyScopes.length === 0) return setFormError('Select at least one scope.');
    setBusy('create-key');
    try {
      const created = await developerApi.createKey({ name, scopes: keyScopes });
      setSecret({ kind: 'api-key', value: created.secret });
      setKeyName('');
      setKeyScopes([]);
      await load(true);
    } catch (err) {
      setFormError(describeError(err));
    } finally {
      setBusy(null);
    }
  };

  const revokeKey = async (id: string) => {
    setBusy('revoke-' + id);
    try {
      await developerApi.revokeKey(id);
      setNotice('Key revoked — it can no longer authenticate API requests.');
      await load(true);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(null);
    }
  };

  const createEndpoint = async () => {
    setFormError(null);
    const url = whUrl.trim();
    if (!url) return setFormError('Endpoint URL is required.');
    if (whEvents.length === 0) return setFormError('Select at least one event (or "@all").');
    setBusy('create-endpoint');
    try {
      const created = await developerApi.createEndpoint({
        url,
        description: whDesc.trim() || undefined,
        subscribedEvents: whEvents,
      });
      setSecret({ kind: 'webhook', value: created.secret });
      setWhUrl('');
      setWhDesc('');
      setWhEvents([]);
      await load(true);
    } catch (err) {
      setFormError(describeError(err));
    } finally {
      setBusy(null);
    }
  };

  const testEndpoint = async (id: string) => {
    setBusy('test-' + id);
    try {
      await developerApi.testEndpoint(id);
      setNotice('Test event queued through the real outbox pipeline. Refresh Deliveries to watch it settle.');
      window.setTimeout(() => void load(true), 2500);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(null);
    }
  };

  const toggleEndpoint = async (ep: WebhookEndpointRow) => {
    setBusy('toggle-' + ep.id);
    try {
      await developerApi.updateEndpoint(ep.id, { status: ep.status === 'active' ? 'disabled' : 'active' });
      await load(true);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(null);
    }
  };

  const deleteEndpoint = async (id: string) => {
    setBusy('delete-' + id);
    try {
      await developerApi.deleteEndpoint(id);
      setNotice('Endpoint deleted. Past deliveries remain in history for audit.');
      await load(true);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(null);
    }
  };

  const replay = async (id: string) => {
    setBusy('replay-' + id);
    try {
      await developerApi.replayDeadLetter(id);
      setNotice('Replay created a NEW attempt; historical attempts remain intact.');
      await load(true);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(null);
    }
  };

  const selfTest = async (s: string) => {
    try {
      const me = await developerApi.selfTest(s);
      setNotice(`Live /api/v1/me OK — key "${me.name}" (${me.scopes.join(', ')}). The request was metered into usage.`);
    } catch (err) {
      setError(describeError(err));
    }
  };

  /* ------------------------------- render ------------------------------- */
  const tabs: { id: Tab; label: string; icon: typeof Code2 }[] = [
    { id: 'overview', label: 'Overview & Usage', icon: Activity },
    { id: 'keys', label: 'API Keys', icon: KeyRound },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
    { id: 'deliveries', label: 'Delivery History', icon: Send },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <Code2 className="h-6 w-6 text-[#0F6E8C]" /> Developer
          </h1>
          <p className="text-sm text-slate-500">
            Workspace: <span className="font-semibold text-slate-700">{currentWorkspace?.name ?? '—'}</span>
            {workspaceId ? <span className="ml-2 font-mono text-xs text-slate-400">{workspaceId}</span> : null}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Developer sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
              tab === t.id ? 'bg-[#0F6E8C] text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </nav>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700" role="status">
          {notice}
          <button type="button" className="ml-2 underline" onClick={() => setNotice(null)}>
            dismiss
          </button>
        </div>
      )}
      {loading && !error && <p className="text-sm text-slate-500">Loading developer data…</p>}

      {/* ------------------------------ OVERVIEW ----------------------------- */}
      {tab === 'overview' && !error && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-slate-400">Events (30d)</p>
            <p className="text-3xl font-bold text-slate-800">{usage?.activity.total_events ?? 0}</p>
            <p className="text-xs text-slate-500">active users: {usage?.activity.active_users ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-slate-400">API keys</p>
            <p className="text-3xl font-bold text-slate-800">{keys.length}</p>
            <p className="text-xs text-slate-500">{keys.filter((k) => k.status === 'active').length} active</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-slate-400">Webhook endpoints</p>
            <p className="text-3xl font-bold text-slate-800">{endpoints.length}</p>
            <p className="text-xs text-slate-500">{endpoints.filter((e) => e.status === 'active').length} active</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-slate-400">Dead letters</p>
            <p className="text-3xl font-bold text-red-600">{deadLetters.length}</p>
            <p className="text-xs text-slate-500">replay from Delivery History</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 md:col-span-2 xl:col-span-4">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Feature adoption (usage pipeline)</p>
            {usage && usage.featureAdoption.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {usage.featureAdoption.map((f) => (
                  <Badge key={f.feature} tone={f.feature === 'developer_api' ? 'blue' : 'slate'}>
                    {f.feature}: {f.uses}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No usage recorded yet for this workspace.</p>
            )}
            <p className="mt-2 text-xs text-slate-400">
              Usage is attributed to this workspace only. Developer API requests (X-API-Key) are metered as api_request events.
            </p>
          </div>
        </section>
      )}

      {/* ------------------------------- KEYS -------------------------------- */}
      {tab === 'keys' && !error && (
        <section className="space-y-4">
          <form
            className="rounded-2xl border border-slate-200 bg-white p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void createKey();
            }}
          >
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Plus className="h-4 w-4" /> Create API key
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-slate-600">
                Name
                <input
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g. Orders integration"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <div className="text-sm text-slate-600">
                Scopes
                <div className="mt-1 flex flex-wrap gap-2">
                  {(scopes?.enforceable ?? []).map((s) => (
                    <label key={s} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs">
                      <input
                        type="checkbox"
                        checked={keyScopes.includes(s)}
                        onChange={(e) =>
                          setKeyScopes((prev) => (e.target.checked ? [...prev, s] : prev.filter((x) => x !== s)))
                        }
                      />
                      {s}
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Reserved (not grantable yet): {(scopes?.reserved ?? []).join(', ') || '—'}
                </p>
              </div>
            </div>
            {formError && tab === 'keys' && <p className="mt-2 text-sm text-red-600">{formError}</p>}
            <button
              type="submit"
              disabled={busy === 'create-key'}
              className="mt-3 rounded-xl bg-[#0F6E8C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0C5C74] disabled:opacity-50"
            >
              Create key
            </button>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Prefix</th>
                  <th className="px-4 py-2">Scopes</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Requests</th>
                  <th className="px-4 py-2">Last used</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                      No API keys yet for this workspace.
                    </td>
                  </tr>
                )}
                {keys.map((k) => (
                  <tr key={k.id} className="border-b border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-700">{k.name}</td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-500">{k.key_prefix}…</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {k.scopes.map((s) => (
                          <Badge key={s} tone="slate">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <Badge tone={k.status === 'active' ? 'green' : 'red'}>{k.status}</Badge>
                    </td>
                    <td className="px-4 py-2">{Number(k.request_count)}</td>
                    <td className="px-4 py-2 text-xs text-slate-500">{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'never'}</td>
                    <td className="px-4 py-2">
                      {k.status === 'active' && (
                        <ConfirmButton
                          label="Revoke"
                          confirmLabel="Confirm revoke"
                          busy={busy === 'revoke-' + k.id}
                          onConfirm={() => void revokeKey(k.id)}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ------------------------------ WEBHOOKS ------------------------------ */}
      {tab === 'webhooks' && !error && (
        <section className="space-y-4">
          <form
            className="rounded-2xl border border-slate-200 bg-white p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void createEndpoint();
            }}
          >
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Plus className="h-4 w-4" /> Register webhook endpoint
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-slate-600">
                HTTPS URL
                <input
                  value={whUrl}
                  onChange={(e) => setWhUrl(e.target.value)}
                  placeholder="https://example.com/hooks/stitchflow"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm text-slate-600">
                Description
                <input
                  value={whDesc}
                  onChange={(e) => setWhDesc(e.target.value)}
                  placeholder="optional"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="mt-3 text-sm text-slate-600">
              Events
              <div className="mt-1 flex flex-wrap gap-2">
                {['@all', ...WEBHOOK_EVENT_CATALOG].map((ev) => (
                  <label key={ev} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs">
                    <input
                      type="checkbox"
                      checked={whEvents.includes(ev)}
                      onChange={(e) =>
                        setWhEvents((prev) => (e.target.checked ? [...prev, ev] : prev.filter((x) => x !== ev)))
                      }
                    />
                    {ev}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Unsafe destinations (loopback / private ranges / metadata) are rejected by the server's SSRF policy.
              </p>
            </div>
            {formError && tab === 'webhooks' && <p className="mt-2 text-sm text-red-600">{formError}</p>}
            <button
              type="submit"
              disabled={busy === 'create-endpoint'}
              className="mt-3 rounded-xl bg-[#0F6E8C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0C5C74] disabled:opacity-50"
            >
              Register endpoint
            </button>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-2">URL</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Events</th>
                  <th className="px-4 py-2">Secret</th>
                  <th className="px-4 py-2">Deliveries</th>
                  <th className="px-4 py-2">Dead letters</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                      No webhook endpoints yet for this workspace.
                    </td>
                  </tr>
                )}
                {endpoints.map((ep) => (
                  <tr key={ep.id} className="border-b border-slate-100">
                    <td className="max-w-[260px] truncate px-4 py-2 font-mono text-xs text-slate-600">{ep.url}</td>
                    <td className="px-4 py-2">
                      <Badge tone={ep.status === 'active' ? 'green' : 'slate'}>{ep.status}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex max-w-[260px] flex-wrap gap-1">
                        {ep.subscribed_events.map((ev) => (
                          <Badge key={ev} tone="blue">
                            {ev}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-500">{ep.secret_prefix}…</td>
                    <td className="px-4 py-2">{ep.total_deliveries ?? '—'}</td>
                    <td className="px-4 py-2">{ep.dead_letter_count ?? 0}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          disabled={busy === 'test-' + ep.id || ep.status !== 'active'}
                          onClick={() => void testEndpoint(ep.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-sky-200 px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 disabled:opacity-50"
                        >
                          <Send className="h-3 w-3" /> Test delivery
                        </button>
                        <button
                          type="button"
                          disabled={busy === 'toggle-' + ep.id}
                          onClick={() => void toggleEndpoint(ep)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                        >
                          <Power className="h-3 w-3" /> {ep.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                        <ConfirmButton
                          label="Delete"
                          confirmLabel="Confirm delete"
                          icon={<Trash2 className="h-3 w-3" />}
                          busy={busy === 'delete-' + ep.id}
                          onConfirm={() => void deleteEndpoint(ep.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ----------------------------- DELIVERIES ----------------------------- */}
      {tab === 'deliveries' && !error && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-slate-600" htmlFor="delivery-filter">
              Status filter
            </label>
            <select
              id="delivery-filter"
              value={deliveryFilter}
              onChange={(e) => setDeliveryFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="RETRYING">RETRYING</option>
              <option value="PENDING">PENDING</option>
              <option value="DEAD_LETTER">DEAD_LETTER</option>
            </select>
            <button
              type="button"
              onClick={() => void load(true)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-2">Created</th>
                  <th className="px-4 py-2">Event</th>
                  <th className="px-4 py-2">Endpoint</th>
                  <th className="px-4 py-2">Attempt</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">HTTP</th>
                  <th className="px-4 py-2">Failure reason</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                      No deliveries match this filter yet.
                    </td>
                  </tr>
                )}
                {deliveries.map((d) => (
                  <tr key={d.id} className="border-b border-slate-100">
                    <td className="px-4 py-2 text-xs text-slate-500">{new Date(d.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <Badge tone="blue">{d.event_type}</Badge>
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-2 font-mono text-xs text-slate-500">
                      {d.endpoint_id ? endpointById.get(d.endpoint_id)?.url ?? '(deleted endpoint)' : '—'}
                    </td>
                    <td className="px-4 py-2">{d.attempt}</td>
                    <td className="px-4 py-2">
                      <Badge tone={deliveryTone(d.status)}>{d.status}</Badge>
                    </td>
                    <td className="px-4 py-2">{d.response_status ?? '—'}</td>
                    <td className="max-w-[240px] truncate px-4 py-2 text-xs text-slate-500">{d.failure_reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border border-red-200 bg-white p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-600">
              <RotateCcw className="h-4 w-4" /> Dead letters ({deadLetters.length})
            </h2>
            {deadLetters.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing dead-lettered. Failed deliveries appear here once retries are exhausted.</p>
            ) : (
              <ul className="space-y-2">
                {deadLetters.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-2 text-sm">
                    <span className="text-xs text-slate-500">{new Date(d.created_at).toLocaleString()}</span>
                    <Badge tone="blue">{d.event_type}</Badge>
                    <span className="text-xs text-slate-500">attempt {d.attempt}</span>
                    <span className="text-xs text-slate-500">reason: {d.failure_reason ?? '—'}</span>
                    <span className="flex-1" />
                    <ConfirmButton
                      label="Replay"
                      confirmLabel="Confirm replay"
                      tone="slate"
                      icon={<RotateCcw className="h-3 w-3" />}
                      busy={busy === 'replay-' + d.id}
                      onConfirm={() => void replay(d.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {secret && (
        <SecretModal
          kind={secret.kind}
          secret={secret.value}
          onClose={() => setSecret(null)}
          onSelfTest={secret.kind === 'api-key' ? (s) => void selfTest(s) : undefined}
        />
      )}
    </div>
  );
}
