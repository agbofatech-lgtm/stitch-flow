# T1 Runtime Forensic Report

| Field | Value |
|---|---|
| Stage | T1.1–T1.6 — investigation only |
| Date | 2026-08-31 |
| Implementation | **NOT STARTED** |
| Method | File inspection. Processes were **not** spawned in this forensic pass. |

Classification: **FACT** · **INFERENCE** · **PROPOSAL** · **UNKNOWN**

This report does not rewrite T0. New evidence is additive.

---

## 1. Entry Baseline

| Item | Value | Class |
|---|---|---|
| Branch | `arena/01a05677-stitch-flow` | FACT |
| HEAD | `ce3d45bdb057296819822a0ce9c4d5b594b9cb5b` | FACT |
| Tag `transformation-t0-baseline-accepted` | points at HEAD | FACT |
| Application code baseline | `b576c3e6f5a4d7aac08ef75de47cf6235a2ed619` | FACT |
| Working tree at T1.0 | clean | FACT |
| Protected SHA-256 | match T0 registry §9 | FACT |

T1-STOP-01: **not triggered**.

---

## 2. Current Runtime Architecture

```
npm run dev:web     → Vite :5173 → React (main.tsx → App.tsx)
                         fetch(VITE_API_BASE_URL || http://localhost:5000)
                         no Vite proxy

npm run dev:backend → tsx watch src/server.ts → Express stub :5000
                         hardcoded JSON, no DB, no app.ts

npm start (backend) → node dist/server.js → same stub (tsc compiles server.ts)

Docker CMD           → node dist/server.js : EXPOSE 3000  (port mismatch vs listen 5000)

NOT STARTED
  apps/backend/src/app.ts     Express CRUD + pg query()
  apps/api                    router fragments, no listen, no package.json
  proxy-server.js             :5174 static dist + /api → :5000
  docker compose api          build ., ports 3000
```

**CURRENT AUTHORITATIVE RUNTIME (what npm actually starts):** stub `apps/backend/src/server.ts`. FACT (T0 locked; reconfirmed).

---

## 3. Backend Candidate Inventory

| Candidate | Starts? | Used by Web? | Routes | Database | Auth | Status |
|---|---|---|---|---|---|---|
| `apps/backend/src/server.ts` | **Yes** via `dev`/`start`/Docker CMD | Yes — web defaults to `:5000` | 8 GET stubs | none | none | **CURRENT script authority / STUB** |
| `apps/backend/src/app.ts` | **No script** imports it. **No `listen`** | Partial — path families match many clients | Real CRUD routers | `query()` / `DATABASE_URL` | none | **UNMOUNTED implementation** |
| `apps/api` | **No** `package.json`, no listen, not a workspace | No | Auth/license/sync/admin/health *intended* | intended pg | JWT intended | **ORPHAN / unbuildable as packaged app** |
| `proxy-server.js` | Only if `node proxy-server.js` | Web does **not** prefix `/api` | static + strip `/api` → 5000 | no | no | **UNUSED by npm scripts** |
| Docker compose `api` | not npm | n/a | would run `dist/server.js` | compose postgres/redis | no | **UNUSED by npm; would still be stub** |

### `server.ts` (FACT)

- Hardcoded `PORT = 5000`, bind `0.0.0.0`
- CORS allowlist includes LAN `http://192.168.100.4:5173`
- Does **not** import `./app` or `env.ts`
- GET `/` text; GET dashboard/orders/invoices/customers/settings stubs
- No POST/PUT/DELETE, no `/health`

### `app.ts` (FACT)

- Exports `app`; mounts `/dashboard`, `/customers`, `/orders`, `/invoices`, `/payments`, `/materials`, `/reports`, `/settings`
- GET `/` JSON message; GET `/health` `{ status: 'ok' }`
- CORS `origin: true`; helmet; JSON body
- SQL in route files via `../config/db`
- **No auth middleware**
- Loading `db.ts` requires `DATABASE_URL` (throws if missing) — so **composing app.ts without env will fail at import of any route that imports db**

