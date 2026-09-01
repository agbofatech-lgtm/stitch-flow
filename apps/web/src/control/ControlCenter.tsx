import { useState, type ReactNode } from 'react';
import {
  AtelierCanvas,
  Badge,
  Button,
  ErrorState,
  Field,
  Input,
  LoadingState,
  PageHeader,
  Panel,
  Workroom,
} from '../experience';
import { controlGet, platformLogin } from './platformClient';

type Plane = 'overview' | 'tenants' | 'configuration' | 'audit' | 'billing';

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

export function ControlCenter({ onExit }: { onExit: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [plane, setPlane] = useState<Plane>('overview');
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [payload, setPayload] = useState<unknown>(null);

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
    <AtelierCanvas>
      <Workroom>
        <PageHeader
          kicker="Platform command room"
          title="Control Center"
          description="Governance plane. Tenant Settings is not this room. Values come from /control APIs only."
          actions={
            <Button variant="secondary" onClick={onExit}>
              Return to atelier
            </Button>
          }
        />

        {!token ? (
          <Panel className="max-w-md">
            <p className="text-label">Operator sign-in</p>
            <p className="mt-1 text-meta text-ink-muted">
              Tenant owners cannot become operators through this form. Grant is server-side only.
            </p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void login();
              }}
            >
              <Field label="Email" htmlFor="cc-email" required>
                <Input
                  id="cc-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label="Password" htmlFor="cc-password" required>
                <Input
                  id="cc-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              {error ? (
                <ErrorState
                  title="Access denied"
                  description={error}
                  action={
                    <Button variant="secondary" size="sm" onClick={() => setError(null)}>
                      Dismiss
                    </Button>
                  }
                />
              ) : null}
              <Button type="submit" loading={busy}>
                Sign in
              </Button>
            </form>
          </Panel>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
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
                          className={`sf-focus-ring flex min-h-10 w-full rounded-sf px-3 py-2 text-left text-label ${
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
            <Panel>
              <p className="text-meta text-ink-muted">{PLANES.find((item) => item[0] === plane)?.[2]}</p>
              {status ? (
                <div className="mt-3 mb-4 flex flex-wrap gap-2">
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
            </Panel>
          </div>
        )}
      </Workroom>
    </AtelierCanvas>
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
  else if (typeof value === 'object') display = <pre className="overflow-auto font-numeric text-meta">{JSON.stringify(value)}</pre>;
  else display = String(value);
  return (
    <>
      <dt className="text-meta uppercase tracking-[0.12em] text-ink-muted">{name}</dt>
      <dd className="font-numeric text-body text-ink-primary">{display}</dd>
    </>
  );
}
