import { useEffect, useState, type ReactNode } from 'react';
import {
  AtelierConfidence,
  AtelierStage,
  AtelierWorkroom,
  Badge,
  Button,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Panel,
} from '../experience';
import { useApp } from '../context/AppContext';
import { BRAND } from '../config/brand';
import { getDataAuthorityRuntime } from '../shared/persistence';
import type { ConnectivityState } from '../shared/persistence/types';
import { controlGet, platformLogin } from './platformClient';

type Plane = 'overview' | 'tenants' | 'configuration' | 'audit' | 'billing';
type Section = 'workspace' | 'system' | 'operations' | 'platform';

const PLANES: Array<[Plane, string, string]> = [
  ['overview', 'Overview', 'Platform health as returned by /control/status'],
  ['tenants', 'Tenants', 'Tenant list from /control/tenants'],
  ['configuration', 'Configuration', 'Operator configuration from /control/configuration'],
  ['audit', 'Audit', 'Audit records from /control/audit'],
  ['billing', 'Billing', 'Provider-neutral billing port from /control/billing/provider'],
];

const PLANE_GROUPS: Array<{ label: string; planes: Plane[] }> = [
  { label: 'System', planes: ['overview', 'configuration'] },
  { label: 'Tenancy', planes: ['tenants'] },
  { label: 'Commercial', planes: ['billing'] },
  { label: 'Governance', planes: ['audit'] },
];

const SECTIONS: Array<[Section, string]> = [
  ['workspace', 'Workspace'],
  ['system', 'System'],
  ['operations', 'Operations'],
  ['platform', 'Platform'],
];

