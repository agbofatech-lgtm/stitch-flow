/**
 * Phase 10 — Customers: operational customer management.
 *
 * Everything here is server-authoritative: the list is server-paginated and
 * searched, creation runs the SAME provisioning pipeline as public
 * registration, and lifecycle actions (suspend / reactivate / revoke
 * sessions / send reset) take effect immediately on the backend. The UI
 * never holds or displays credentials — created customers onboard through
 * the password-reset flow.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  platformApi,
  type PlatformCustomer,
  type PlatformCustomerDetail,
} from '@shared/api/platform';
import {
  Card,
  ConfirmAction,
  EmptyState,
  ErrorState,
  Loading,
  StatusBadge,
  describeApiError,
  fmtDate,
  fmtDateTime,
} from './ui';

const PAGE = 25;

function useCustomerList() {
  const [items, setItems] = useState<PlatformCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status: number | null } | null>(null);
  // Out-of-order response guard: with debounced search + filters, an earlier
  // request can resolve after a later one. Only the LATEST request may paint.
  const seq = useRef(0);

  // Debounced search — server-side query, no client-side filtering.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setOffset(0);
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    const my = ++seq.current;
    setLoading(true);
    try {
      const page = await platformApi.customers({ search: search || undefined, status: status || undefined, limit: PAGE, offset });
      if (my !== seq.current) return; // a newer request is in flight — discard
      setItems(page.items);
      setTotal(page.total);
      setError(null);
    } catch (e) {
      if (my !== seq.current) return;
      setError(describeApiError(e));
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, [search, status, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, total, offset, setOffset, search, searchInput, setSearchInput, status, setStatus, loading, error, reload: load };
}

export function CustomersSection() {
  const list = useCustomerList();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <Card
        title={`Customers${list.total ? ` (${list.total})` : ''}`}
        actions={
          <button
            type="button"
            onClick={() => setCreating((c) => !c)}
            className="rounded-xl bg-[#0F6E8C] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#0c5a73] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6E8C]"
          >
            {creating ? 'Close create form' : 'Create customer'}
          </button>
        }
      >
        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <label className="flex-1 text-xs font-medium text-slate-600">
            <span className="sr-only">Search customers by name, email, phone or workspace</span>
            <input
              type="search"
              value={list.searchInput}
              onChange={(e) => list.setSearchInput(e.target.value)}
              placeholder="Search name, email, phone or workspace…"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0F6E8C] focus:outline-none focus:ring-1 focus:ring-[#0F6E8C]"
            />
          </label>
          <label className="text-xs font-medium text-slate-600 sm:w-44">
            <span className="sr-only">Filter by account status</span>
            <select
              value={list.status}
              onChange={(e) => {
                list.setStatus(e.target.value);
                list.setOffset(0);
              }}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0F6E8C] focus:outline-none focus:ring-1 focus:ring-[#0F6E8C]"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
        </div>

        {notice && (
          <p role="status" className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
            {notice}
          </p>
        )}

        {creating && (
          <CreateCustomerForm
            onCreated={(email, workspaceName, resetSent) => {
              setCreating(false);
              setSelectedId(null);
              setNotice(
                `Customer ${email} created with workspace “${workspaceName}”. ` +
                  (resetSent
                    ? 'A password-reset email was sent so they can choose their password — the password was never shown here.'
                    : 'No reset email sent (unchecked). Use “Send password reset” from the customer detail when ready.')
              );
              void list.reload();
            }}
            onClose={() => setCreating(false)}
          />
        )}

        {list.loading ? (
          <Loading label="Loading customers…" />
        ) : list.error ? (
          <ErrorState message={list.error.message} status={list.error.status} onRetry={() => void list.reload()} />
        ) : list.items.length === 0 ? (
          <EmptyState>{list.search || list.status ? 'No customers match the current filters.' : 'No customers yet — create the first one.'}</EmptyState>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                    <th scope="col" className="py-2 pr-3 font-medium">Customer</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Phone</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Status</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Workspace</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Plan</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Created</th>
                    <th scope="col" className="py-2 font-medium">Last activity</th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((c) => (
                    <tr
                      key={c.id}
                      className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 ${selectedId === c.id ? 'bg-sky-50/70' : ''}`}
                      onClick={() => setSelectedId(c.id)}
                    >
                      <td className="py-2 pr-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(c.id);
                          }}
                          className="text-left font-medium text-[#0F6E8C] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6E8C]"
                        >
                          {c.full_name}
                        </button>
                        <p className="text-[11px] text-slate-500">{c.email}</p>
                      </td>
                      <td className="py-2 pr-3 text-slate-600">{c.phone ?? '—'}</td>
                      <td className="py-2 pr-3"><StatusBadge status={c.status} /></td>
                      <td className="py-2 pr-3 text-slate-600">{c.workspace_name ?? '—'}</td>
                      <td className="py-2 pr-3 text-slate-600">{c.plan ?? '—'}{c.subscription_status ? ` (${c.subscription_status})` : ''}</td>
                      <td className="py-2 pr-3 text-slate-600">{fmtDate(c.created_at)}</td>
                      <td className="py-2 text-slate-600">{fmtDateTime(c.last_activity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>
                {list.offset + 1}–{Math.min(list.offset + PAGE, list.total)} of {list.total}
              </span>
              <span className="flex gap-1.5">
                <button
                  type="button"
                  disabled={list.offset === 0}
                  onClick={() => list.setOffset(Math.max(0, list.offset - PAGE))}
                  className="rounded-xl border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6E8C]"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={list.offset + PAGE >= list.total}
                  onClick={() => list.setOffset(list.offset + PAGE)}
                  className="rounded-xl border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6E8C]"
                >
                  Next
                </button>
              </span>
            </div>
          </>
        )}
      </Card>

      {selectedId && (
        <CustomerDetailPanel
          customerId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => void list.reload()}
        />
      )}
    </div>
  );
}

function CreateCustomerForm({
  onCreated,
  onClose,
}: {
  onCreated: (email: string, workspaceName: string, resetSent: boolean) => void;
  onClose: () => void;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tier, setTier] = useState<'free' | 'pro' | 'enterprise'>('free');
  const [sendReset, setSendReset] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await platformApi.createCustomer({
        email,
        fullName,
        phone: phone.trim() || undefined,
        tier,
        sendReset,
      });
      onCreated(created.user.email, created.workspace.name, created.resetRequested);
    } catch (e) {
      const { message, status } = describeApiError(e);
      setError(status === 409 ? 'That email or phone number is already registered.' : message);
    } finally {
      setBusy(false);
    }
  };

  const field =
    'mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0F6E8C] focus:outline-none focus:ring-1 focus:ring-[#0F6E8C]';

  return (
    <form
      className="mb-4 rounded-2xl border border-sky-200 bg-sky-50/60 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h4 className="text-sm font-semibold text-slate-900">Create customer</h4>
      <p className="mt-1 text-xs text-slate-600">
        Runs the standard provisioning pipeline: user, workspace, owner membership and trial. The
        customer chooses their own password via the reset email — you never see or set it.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-slate-600">
          Full name *
          <input required minLength={2} value={fullName} onChange={(e) => setFullName(e.target.value)} className={field} />
        </label>
        <label className="text-xs font-medium text-slate-600">
          Email *
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
        </label>
        <label className="text-xs font-medium text-slate-600">
          Phone (optional)
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0241234567" className={field} />
        </label>
        <label className="text-xs font-medium text-slate-600">
          License tier
          <select value={tier} onChange={(e) => setTier(e.target.value as typeof tier)} className={field}>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </label>
      </div>
      <label className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-700">
        <input type="checkbox" checked={sendReset} onChange={(e) => setSendReset(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
        Send password-reset email now (recommended)
      </label>
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-[#0F6E8C] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0c5a73] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6E8C]"
        >
          {busy ? 'Creating…' : 'Create customer'}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function CustomerDetailPanel({
  customerId,
  onClose,
  onChanged,
}: {
  customerId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<PlatformCustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status: number | null } | null>(null);
  const [reason, setReason] = useState('');
  // Action feedback lives at panel level: after a lifecycle action the
  // detail reloads and the conditional suspend/reactivate control swaps
  // branches — feedback placed inside it would be destroyed mid-flash.
  const [notice, setNotice] = useState<string | null>(null);
  const flash = (m: string) => {
    setNotice(m);
    window.setTimeout(() => setNotice(null), 6000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDetail(await platformApi.customerDetail(customerId));
      setError(null);
    } catch (e) {
      setError(describeApiError(e));
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshAll = () => {
    void load();
    onChanged();
  };

  // Keep the rendered profile mounted across background refreshes — tearing
  // the panel down after a lifecycle action would also destroy the action's
  // success feedback (and flash the layout).
  if (loading && !detail) return <Loading label="Loading customer profile…" />;
  if (error && !detail) return <ErrorState message={error.message} status={error.status} onRetry={() => void load()} />;
  if (!detail) return null;

  const { user, workspace, subscription, usage, developer, members, recentAudit } = detail;
  const suspended = user.status === 'suspended';
  const reasonOk = reason.trim().length >= 3;

  return (
    <Card
      title="Customer profile"
      actions={
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        >
          Close
        </button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 text-sm">
          <div>
            <h4 className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Identity</h4>
            <p className="mt-1 font-medium text-slate-900">{user.full_name} <StatusBadge status={user.status} /></p>
            <p className="text-slate-600">{user.email}</p>
            <p className="text-slate-600">{user.phone ?? 'No phone on file'}</p>
            <p className="text-[11px] text-slate-400">Joined {fmtDate(user.created_at)} · site role: {user.role}</p>
          </div>
          <div>
            <h4 className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Workspace & plan</h4>
            {workspace ? (
              <>
                <p className="mt-1 text-slate-800">{workspace.name}</p>
                <p className="text-[11px] text-slate-400">{workspace.id}</p>
                <p className="mt-1 text-slate-600">
                  {subscription ? `${subscription.plan_code} plan — ${subscription.status}` : 'No subscription on record'}
                  {subscription?.trial_end ? ` · trial ends ${fmtDate(subscription.trial_end)}` : ''}
                </p>
              </>
            ) : (
              <p className="mt-1 text-slate-600">No workspace</p>
            )}
          </div>
          <div>
            <h4 className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Usage (last 30 days)</h4>
            <p className="mt-1 text-slate-600">
              {usage ? `${usage.events_30d} events · ${usage.events_7d} in last 7d · ${usage.api_requests_30d} API requests` : 'No usage recorded'}
            </p>
            <p className="text-slate-600">Last activity: {fmtDateTime(usage?.last_activity ?? null)}</p>
          </div>
          <div>
            <h4 className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Developer surface (counts only — no secrets)</h4>
            <p className="mt-1 text-slate-600">
              {developer.api_keys ?? 0} API keys ({developer.active_api_keys ?? 0} active) · {developer.endpoints ?? 0} webhook endpoints ({developer.active_endpoints ?? 0} active)
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <h4 className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Workspace members ({members.length})</h4>
            <ul className="mt-1 space-y-1">
              {members.map((m) => (
                <li key={m.user_id} className="text-slate-600">
                  {m.full_name} — {m.email} · {m.role} · <StatusBadge status={m.status} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Recent audit trail</h4>
            {recentAudit.length === 0 ? (
              <p className="mt-1 text-slate-600">No audit entries.</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {recentAudit.map((a, i) => (
                  <li key={`${a.action}-${a.created_at}-${i}`} className="text-slate-600">
                    <span className="font-medium">{a.action}</span> · {fmtDateTime(a.created_at)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <h4 className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Support actions</h4>
            <label className="mt-2 block text-xs font-medium text-slate-600">
              Reason (recorded in the audit log, required for suspend/reactivate)
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Chargeback investigation"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#0F6E8C] focus:outline-none focus:ring-1 focus:ring-[#0F6E8C]"
              />
            </label>
            {notice && (
              <p role="status" className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                {notice}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {!reasonOk && <p className="text-xs text-slate-500">Enter a reason (min 3 characters) to enable lifecycle actions.</p>}
              {suspended ? (
                <ConfirmAction
                  label="Reactivate account"
                  confirmLabel="Reactivate now"
                  onConfirm={async () => {
                    await platformApi.reactivateCustomer(customerId, reason.trim());
                    setReason('');
                    refreshAll();
                    flash('Customer reactivated — sign-in restored.');
                    return 'Customer reactivated — sign-in restored.';
                  }}
                />
              ) : (
                <span className={reasonOk ? '' : 'pointer-events-none opacity-50'}>
                  <ConfirmAction
                    label="Suspend account"
                    confirmLabel="Suspend now — blocks sign-in and ends sessions"
                    tone="danger"
                    onConfirm={async () => {
                      await platformApi.suspendCustomer(customerId, reason.trim());
                      setReason('');
                      refreshAll();
                      flash('Customer suspended — sign-in blocked, sessions revoked.');
                      return 'Customer suspended — sign-in blocked, sessions revoked.';
                    }}
                  />
                </span>
              )}
              <ConfirmAction
                label="Revoke all sessions"
                confirmLabel="Revoke sessions now"
                tone="danger"
                onConfirm={async () => {
                  await platformApi.revokeSessions(customerId);
                  flash('All live sessions revoked — the customer must sign in again.');
                  refreshAll();
                  return 'All live sessions revoked — the customer must sign in again.';
                }}
              />
              <ConfirmAction
                label="Send password reset"
                confirmLabel="Send reset email"
                onConfirm={async () => {
                  await platformApi.sendPasswordReset(customerId);
                  flash('Password-reset email sent via the standard recovery flow.');
                  return 'Password-reset email sent via the standard recovery flow.';
                }}
              />
            </div>
            {!reasonOk && (
              // Keep the reason requirement honest without disabling the buttons
              // that do not need one: suspend/reactivate validate server-side too.
              <p className="mt-1 text-[11px] text-slate-400">Suspend/reactivate also validate the reason on the server.</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
