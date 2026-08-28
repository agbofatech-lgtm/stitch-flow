/**
 * Phase 10 — Feature flags: server-authoritative list + confirmed toggles.
 * Mutation requires the platform WRITE role — the server decides; a
 * non-authorized operator sees the 403 explanation, not a broken button.
 */
import { useCallback, useEffect, useState } from 'react';
import { platformApi, type PlatformFlag } from '@shared/api/platform';
import { Card, ConfirmAction, EmptyState, ErrorState, Loading, describeApiError } from './ui';

export function FlagsSection() {
  const [flags, setFlags] = useState<PlatformFlag[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status: number | null } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setFlags(await platformApi.flags());
      setError(null);
    } catch (e) {
      setError(describeApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Loading label="Loading feature flags…" />;
  if (error) return <ErrorState message={error.message} status={error.status} onRetry={() => void load()} />;

  return (
    <Card title="Feature flags">
      {!flags || flags.length === 0 ? (
        <EmptyState>No feature flags configured.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {flags.map((f) => (
            <li
              key={f.flag_key}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{f.flag_key}</p>
                {f.description && <p className="text-xs text-slate-500">{f.description}</p>}
                <p className="mt-0.5 text-[11px] font-semibold">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 ${
                      f.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {f.enabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </p>
              </div>
              <ConfirmAction
                label={f.enabled ? 'Disable flag' : 'Enable flag'}
                confirmLabel={f.enabled ? `Disable ${f.flag_key}?` : `Enable ${f.flag_key}?`}
                tone={f.enabled ? 'danger' : 'default'}
                onConfirm={async () => {
                  await platformApi.setFlag(f.flag_key, !f.enabled);
                  await load();
                  return `${f.flag_key} ${f.enabled ? 'disabled' : 'enabled'} (audited).`;
                }}
              />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-slate-400">
        Changes take effect immediately for all workspaces and are recorded in the audit log.
        Requires platform owner/admin.
      </p>
    </Card>
  );
}
