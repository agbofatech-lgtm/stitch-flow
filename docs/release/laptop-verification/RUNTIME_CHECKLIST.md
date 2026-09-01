# Runtime checklist

## Backend

- [ ] `npm run dev:backend` prints listen on `0.0.0.0:5000`
- [ ] `GET /health` → `{ status: "ok" }`
- [ ] `GET /ready` → `postgres: not-verified`, `billingProvider: deferred`
- [ ] `GET /control/status` without JWT → unauthorized (not 200 with fake metrics)

## Frontend

- [ ] `npm run dev:web` on port 5173
- [ ] Splash then StudioShell
- [ ] Skip link “Skip to workspace” exists
- [ ] Command palette Ctrl/Cmd+K
- [ ] Six mobile nav items on a narrow window

## Persistence truth (do not upgrade)

| Layer | Status |
|---|---|
| PostgreSQL | NOT VERIFIED |
| Migrations 001–006 | NOT APPLIED as production DB in this programme |
| File JSON IAM | TRANSITIONAL if `PLATFORM_DATA_PATH` set |
| In-memory IAM | default when path unset |
| T2 browser persistence | implemented; tests pass; AppContext localStorage TRANSITIONAL |

## Auth

Tenant user ≠ platform operator. Control Center login is operator IAM (`POST /auth/login`), not a tenant “become operator” button.