### `apps/api` (FACT)

- Files have content (not 0-byte)
- Router: `/auth`, `/licenses`, `/events`, `/feature-requests`, `/sync`, `/admin`, `/health`
- Imports aliases `@modules`, `@shared` with **no package** to resolve them
- Duplicate empty shells of the same names exist as **0-byte** files under `apps/backend/src/{controllers,routes,services,...}` (54 empty files)
- `docs/api.md` describes `/api/v1/*` matching this fragment — **neither live server nor app.ts mounts `/api/v1`**

---

## 4. Frontend-to-Backend Chain

| Item | FACT |
|---|---|
| Framework | React 18 + Vite 7 |
| Entrypoint | `apps/web/src/main.tsx` |
| Dev | `npm run dev:web` → `vite` host `0.0.0.0` port **5173** |
| Build | `vite build` |
| Router | none (`currentView`) |
| Primary API | `VITE_API_BASE_URL` \|\| `http://localhost:5000` (`shared/utils/api.ts`) |
| Secondary API | `VITE_API_URL` \|\| `http://localhost:5000` (`materials.ts`, `reports.ts`) |
| Vite proxy | **absent** |
| `/api` prefix | **not used** by fetch helpers |
| Auth header | **none** |
| Health UI | `ApiHealthCheck` calls GET `/health` — **component unused** |

Screens that hit HTTP: Customers, Invoices, Production Board, Dashboard summaries, Settings.  
Screens that stay localStorage: Design Studio, Orders.tsx, Materials, Reports (mostly).

---

## 5. Database Runtime Findings

| Layer | Finding | Class |
|---|---|---|
| Technology referenced | PostgreSQL (`pg`, `DATABASE_URL`), Redis (`REDIS_URL`, BullMQ unused by live server) | FACT |
| Initialization | `initDb()` **zero callers** | FACT |
| Migrations | Nested SQL has content; top-level `002–005` empty; `package.json` `migrate` → `scripts/run-migrations.js` **file missing** | FACT |
| Connectivity | Live `server.ts` never connects | FACT |
| Schema vs app.ts | Routes need `invoices`, `invoice_items`, `fabric_records`, `orders`, stages FK, etc. Incomplete vs nested migrations | FACT |
| Product authority | **Not** PostgreSQL. Split localStorage vs HTTP stub | FACT (T0) |

T1 does **not** promote Postgres to product SoT. If new evidence appears later, document it; do not silently rewrite T0.

---

## 6. API Route Inventory

### A. Live stub `server.ts` — STUB / ACTIVE (process)

| Method | Path | Status |
|---|---|---|
| GET | `/` | STUB ACTIVE |
| GET | `/dashboard/summary` | STUB ACTIVE (hardcoded) |
| GET | `/dashboard/payments-analytics` | STUB ACTIVE |
| GET | `/orders` | STUB ACTIVE (shape ≠ app.ts Order) |
| GET | `/invoices` | STUB ACTIVE |
| GET | `/customers` | STUB ACTIVE `[]` |
| GET | `/settings` | STUB ACTIVE |
| GET | `/settings/workspace-members` | STUB ACTIVE `[]` |

### B. Unmounted `app.ts` routers — UNMOUNTED

