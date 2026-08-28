/**
 * Phase 10 — Operators: grant or change platform roles.
 *
 * Owner/admin-only, audited server-side, and deliberately limited: you
 * cannot change your own role (lock-out protection enforced by the
 * backend). A granted role takes effect at the operator's NEXT sign-in —
 * the role claim is minted into the token at login, never trusted from
 * the client.
 */
import { useState } from 'react';
import { platformApi } from '@shared/api/platform';
import { Card, ErrorState, describeApiError } from './ui';

const ROLE_CHOICES = [
  { value: 'platform_admin', label: 'Platform admin — read + all write operations' },
  { value: 'platform_support', label: 'Platform support — read + session/webhook operations' },
  { value: 'platform_analyst', label: 'Platform analyst — read-only visibility' },
  { value: 'platform_owner', label: 'Platform owner — full control (use with care)' },
];

export function OperatorsSection() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('platform_analyst');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; status: number | null } | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await platformApi.setOperatorRole(email.trim(), role);
      setSuccess(
        `${res.email} is now ${res.role}. The new role takes effect at their next sign-in. Recorded in the audit log.`
      );
      setEmail('');
    } catch (e) {
      setError(describeApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const field =
    'mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0F6E8C] focus:outline-none focus:ring-1 focus:ring-[#0F6E8C]';

  return (
    <Card title="Platform operators">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <p className="text-sm text-slate-600">
          Grant a platform role to an existing user. Requires platform owner/admin. Workspace
          owners never inherit platform access — roles are granted explicitly, here.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-slate-600">
            User email
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Platform role
            <select value={role} onChange={(e) => setRole(e.target.value)} className={field}>
              {ROLE_CHOICES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {success && (
          <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
            {success}
          </p>
        )}
        {error && <ErrorState message={error.message} status={error.status} />}
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-[#0F6E8C] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0c5a73] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6E8C]"
        >
          {busy ? 'Saving…' : 'Set operator role'}
        </button>
        <p className="text-[11px] text-slate-400">
          You cannot change your own role from here. Role changes are audited with actor, target
          and timestamp.
        </p>
      </form>
    </Card>
  );
}
