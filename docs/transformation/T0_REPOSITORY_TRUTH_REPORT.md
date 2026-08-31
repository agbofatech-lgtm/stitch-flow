# T0.1 — REPOSITORY TRUTH REPORT

**Stage:** T0 — Architectural Truth Lock  
**Date:** 2026-08-31  
**Branch:** `arena/01a05677-stitch-flow`  
**Base commit:** `b576c3e6f5a4d7aac08ef75de47cf6235a2ed619` (`Initial Stitch Flow project`)  
**Mode:** Investigation only  
**Evidence class legend:** FACT = verified in repository · INFERENCE = interpretation · PROPOSAL = future recommendation · UNKNOWN = not proven

This report answers T0 exit questions:

1. What exists?
2. What runs?
3. What owns data?
4. What must not break?
5. What remains uncertain?

A longer forensic narrative also exists at `docs/STITCHFLOW_FORENSIC_ARCHITECTURE_AUDIT.md`. That document is supporting evidence. **This T0 pack is the transformation lock.**

---

## 1. GIT STATE (FACT)

| Item | Value |
|---|---|
| Remote | `https://github.com/agbofatech-lgtm/stitch-flow.git` |
| Default / origin/main | `b576c3e` |
| Session branch | `arena/01a05677-stitch-flow` at same commit |
| Commits on branch | 1 |
| Tags | **none** |
| Tracked files | 331 |
| Tested in this T0 lock | File inspection. Runtime processes were **not** started. Automated tests were **not** executed. |

---

## 2. WHAT EXISTS (FACT)

npm workspaces (root `package.json`):

- `apps/backend`
- `apps/web`

Also present, **not** workspace members:

- `apps/api` — Express fragments, **no `package.json`**
- `apps/mobile` — Capacitor 8 Android wrapper

No `packages/` shared domain library.

Root also contains: `proxy-server.js`, `capacitor.config.ts`, `docker/`, `docs/`, `.github/workflows/ci-cd.yml`, `MOBILE_SETUP.md` (legacy TailorPro).

Corrupted / debris files (FACT):

- `apps/backend/$3`, `apps/backend/-`, `apps/backend/{` — truncated snippets
- `apps/web/src/types.ts` — contains a copy of `main.tsx`, not types
- `apps/web/src/shared/api/materials.ts` — truncated/broken TypeScript
- Many `apps/backend/src/**` auth/sync files are **0 bytes**
- Nested empty migrations at `apps/backend/migrations/*.sql` vs real SQL at `apps/backend/migrations/migrations/*.sql`

---

## 3. WHAT RUNS (FACT)

### Frontend start command

```
npm run dev:web
→ npm --workspace=apps/web run dev
→ vite
```

Vite config: host `0.0.0.0`, port **5173**. No React Router. Views switch via `AppContext.currentView`.

### Backend start command

```
npm run dev:backend
→ npm --workspace=apps/backend run dev
→ tsx watch src/server.ts
```

**Authoritative running backend under current scripts is `apps/backend/src/server.ts`.**

That file:

- Listens on **hardcoded port 5000** (`0.0.0.0`)
- Does **not** import `app.ts`
- Does **not** connect to PostgreSQL
- Returns hardcoded JSON for a few GET routes
- CORS allowlist includes `http://192.168.100.4:5173`

### Backend that exists but does not start

`apps/backend/src/app.ts` mounts real CRUD routers (`/customers`, `/orders`, `/invoices`, `/payments`, `/materials`, `/reports`, `/settings`, `/dashboard`, `/health`). It is **not** the `dev`/`start` entry.

### Third backend that does not start

`apps/api` mounts auth/license/event/sync/admin/health. No server composition root, not in workspaces.

### Mobile

Capacitor wraps `apps/web` dist. Two configs disagree (root vs `apps/mobile`). Web API clients default to `http://localhost:5000`.

### Production

INFERENCE: CI deploys via Render hook (`RENDER_DEPLOY_HOOK_URL`). README describes Render + Postgres + Redis. UNKNOWN: what Render actually starts (`server.ts` vs something else). FACT: `apps/backend` `start` = `node dist/server.js` which compiles **server.ts**, not `app.ts`.

### Proxy

`proxy-server.js` serves `apps/web/dist` on **5174** and proxies `/api` → `:5000`. **Not referenced by npm scripts.** Frontend fetch does **not** prefix `/api`.

---

## 4. ENVIRONMENT VARIABLES THAT CONTROL API LOCATION (FACT)

| Variable | Consumer | Default |
|---|---|---|
| `VITE_API_BASE_URL` | `apps/web/src/shared/utils/api.ts` | `http://localhost:5000` |
| `VITE_API_URL` | `shared/api/materials.ts`, `shared/api/reports.ts` | `http://localhost:5000` |
| `PORT` | `apps/backend/src/config/env.ts` default 3000 | **Ignored by live `server.ts` (5000)** |
| `DATABASE_URL` | `config/db.ts` via `env.ts` | Required if `env.ts` loads; live server.ts does not load it |
| `CORS_ORIGIN` | env.ts | Ignored by live server.ts |
| `REDIS_URL` | env.ts | Unused by live server.ts |

Neither Vite variable appears in `.env.example`.

---

## 5. WHAT OWNS DATA (SUMMARY)

See `docs/architecture/DATA_AUTHORITY_MAP.md`.

FACT: There is **no single data authority**.

