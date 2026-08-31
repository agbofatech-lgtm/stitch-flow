# T1 Implementation Report

| Field | Value |
|---|---|
| Date | 2026-08-31 |
| Authorization | Owner prompt `AUTHORIZE T1 IMPLEMENTATION` |
| Starting commit | `0b39d3c79f5ad8c426df1d732505d8f737154071` (T1 forensics) |
| T0 tag | `transformation-t0-baseline-accepted` = `ce3d45bdb057296819822a0ce9c4d5b594b9cb5b` |

---

## Objective

Establish one authoritative backend boot path without exposing unauthenticated business CRUD (STOP D / T0 R4) and without modifying protected intelligence.

---

## Authorized scope

| In | Out |
|---|---|
| `server.ts` → `createApp()` from `app.ts` | T2–T7, Phases 13–19 |
| `PORT` default 5000 | New auth platform |
| `GET /health`, `GET /ready` | Schema/migrations |
| Isolate T0 stub | Frontend redesign |
| Helmet CORP so Vite origin can read API | Mounting `apps/api` |
| Env flag for CRUD (default **false**) | IndexedDB / sync / AI / 3D / billing |

---

## Files changed

| File | Change |
|---|---|
| `apps/backend/src/server.ts` | Composition root: `createApp()`, listen `0.0.0.0`:`PORT`\|\|5000 |
| `apps/backend/src/app.ts` | `createApp()`; health/ready; business routers **lazy** and **opt-in** |
| `apps/backend/src/server.stub.ts` | Preserved T0 stub (not started by npm) |
| `apps/backend/.env.example` | `PORT=5000`, `MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES=false` |
| `.env.example` | same names |
| T1 docs | this report, runtime map, contract/gate updates |

## Files explicitly not changed

Protected: `patternEngine.ts`, `productionAssistant.ts`, `DesignStudio.tsx`, `shared/types/index.ts`, `productionStageService.ts`.

Also not changed: `apps/api`, frontend components, Vite config, `proxy-server.js`, migrations, empty backend auth files.

---

## Runtime changes

**FACT / IMPLEMENTED / VERIFIED**

- `npm run dev:backend` → `tsx watch src/server.ts` → `createApp()` → `:5000`
- `GET /health` → `200` `{ status: ok, runtime: apps/backend/src/app.ts, businessRoutesMounted: false }`
- `GET /ready` → `200` `{ ready: true, database: not-verified }`
- `GET /customers`, `/orders`, `/dashboard/summary` → **404** (stub JSON removed; CRUD not mounted)

**DEFERRED:** mounting business routers requires `MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES=true` **and** an Owner auth decision before public exposure.

---

## Configuration

| Name | Role |
|---|---|
| `PORT` | Listen port, default 5000 |
| `MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES` | `true` mounts existing `app.ts` CRUD. Default unset/false |
| `VITE_API_BASE_URL` | Frontend still defaults to `http://localhost:5000` |
| `DATABASE_URL` | Not required for default boot (routes not imported) |

---

## Routes (after T1)

| Path | Status |
|---|---|
| GET `/`, `/health`, `/ready` | **ACTIVE / MOUNTED** |
| Former stub JSON paths | **RETIRED** from live process (`server.stub.ts` only) |
| `app.ts` CRUD routers | **UNMOUNTED** (opt-in flag) |
| `apps/api` | **UNMOUNTED** |

---

## Database runtime

Unchanged: not product SoT. Default process does not connect. `/ready` does **not** fake DB.

---

## Protected asset verification

SHA-256 **unchanged** vs T0 registry (before and after implementation).

---

## Tests

| Command | Result | Class |
|---|---|---|
| `curl GET /health` | 200, app.ts runtime | VERIFIED |
| `curl GET /ready` | 200, database not-verified | VERIFIED |
| `curl GET /customers` | 404 | VERIFIED (boundary preserved) |
| `npm --workspace=apps/backend test` | 8 failed, 0 tests | **PRE-EXISTING** empty suites — not a T1 regression |
| Root `npm test` | no script | PRE-EXISTING U4 |
| Frontend e2e | none | NOT RUN / absent |

---

## Known limitations

- HTTP screens (Customers, Invoices, Production Board, Dashboard API widgets) no longer receive stub JSON; they 404 until CRUD is authorized.
- Studio/ops localStorage screens unchanged.
- Docker EXPOSE 3000 vs listen 5000 still drifted (documented, not a second runtime).
- Jest suites remain empty stubs.

---

## Rollback

Restore `server.ts` from git parent; delete `server.stub.ts` if desired. Or run `server.stub.ts` only as a last resort — that would restore fake authority and violate ADR-009.

---

## T2+ work

**NOT STARTED.**
