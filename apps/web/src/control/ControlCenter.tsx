import { useState } from 'react';
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
          description="Governance plane. Tenant workspace Settings is not this room. Numbers come from /control APIs only."
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
            <nav aria-label="Control Center" className="space-y-1">
              {(
                [
                  ['overview', 'Overview'],
                  ['tenants', 'Tenants'],
                  ['configuration', 'Configuration'],
                  ['audit', 'Audit'],
                  ['billing', 'Billing'],
                ] as Array<[Plane, string]>
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => void load(id)}
                  className={`sf-focus-ring flex min-h-10 w-full rounded-sf px-3 py-2 text-left text-label ${
                    plane === id ? 'bg-action-primary text-ink-inverse' : 'hover:bg-action-secondary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
            <Panel>
              {status ? (
                <div className="mb-4 flex flex-wrap gap-2">
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
              {payload ? (
                <pre className="mt-3 overflow-auto rounded-sf bg-surface-workspace p-4 font-numeric text-meta text-ink-secondary">
                  {JSON.stringify(payload, null, 2)}
                </pre>
              ) : (
                <p className="text-body text-ink-muted">
                  Signed in. Choose a plane. Empty JSON means the API returned nothing — we do not invent metrics.
                </p>
              )}
            </Panel>
          </div>
        )}
      </Workroom>
    </AtelierCanvas>
  );
}