- Design Studio, Orders (Orders.tsx), Materials, Reports, measurement profiles → **browser localStorage** via `AppContext` / `shared/lib/db.ts`
- Customers, Invoices, Production Board, Dashboard summaries → **HTTP to :5000 stub**
- Settings → mixed
- PostgreSQL schema for auth/licenses exists in nested migrations; business tables are incomplete and `initDb()` is never called
- IndexedDB: absent
- Service worker: absent
- Sync tables exist; sync is not in the running runtime or UI

---

## 6. WHAT MUST NOT BREAK (PROTECTED)

See `docs/architecture/PROTECTED_ASSET_REGISTRY.md`.

Minimum freeze list:

- `apps/web/src/modules/services/patternEngine.ts`
- `apps/web/src/modules/services/productionAssistant.ts`
- `apps/web/src/components/DesignStudio.tsx` (extraction later, not rewrite now)
- Measurement field vocabulary in `apps/web/src/shared/types/index.ts`
- `apps/backend/src/services/productionStageService.ts` (unmounted, still domain-valuable)

T0 did not modify these files.

---

## 7. DOMAIN INTELLIGENCE LOCATION (SUMMARY)

See `docs/architecture/DOMAIN_INTELLIGENCE_MAP.md`.

| Intelligence | Location | Layer |
|---|---|---|
| Pattern geometry | `patternEngine.ts` | Domain trapped in web app |
| Production plans, fabric estimate, cutting, sewing, fit | `productionAssistant.ts` | Domain trapped in web app |
| Design canvas / garment silhouettes | inside `DesignStudio.tsx` | Experience + domain mixed |
| Measurement merge / aliases | `AppContext.tsx` + DesignStudio | Mixed |
| Production stage transitions | `productionStageService.ts` | Backend domain, unmounted |
| Tier entitlements | `tierEnforcement.ts` + `config/tiers.ts` (conflicting prices) | Application policy, simulated |
| Auth/license/sync | `apps/api` + dead copies in web/backend | Orphan |

---

## 8. TEST BASELINE (FACT)

| Suite | Location | Status |
|---|---|---|
| Frontend unit/e2e | none found | **No tests** |
| Backend Jest | `apps/backend/tests/*.js` are 14-byte `"use strict";` stubs; `*.ts` counterparts are 0 bytes | **Not a real suite. Not executed in T0** |
| Root `npm test` | **no script** in root `package.json` | CI step `npm test` is **not defined** |
| CI | `.github/workflows/ci-cd.yml` runs `npm install`, `npm run build`, `npm test` | Build may work; test step **BROKEN at root** |
| Domain regression harness for Pattern Engine | **absent** | Cannot certify deterministic trust yet |

T0 cannot claim a reproducible behavioral baseline beyond “source exists.”

---

## 9. ARCHITECTURE DOCUMENTATION BASELINE (FACT)

| Doc | Status |
|---|---|
| `README.md` | Backend local setup; describes migrations that are empty at the documented path |
| `docs/api.md` | Auth/sync `/api/v1` contract — **no running server mounts `/api/v1`** |
| `MOBILE_SETUP.md` | TailorPro / Flutter / Windows paths — **legacy, product-name drift** |
| `apps/backend/README.md` | empty |
| This T0 pack | created 2026-08-31 |

---

## 10. CRITICAL UNKNOWNS (EXPLICIT)

| ID | Unknown | Why it matters |
|---|---|---|
| U1 | What Render production actually executes | May be stub `server.ts` in production |
| U2 | Whether any deployed Postgres has ad-hoc tables not in repo migrations | Schema in the wild may exceed repo |
| U3 | Whether `apps/web/src/types.ts` corruption currently breaks `tsc` (DesignStudio imports `../types`) | Typecheck baseline unproven |
| U4 | Whether Jest JS tests pass if run in `apps/backend` | Test baseline unproven |
| U5 | Whether Capacitor packaging uses root or `apps/mobile` config | Wrong app id / scheme possible |
| U6 | Real user data, if any, living only in browsers | Cannot migrate without export |
| U7 | Intended commercial tier names (`BASIC/PRO/STUDIO` vs `free/pro/enterprise`) and prices (USD vs GHS) | Policy not locked |

These unknowns **do not** prevent T0 exit. They **do** prevent claiming T1 complete until investigated.

---

## 11. T0 FORBIDDEN WORK COMPLIANCE

T0 did **not**:

- Redesign screens
- Refactor Pattern Engine
- Rewrite Design Studio
- Replace backend architecture
- Introduce AI or 3D
- Add billing
- Migrate databases
- Delete legacy code

Only documentation was added under `docs/`.

---

## 12. T0 ANSWERS (LOCKED)

**What exists?** A React 18 Vite SPA with in-process tailoring engines and localStorage; an Express stub that npm starts; an unmounted Express CRUD app; an unpackaged auth/sync fragment; Capacitor wrapper; incomplete Postgres migrations.

**What runs?** `vite :5173` and `tsx watch src/server.ts :5000` under documented npm scripts. `app.ts` and `apps/api` do not run via those scripts.

**What owns data?** Split. Studio/ops domain data: browser. CRM/finance screens: HTTP stub. Database: not authoritative for product workflows today.

**What must not break?** Pattern Engine, Production Assistant, Design Studio behavior, measurement vocabulary, production stage rules.

**What remains uncertain?** Production host process, live DB contents, typecheck/test execution, mobile packaging identity, commercial policy.

---

## 13. CLASSIFICATION DISCIPLINE

FACT: multiple backends exist; npm starts the stub.  
INFERENCE: the stub was introduced to unblock a LAN/mobile demo.  
PROPOSAL (not T0 work): T1 must make `app.ts` (or equivalent) the single composition root and stop serving stub JSON as authority.

---

**T0.1 complete.**