| Method | Path | DB | Frontend caller | Notes |
|---|---|---|---|---|
| GET | `/health` | no | unused `ApiHealthCheck` | liveness only |
| GET | `/dashboard/summary` | yes | Dashboard | DUPLICATE path vs stub |
| GET | `/dashboard/payments-analytics` | yes | Dashboard | |
| GET/POST/PUT | `/customers`, PUT `/:id`, GET `/:id/orders` | yes | Customers | no DELETE (web `Customers.ts` has DELETE) |
| GET/POST/PUT | `/orders`, GET `/:id` | yes | Production Board GET list | |
| GET/POST | `/orders/:orderId/production-stages...` | yes | Production Board **matches** | web helper `productionStages.ts` uses **`/stages`** — DUPLICATE/BROKEN vs this |
| PATCH | `/orders/:id/studio-session` | yes | **no caller found** | |
| GET/POST/PUT | `/invoices` | yes + `invoice_items` | Invoices | no GET `/:id` (web has it); no DELETE |
| GET/POST | `/payments`, GET `/payments/invoice/:invoiceId` | yes | web uses `/invoices/:id/payments` — **BROKEN path** |
| CRUD | `/materials/fabrics`, usages | yes | `materials.ts` **syntax-broken** and unused by Materials.tsx | |
| GET | `/reports/*` | yes | `reports.ts` unused by Reports screen | |
| GET/PUT | `/settings`, members CRUD | yes | Settings | |

### C. `apps/api` — UNMOUNTED / ORPHAN

Auth register/login/refresh; licenses; events; feature-requests; sync push/pull; admin; health. Intended `/api/v1` in docs only.

### D. Classification summary

ACTIVE (running): stub GETs only.  
STUB: those GETs.  
UNMOUNTED: entire `app.ts` surface + `apps/api`.  
DUPLICATE: dashboard/orders/customers/settings paths on stub **and** app.ts.  
BROKEN: `/stages` vs `/production-stages`; `/invoices/:id/payments` vs `/payments`; `materials.ts` truncated fetch URLs; missing migrate script.

---

## 7. Authentication Boundary

| Surface | Auth |
|---|---|
| Live stub | none |
| `app.ts` | none (R4 if publicly mounted) |
| `apps/api` | JWT middleware **in source**, not running |
| Web | no Authorization header |

T1 must **not** invent a new identity system (T1-STOP-09). Document only. Mounting `app.ts` on a public host without an auth decision remains **forbidden by T0 conditions**.

---

## 8. Environment Configuration

**Names only** (no secret values):