export function ControlCenter({
  onExit,
  onOpenSettings,
}: {
  onExit: () => void;
  onOpenSettings?: () => void;
}) {
  const { currentWorkspace, currentMember, featureAccess } = useApp();
  const [section, setSection] = useState<Section>('workspace');
  const [connectivity, setConnectivity] = useState<ConnectivityState>('offline');
  const [pendingOps, setPendingOps] = useState(0);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [plane, setPlane] = useState<Plane>('overview');
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [payload, setPayload] = useState<unknown>(null);

  useEffect(() => {
    const runtime = getDataAuthorityRuntime();
    if (!runtime) return;
    setConnectivity(runtime.connectivity.getState());
    void runtime.store.listOperations().then((ops) => {
      setPendingOps(ops.filter((op) => op.status === 'pending').length);
    });
    return runtime.connectivity.subscribe((next) => setConnectivity(next));
  }, []);

  const floorConfidence =
    connectivity === 'offline' ? 'offline' : connectivity === 'syncing' ? 'syncing' : pendingOps > 0 ? 'queued' : 'local';

  async function login() {
    setBusy(true);
    setError(null);
    try {
      const result = await platformLogin(email, password);
      const access = result.accessToken as string;
      setToken(access);
      const st = await controlGet('/control/status', access);
      setStatus(st);
      setPlane('overview');
      setPayload(st);
    } catch (err) {
      setToken(null);
      setStatus(null);
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  async function load(next: Plane) {
    if (!token) return;
    setBusy(true);
    setError(null);
    setPlane(next);
    try {
      if (next === 'overview') {
        setPayload(await controlGet('/control/status', token));
      } else if (next === 'tenants') {
        setPayload(await controlGet('/control/tenants', token));
      } else if (next === 'configuration') {
        setPayload(await controlGet('/control/configuration', token));
      } else if (next === 'audit') {
        setPayload(await controlGet('/control/audit', token));
      } else {
        setPayload(await controlGet('/control/billing/provider', token));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
      setPayload(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AtelierWorkroom
      place="Control Center"
      title="Operator plane"
      purpose="Governs this StitchFlow workspace with authority that already exists. It is not the AGBOFA Platform Control Center."
      confidence={
        <AtelierConfidence
          state={floorConfidence}
          detail={
            pendingOps > 0
              ? `${pendingOps} outbox. Remote sync is not claimed.`
              : 'Local workspace. Remote sync is not claimed.'
          }
        />
      }
      primaryAction={
        <Button variant="secondary" onClick={onExit}>
          Return to atelier
        </Button>
      }
    >
      <p className="text-meta text-ink-muted">
        Operator {currentMember.user.fullName} · {currentMember.role}. This plane observes and hosts existing workspace
        controls. It does not invent tenant, billing, or platform authority.
      </p>

      <nav aria-label="Operator sections" className="mt-4 flex flex-wrap gap-2">
        {SECTIONS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            data-control-section={id}
            aria-current={section === id ? 'true' : undefined}
            onClick={() => setSection(id)}
            className={`sf-focus-ring min-h-11 rounded-sf-pill px-3 text-meta ${
              section === id ? 'bg-action-primary text-ink-inverse' : 'bg-action-secondary text-ink-secondary'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {section === 'workspace' ? (
        <AtelierStage className="mt-6">
          <p className="text-meta text-ink-muted">Workspace</p>
          <h2 className="mt-1 font-display text-heading text-ink-primary">{currentWorkspace.name}</h2>
          <dl className="mt-4 space-y-2 text-body text-ink-secondary">
            <div className="flex justify-between gap-3">
              <dt>Workspace id</dt>
              <dd className="font-numeric">{currentWorkspace.id}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Recorded currency</dt>
              <dd className="font-numeric">{currentWorkspace.defaultCurrency || 'Currency not recorded'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Operator</dt>
              <dd>
                {currentMember.user.fullName} · {currentMember.role}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-meta text-ink-muted">
            Profile and branding persist through AppContext. That mutation lives in Workspace settings, not a second
            store.
          </p>
          {onOpenSettings ? (
            <div className="mt-4">
              <Button onClick={onOpenSettings}>Open workspace settings</Button>
            </div>
          ) : null}
        </AtelierStage>
      ) : null}

      {section === 'system' ? (
        <AtelierStage className="mt-6">
          <p className="text-meta text-ink-muted">System</p>
          <h2 className="mt-1 font-display text-heading text-ink-primary">Protected tailoring systems</h2>
          <ul className="mt-4 space-y-3 text-body text-ink-secondary">
            <li>Pattern Engine — protected. Not configurable here.</li>
            <li>Production Assistant — protected. Not configurable here.</li>
            <li>Measurement vocabulary — protected. Not configurable here.</li>
            <li>Design Studio — hosted. Finalize for Production remains inside the studio.</li>
            <li>Trusted finalization (SAC-1) — display only. No switch.</li>
          </ul>
          <p className="mt-4 text-meta text-ink-muted">This section does not invent metrics.</p>
        </AtelierStage>
      ) : null}

      {section === 'operations' ? (
        <AtelierStage className="mt-6">
          <p className="text-meta text-ink-muted">Operations</p>
          <h2 className="mt-1 font-display text-heading text-ink-primary">Existing presentation gates</h2>
          <p className="mt-3 text-body text-ink-secondary">
            FeatureGate is UX presentation only. Server entitlements are not changed from this plane. Live billing is
            not opened here.
          </p>
          <ul className="mt-4 space-y-2 text-meta text-ink-muted">
            <li>Branded export presentation: {featureAccess.canBrandExport.allowed ? 'allowed in UX' : 'not allowed in UX'}</li>
            <li>PDF export presentation: {featureAccess.canExportPdf.allowed ? 'allowed in UX' : 'not allowed in UX'}</li>
            <li>Analytics presentation: {featureAccess.canViewAnalytics.allowed ? 'allowed in UX' : 'not allowed in UX'}</li>
          </ul>
          <p className="mt-4 text-meta text-ink-muted">
            Plan simulation, if used, remains in Workspace settings. It does not charge a card.
          </p>
          {onOpenSettings ? (
            <div className="mt-4">
              <Button variant="secondary" onClick={onOpenSettings}>
                Open workspace settings
              </Button>
            </div>
          ) : null}
        </AtelierStage>
      ) : null}

      {section === 'platform' ? (
        <div className="mt-6 space-y-4">
          <AtelierStage>
            <p className="text-meta text-ink-muted">Platform</p>
            <h2 className="mt-1 font-display text-heading text-ink-primary">{BRAND.parentName}</h2>
            <p className="mt-3 text-body text-ink-secondary">
              Central platform controls are not connected in this runtime. ADR-007: AGBOFA Control Center does not exist
              in this repository. This room does not link to a nonexistent application.
            </p>
            <p className="mt-3 text-meta text-ink-muted">
              Platform governance is managed outside this workspace. Do not treat a probe as a connection.
            </p>
          </AtelierStage>

          <Panel>
            <p className="text-label">Platform API probe</p>
            <p className="mt-1 text-meta text-ink-muted">
              Optional probe of /auth/login and /control APIs. Not StitchFlow workspace sign-in. Empty is empty — we do
              not invent metrics.
            </p>
            {!token ? (
              <form
                className="mt-4 max-w-md space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void login();
                }}
              >
                <Field label="Operator email" htmlFor="cc-email">
                  <Input
                    id="cc-email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </Field>
                <Field label="Password" htmlFor="cc-password">
                  <Input
                    id="cc-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </Field>
                {error ? (
                  <ErrorState
                    title="Probe failed"
                    description={error}
                    action={
                      <Button variant="secondary" size="sm" onClick={() => setError(null)}>
                        Dismiss
                      </Button>
                    }
                  />
                ) : null}
                <Button type="submit" loading={busy}>
                  Probe /control
                </Button>
              </form>
            ) : (
              <div className="mt-4 grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
                <nav aria-label="Control Center" className="space-y-4">
                  {PLANE_GROUPS.map((group) => (
                    <div key={group.label}>
                      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                        {group.label}
                      </p>
                      <div className="space-y-1">
                        {group.planes.map((id) => {
                          const entry = PLANES.find((item) => item[0] === id)!;
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => void load(id)}
                              className={`sf-focus-ring flex min-h-11 w-full rounded-sf px-3 py-2 text-left text-label ${
                                plane === id ? 'bg-action-primary text-ink-inverse' : 'hover:bg-action-secondary'
                              }`}
                            >
                              {entry[1]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </nav>
                <div>
                  <p className="text-meta text-ink-muted">{PLANES.find((item) => item[0] === plane)?.[2]}</p>
                  {status ? (
                    <div className="mb-4 mt-3 flex flex-wrap gap-2">
                      <Badge>{String(status.plane || 'control')}</Badge>
                      <Badge tone="warning">Live PSP deferred</Badge>
                      <Badge tone="neutral">Postgres not verified</Badge>
                    </div>
                  ) : null}
                  {busy ? <LoadingState label="Loading platform state…" /> : null}
                  {error ? (
                    <ErrorState
                      description={error}
                      action={
                        <Button variant="secondary" size="sm" onClick={() => void load(plane)}>
                          Retry plane
                        </Button>
                      }
                    />
                  ) : null}
                  {!busy && !error ? <CommandPayload payload={payload} /> : null}
                </div>
              </div>
            )}
          </Panel>
        </div>
      ) : null}
    </AtelierWorkroom>
  );
}

function CommandPayload({ payload }: { payload: unknown }) {
  if (payload == null || payload === '') {
    return (
      <p className="mt-3 text-body text-ink-muted">
        This plane returned nothing. Empty is empty — we do not invent metrics.
      </p>
    );
  }
  if (typeof payload !== 'object') {
    return <p className="mt-3 font-numeric text-body">{String(payload)}</p>;
  }
  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      return <p className="mt-3 text-body text-ink-muted">API returned an empty list.</p>;
    }
    return (
      <ol className="mt-3 space-y-3">
        {payload.map((item, index) => (
          <li key={index} className="rounded-sf border border-line bg-surface-workspace p-3">
            <ObjectFields value={item} />
          </li>
        ))}
      </ol>
    );
  }
  return (
    <div className="mt-3">
      <ObjectFields value={payload} />
    </div>
  );
}

function ObjectFields({ value }: { value: unknown }) {
  if (value == null || typeof value !== 'object') {
    return <span className="font-numeric">{value == null ? '—' : String(value)}</span>;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) {
    return <p className="text-body text-ink-muted">Object had no keys.</p>;
  }
  return (
    <dl className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
      {entries.map(([key, field]) => (
        <FieldRow key={key} name={key} value={field} />
      ))}
    </dl>
  );
}

function FieldRow({ name, value }: { name: string; value: unknown }) {
  let display: ReactNode;
  if (value == null) display = '—';
  else if (typeof value === 'object')
    display = <pre className="overflow-auto font-numeric text-meta">{JSON.stringify(value)}</pre>;
  else display = String(value);
  return (
    <>
      <dt className="text-meta uppercase tracking-[0.12em] text-ink-muted">{name}</dt>
      <dd className="font-numeric text-body text-ink-primary">{display}</dd>
    </>
  );
}