Backend examples: `NODE_ENV`, `PORT` (example 3000), `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `ACCESS_TOKEN_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`, `CORS_ORIGIN`, `MAX_PAYLOAD_SIZE`, `BCRYPT_ROUNDS`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `FREE_DEVICE_LIMIT`, `PRO_DEVICE_LIMIT`, `ENTERPRISE_DEVICE_LIMIT`, `REDIS_URL`, `RENDER_EXTERNAL_URL`.

Frontend (not in `.env.example`): `VITE_API_BASE_URL`, `VITE_API_URL`.

| Conflict | FACT |
|---|---|
| Live listen | 5000 hardcoded |
| `env.ts` default PORT | 3000 |
| Docker EXPOSE | 3000 |
| Frontend default | 5000 |
| CI | `npm test` at root **undefined**; postgres service unused by live server |

---

## 9. Runtime Risks

| ID | Risk | Class |
|---|---|---|
| T1-R1 | Replacing stub with `app.ts` without `DATABASE_URL` fails at import/query | FACT |
| T1-R2 | Schema cannot support all `app.ts` SQL (R3) | FACT |
| T1-R3 | Public unauthenticated CRUD (R4) | FACT |
| T1-R4 | Docker/CI still start stub `dist/server.js` | FACT |
| T1-R5 | Dual env names for API URL | FACT |
| T1-R6 | Empty backend files look like auth exists | FACT |
| T1-R7 | `apps/api` aliases unresolvable | FACT |
| T1-R8 | Port 5000 vs 3000 split | FACT |
| T1-R9 | ProductionStageService would become reachable if `app.ts` mounted — protected, do not rewrite | FACT |

---

## 10. Duplicate / Dead Runtime Paths

| Path | Disposition (PROPOSAL, not executed) |
|---|---|
| `server.ts` stub handlers | Isolate; become composition root that listens on `app` |
| `app.ts` | **Preserve** — candidate authoritative application object |
| `apps/api` | **Preserve, isolate, defer** (auth/sync later) |
| 54 empty backend files | Do not delete in T1 unless proven unused and owner-approved; they are dead |
| `proxy-server.js` | Document unused; do not delete in T1 |
| Docker CMD | Must follow new composition root when implementation is authorized |

---

## 11. Protected Asset Dependencies

| Asset | T1 coupling | Action |
|---|---|---|
| Pattern Engine | none in backend | Do not touch |
| Production Assistant | none in backend | Do not touch |
| Design Studio | none in backend | Do not touch |
| Measurement types | frontend only | Do not touch |
| `productionStageService.ts` | imported by **unmounted** `orderRoutes.ts` | If `app.ts` is composed, service **runs as-is**. Do not rewrite |

Hashes at T1.0 match T0.

---

## 12. Recommended Authoritative Runtime

**PROPOSAL (not implemented):**

1. **Authoritative application object:** `apps/backend/src/app.ts` (`export const app`).
2. **Authoritative entrypoint:** `apps/backend/src/server.ts` must **only** load env, import `app`, listen. Official commands stay `npm run dev:backend` / `npm start`.
3. **Do not** make `apps/api` the product runtime in T1.
4. **Do not** keep stub JSON as authority once composed (ADR-009).
5. **Port:** `PORT` from environment; default **5000** to match existing web clients (smallest frontend change). Document Docker EXPOSE drift.
6. **Database:** optional infrastructure. Not product SoT. `/ready` must not fake DB.
7. **Auth:** none added in T1 unless a later owner decision. Local/dev composition only under T0 condition R4.

Evidence basis: `app.ts` is the only candidate with real route implementations matching the web’s path family; stub is what starts; `apps/api` cannot boot.

---

## 13. Migration Risks (if later authorized)

- Importing `app.ts` pulls `db.ts` → requires `DATABASE_URL` even for `/health` if routes are imported at top level. FACT: `app.ts` imports all routers at load.
- Frontend GET `/orders` stub shape vs app.ts Order rows — Dashboard/Production Board may break (better failure than fake data — still a UX risk).
- Incomplete schema → 500s.
- CORS LAN IP leftover.

---

## 14. Unknowns

| ID | Unknown |
|---|---|
| U1 | What Render actually starts (CI only curls deploy hook) |
| U3/U4 | `tsc` / Jest outcomes (not executed this pass) |
| T1-U1 | Whether `app.ts` import succeeds without Postgres running |
| T1-U2 | Whether `invoice_items` / `fabric_records` exist in any live DB |

---

## 15. Fact / Inference / Proposal

| Kind | Examples |
|---|---|
| FACT | npm starts `server.ts`; `app.ts` unmounted; 54 empty files; missing migrate script; path drifts |
| INFERENCE | stub exists to unblock LAN demo (T0 inference, not re-proven) |
| PROPOSAL | compose `server.ts` → `app.ts`; PORT default 5000; isolate `apps/api` |

---

## 16. T1 Implementation Scope (awaiting Owner)

**In scope after `AUTHORIZE T1 IMPLEMENTATION` only:**

- Composition root: `server.ts` listens on `app`
- Env PORT / CORS documentation; stop hardcoding 5000 in the stub body
- GET `/health` (exists on app) + GET `/ready` (process, not fake DB)
- Startup docs
- Frontend env **only if** required to hit the official port
- Isolate stub handlers (do not delete `app.ts` routes; do not delete `apps/api`)

**Out of scope:** IndexedDB, sync, domain extraction, Studio UI, AI, 3D, billing, Control Center, new auth architecture, schema rewrite, deleting protected files.

---

**T1 Stage 0/Forensics: COMPLETE**  
**T1 Implementation: NOT STARTED**  
**Owner Authorization Required: YES**
