# STITCHFLOW
# PRE-REBUILD FORENSIC ARCHITECTURE AUDIT
# FRONTEND × BACKEND × DOMAIN ENGINE ALIGNMENT

**STATUS:** COMPLETE  
**MODE:** INVESTIGATION ONLY — no implementation, no refactor, no deletion  
**DATE:** 2026-08-31  
**BRANCH:** `arena/01a05677-stitch-flow`  
**SOURCE OF TRUTH:** repository contents as inspected  
**CONFIDENCE RULE:** code existence ≠ working feature  

**FINAL DECISION: OPTION B — CONDITIONAL GO**

---

# SECTION A — EXECUTIVE SUMMARY

## Direct answers

| # | Question | Answer |
|---|---|---|
| 1 | Is the current frontend architecture trustworthy? | **No as a system.** Individual screens exist and some domain engines are real. The app is a dual-architecture hybrid: localStorage studio/ops vs partial REST wiring. Routing is not URL-based. Auth UI does not exist. |
| 2 | Is the backend architecture trustworthy? | **No as a running system.** Two backends exist. The **wired entrypoint** (`apps/backend/src/server.ts`) is a hardcoded stub on port 5000. The **real CRUD Express app** (`apps/backend/src/app.ts`) is **not started** by `package.json`. Auth/sync lives in a third, unpackaged tree (`apps/api`). |
| 3 | Are frontend and backend aligned? | **No.** Path mismatches, payload mismatches, env-var mismatches, and whole modules that never call the API. |
| 4 | Is the database model coherent? | **No.** License/auth tables exist in SQL migrations. Business tables (`customers`, `orders`, …) exist only as runtime `initDb()` SQL that is **never called**. Production-stage migration references `orders(id)` which is not created by core migrations. |
| 5 | Is offline-first real or aspirational? | **Aspirational.** No service worker. No IndexedDB. Sync code exists as dead/orphaned backend-style modules inside the web app. Accidental offline exists only for localStorage-backed modules. |
| 6 | Strongest systems | Pattern Engine (frontend, deterministic, cm). Production Assistant (frontend, heuristic). Design Studio canvas + measurement profile UX (frontend). Production stage **service** (backend, unmounted). Tier gating (frontend, simulated). |
| 7 | Dangerous systems | Dual sources of truth. Live stub API. Corrupted `materials.ts`. Empty backend auth/sync files. `apps/web/src/types.ts` overwritten with `main.tsx` content. LAN IP CORS. Timestamp IDs. No auth on business APIs. |
| 8 | Must not be touched initially | `patternEngine.ts`, `productionAssistant.ts`, Design Studio measurement/pattern/canvas math, `productionStageService.ts`, measurement type contracts in `shared/types/index.ts`. |
| 9 | Can be safely rebuilt | Experience layer: Layout, Dashboard chrome, navigation, visual design, splash, branding. View switching. Most presentational UI. |
| 10 | Must be repaired before frontend↔backend integration | Choose one backend entrypoint. Mount real routes. Complete schema. Align API paths and payloads. Separate local vs remote state. Restore auth or explicitly remain local-first. Fix corrupted client files. |

## One-paragraph truth

StitchFlow today is **not** a single production system. It is **three overlapping systems**: (1) a local-first React studio that persists business and design data in `localStorage`; (2) an unfinished PostgreSQL Express CRUD API that is not the process that actually starts; (3) an unfinished auth/license/sync platform API that is not packaged and whose files inside `apps/backend` are empty. The new StitchFlow Studio frontend can begin as an experience rebuild **only if** it consumes the existing frontend domain engines and treats backend integration as a later, gated phase.

---

# SECTION B — SYSTEM MAP

## Intended (documented / implied)

```
USER
  ↓
FRONTEND (React)
  ↓
STATE
  ↓
API CLIENT
  ↓
APPLICATION SERVICES
  ↓
DOMAIN ENGINE
  ↓
DATABASE
```

## Actual (verified)

```
USER
  ↓
React SPA (no router; AppContext.currentView)
  ├─ EXPERIENCE: Layout, Splash, screens
  ├─ DOMAIN (IN UI):
  │    patternEngine.ts
  │    productionAssistant.ts
  │    garment canvas builders inside DesignStudio.tsx
  │    measurement merge/normalize in AppContext
  │    tierEnforcement.ts (simulated)
  ├─ SOURCE OF TRUTH A (primary for studio/orders/materials/reports):
  │    React state → localStorage (stitchflow:* keys)
  │    seed from mockData.ts
  └─ SOURCE OF TRUTH B (partial, competing):
       fetch → http://localhost:5000  (VITE_API_BASE_URL or VITE_API_URL)
         ↓
       apps/backend/src/server.ts   ← ACTUALLY STARTED (stub JSON)
         ╳
       apps/backend/src/app.ts      ← NOT STARTED (real CRUD, no auth)
         ╳
       apps/api/*                   ← NOT PACKAGED, NO SERVER ENTRY
         ╳
       PostgreSQL schema            ← SPLIT / INCOMPLETE
         ╳
       initDb()                     ← NEVER CALLED
```

### Deviations

1. Domain engines live in the **experience app**, not in backend.
2. Two API base env names: `VITE_API_BASE_URL` vs `VITE_API_URL`.
3. `app.ts` CORS is `origin: true`. `server.ts` CORS allowlist includes LAN IP `http://192.168.100.4:5173`.
4. Auth/license/sync documented under `/api/v1/...` — no running server mounts `/api/v1`.
5. Frontend `modules/repositories/*` import `query` from `../config/db` — that path **does not exist in the web app**. These are backend leftovers copied into `apps/web`.

---

# 1. COMPLETE REPOSITORY MAP

## Actual tree (not assumed)

```
/
├── apps/
│   ├── api/                  # orphaned auth/license/sync Express fragments; no package.json, no server
│   ├── backend/              # npm workspace; two entry files; many EMPTY auth/sync files; some real CRUD
│   ├── mobile/               # Capacitor 8 wrapper; android project present; no custom app code
│   └── web/                  # Vite + React 18 SPA (the product UI)
├── docker/                   # compose + backend Dockerfile (port 3000)
├── docs/                     # api.md (auth/sync v1 docs) + this audit
├── .github/workflows/ci-cd.yml
├── capacitor.config.ts       # root Capacitor config (Tailor Studio / mixed content)
├── package.json              # workspaces: apps/backend, apps/web
├── proxy-server.js           # static dist + /api → :5000 on :5174
├── MOBILE_SETUP.md           # TailorPro legacy guide, Windows paths
├── README.md                 # backend setup only
├── tailwind.config.js        # root leftover
└── tsconfig.json             # root leftover
```

Weird / corrupted artifacts in `apps/backend/`: files named `$3`, `-`, `{` containing truncated JS snippets. Treat as accidental shell-redirect debris. **DEAD_CODE / BROKEN.**

## Directory roles

| Directory | Purpose | Technology | Dependencies | Execution role | Risk |
|---|---|---|---|---|---|
| `apps/web` | Product UI + domain engines + local persistence | React 18, Vite 7, TS, Tailwind 3 | lucide, framer-motion, jspdf, dnd-kit, zod 4, uuid | `npm run dev:web` → :5173 | HIGH — dual state, huge components |
| `apps/backend` | Intended API | Express 4, pg, bullmq, jwt, zod 3 | postgres, redis (declared, unused by live entry) | `npm run dev:backend` → **server.ts :5000 stub** | CRITICAL |
| `apps/api` | Auth/license/sync/admin fragments | Express-style TS | none packaged | **never executed** | HIGH — duplicate/orphan |
| `apps/mobile` | Native shell | Capacitor 8 Android | web dist | packaging only | MEDIUM |
| `docker/` | Compose for api:3000 + postgres + redis | Docker | .env.example | unused by current npm scripts | MEDIUM |
| `docs/` | Partial API docs | Markdown | — | documentation drift | MEDIUM |
| root proxy | Serve built web + proxy `/api` | Express 5 + http-proxy-middleware | dist | **not used by Vite dev** | LOW |

## Application inventory

| Application | Location | Technology | Purpose | Status |
|---|---|---|---|---|
| Web SPA | `apps/web` | React 18 + Vite 7 + TS | Tailoring studio + ops UI | IMPLEMENTED_UNVERIFIED (runs as UI; mixed data sources) |
| Backend (live) | `apps/backend/src/server.ts` | Express, no DB | Stub JSON for a few GETs | PLACEHOLDER |
| Backend (unmounted) | `apps/backend/src/app.ts` + routes | Express + pg | Customers/orders/invoices/payments/materials/reports/settings | IMPLEMENTED_UNVERIFIED — **not the process that starts** |
| Auth/Sync API | `apps/api` | Express fragments | Auth, licenses, events, sync, admin | BACKEND_ONLY / PARTIALLY_IMPLEMENTED / not wired |
| Mobile wrapper | `apps/mobile` | Capacitor Android | Wrap web dist | PARTIALLY_IMPLEMENTED |
| Proxy | `proxy-server.js` | Express | Static + `/api` proxy | IMPLEMENTED_UNVERIFIED, unused in npm scripts |

No `packages/`, no shared domain package, no mobile React Native/Flutter app.

---

# 2. FRONTEND INVENTORY

## 6.1 FRONTEND TECHNOLOGY BASELINE

| Item | Evidence | Status |
|---|---|---|
| Framework | React `^18.2.0` | VERIFIED in package.json |
| Language | TypeScript `^5.6.2` | VERIFIED |
| Build | Vite `^7.3.1` + `@vitejs/plugin-react` | VERIFIED |
| Styling | Tailwind 3.4 + postcss + autoprefixer; also unused `@tailwindcss/vite` 4.x | DUPLICATED / RISK |
| Routing | **None.** `App.tsx` switch on `currentView` | VERIFIED |
| State | React Context (`AppContext.tsx` ~2000 lines) + per-screen `useState` | VERIFIED |
| Redux / Zustand / React Query | **Absent** | NOT IMPLEMENTED |
| Component library | None (custom + lucide-react) | VERIFIED |
| Animation | framer-motion listed; not a core architecture | IMPLEMENTED_UNVERIFIED |
| Canvas | Native `<canvas>` in DesignStudio | VERIFIED in source |
| Charts | Hand-rolled CSS bars in Dashboard | FRONTEND_ONLY |
| Forms | Hand-rolled | VERIFIED |
| Validation | zod in web package; **not used by screens**; duplicate schemas under `apps/web/src/schemas` (backend leftovers) | DEAD_CODE / DUPLICATED |
| DnD | `@dnd-kit/*` listed | UNKNOWN usage in product screens |
| PDF | jspdf + custom `invoicePdf.ts`, `jobCardPdf.ts`, `jobSheetExport.ts` | IMPLEMENTED_UNVERIFIED |
| PWA | `public/manifest.json` branded **TailorPro**; **no service worker** | PLACEHOLDER |

`apps/web/src/types.ts` is **not** a types module. It contains a copy of `main.tsx`. Real types live in `apps/web/src/shared/types/index.ts`. Components import `../types` which currently re-exports nothing useful — **BROKEN / CONTRACT_MISMATCH** if TS path resolution hits this file. DesignStudio imports `from '../types'` (the corrupted file). Vite/TS may still compile if `types` resolution is aliased; the file content is still corrupted. **CRITICAL.**

## 6.2 ROUTING AUDIT

There are **no URL routes**. Navigation is an in-memory view enum.

| View id | Component | Purpose | Auth | Backend dependency | Status |
|---|---|---|---|---|---|
| `dashboard` | `Dashboard.tsx` | Overview mixed local+API | No | GET `/dashboard/summary`, `/dashboard/payments-analytics`, `/orders`, `/invoices` + local fabrics | PARTIALLY_IMPLEMENTED / CONTRACT_MISMATCH |
| `customers` | `Customers.tsx` | CRUD customers from API only | No | GET/POST/PUT `/customers` | FRONTEND wired; live backend stub returns `[]` for GET only |
| `orders` | `Orders.tsx` | Orders from AppContext localStorage; stages also call API | No | Mixed: local CRUD + `/orders/:id/stages` (client) vs `/production-stages` (board) | CONTRACT_MISMATCH |
| `production-board` | `ProductionBoard.tsx` | Kanban from API orders | No | GET `/orders`, `/customers`; POST `/orders/:id/production-stages/...` | ENDPOINT_MISSING on live stub |
| `invoices` | `Invoices.tsx` | Invoices/payments from API | No | `/invoices`, `/invoices/:id/payments` | PATH MISMATCH vs backend `/payments` |
| `design-studio` | `DesignStudio.tsx` (~4075 lines) | Pattern/fabric/inspiration | No | **None** (AppContext + localStorage drafts) | IMPLEMENTED_UNVERIFIED (UI-local) |
| `materials` | `Materials.tsx` | Inventory from AppContext | No | **None** (local). Separate broken `shared/api/materials.ts` unused by this screen | FRONTEND_ONLY |
| `reports` | `Reports.tsx` | Reports from AppContext | No | `shared/api/reports.ts` exists but screen uses `useApp()` | FRONTEND_ONLY |
| `settings` | `Settings.tsx` | Branding, members, tier simulation | No | GET/PUT `/settings`, workspace-members **and** AppContext | MIXED |
| splash | `SplashScreen.tsx` | 1.8s timer | No | None | VERIFIED in App.tsx |

No login, register, license, or admin views.

**Orphaned / unused screens (PROBABLY_DEAD):**

- `CustomerDetail.tsx` — not imported by `App.tsx`
- `ApiHealthCheck.tsx` — not imported; also calls `/health` which **live `server.ts` does not implement** (`app.ts` does)
- `OrderCard.tsx` — not imported (Orders has inline cards)
- `OrderForm.tsx` — not imported (Orders has `OrderFormModal`)

**Placeholder branding:** PWA manifest still says TailorPro.

## 6.3 COMPONENT INVENTORY (major)

| Class | Location | Responsibility | Inputs | Outputs | State | API | localStorage | Coupling |
|---|---|---|---|---|---|---|---|---|
| APP SHELL | `Layout.tsx` | Nav + chrome | `currentView` | `setView` | Context | No | Indirect | Local |
| NAVIGATION | `Layout.tsx` | View switcher | enum | — | Context | No | No | Local |
| DASHBOARD | `Dashboard.tsx` | Metrics | API + context fabrics/customers | navigation | Mixed | Yes | Fabrics via context | HIGH mismatch |
| CUSTOMER MGMT | `Customers.tsx` | API CRUD | REST | REST | Local useState | Yes | No | Network required |
| MEASUREMENTS | AppContext + Customer profiles + DesignStudio | Profiles as `GarmentMeasurements` | UI | order snapshot | Context | No | Yes | Domain in UI |
| GARMENT DESIGN | DesignStudio | Category, canvas, fabric overlay | measurements, inspiration | order updates | Context + drafts | No | Yes | Domain in UI |
| DESIGN STUDIO | `DesignStudio.tsx` | Editor | order/customer/profiles | pattern + plan + snapshot | Heavy local | No | `stitchflow:design-studio:drafts` + app storage | Must preserve |
| PATTERN SYSTEM | `patternEngine.ts` | 2D drafts | cm measurements | points/guides | Pure functions | No | No | PRESERVE |
| PRODUCTION | `productionAssistant.ts` + ProductionBoard + Orders stages | Plans, stages | garment + measurements | plan / stage DTO | Mixed | Partial | Orders local | Split |
| ORDERS | `Orders.tsx` | Local CRUD | Context | Context | Context | Stages API optional | Yes | Dual |
| INVENTORY | `Materials.tsx` | Local fabrics/usages | Context | Context | Context | Broken client unused | Yes | Local |
| FINANCE | `Invoices.tsx` | API invoices | REST | REST | Local | Yes | No | Network |
| REPORTING | `Reports.tsx` | Local aggregates + `reporting.ts` | Context | UI | Context | Client unused | Yes | Local |
| SETTINGS | `Settings.tsx` | Profile/brand/members/tiers | Mixed | Mixed | Context + API | Partial | Workspace in context | Dual |
| AUTH | none in UI | — | — | — | — | — | — | ABSENT |
| MOBILE | Capacitor wrap | — | web | native webview | — | localhost URLs | localStorage | Fragile |
| SHARED UI | `EmptyState.tsx`, `FeatureGate.tsx` | — | — | — | — | — | — | FeatureGate uses simulated tier |

## 6.4 FRONTEND DATA FLOW — dual architecture VERIFIED

### Chain A — local-first (Orders, Design Studio, Materials, Reports, measurement profiles)

```
USER ACTION
  → Component
  → AppContext setState
  → useEffect saveAppStorage()
  → localStorage keys stitchflow:*
  → NO BACKEND
```

Evidence: `AppContext.tsx` persist effect; `shared/lib/db.ts`; `storageKeys.ts`.

### Chain B — network (Customers, Invoices, Production Board, Dashboard summaries)

```
USER ACTION
  → Component useEffect
  → shared/utils/api.ts fetch(API_BASE + path)
  → http://localhost:5000
  → server.ts stub OR (if someone ran app.ts) Postgres
```

Evidence: `Customers.tsx` `getCustomers()`; `Invoices.tsx` `fetchInvoices()`; `ProductionBoard.tsx` `fetchOrders()`.

### Chain C — mixed (Dashboard, Settings, Orders stages)

Dashboard: API summary/orders/invoices **plus** local `fabricRecords` / `customers` from AppContext. Customer names on API orders are looked up in **local** customers — they will not match.

Settings: `updateWorkspaceProfile` is local; also `updateSetting('workspace_profile')` to API.

Orders: create/update is local; production stage fetch/transition uses API helpers that **404/empty** against both stub and (path-wrong) real API.

**Dual architecture is still true. Not historical. Current.**

---

# 3. BACKEND INVENTORY

## 7.1 BACKEND ARCHITECTURE (actual)

### Process that starts

`apps/backend/package.json` → `"dev": "tsx watch src/server.ts"`

`server.ts`:

- Express on **PORT 5000 hardcoded** (`0.0.0.0`)
- CORS allowlist including localhost:5173/5174 and **LAN IP 192.168.100.4**
- No helmet, no JWT, no DB, no rate limit
- Hardcoded JSON for a handful of GETs

### Process that does not start

`app.ts`:

- CORS `origin: true`
- helmet, json limit
- mounts `/dashboard`, `/customers`, `/orders`, `/invoices`, `/payments`, `/materials`, `/reports`, `/settings`
- `/health` and `/`
- **No auth middleware**
- Uses `query()` from `config/db.ts` (pg Pool + `DATABASE_URL`)
- `initDb()` exists, **never imported by server.ts or app.ts**

### Orphan platform API

`apps/api/src/routes/index.ts` mounts `/auth`, `/licenses`, `/events`, `/feature-requests`, `/sync`, `/admin`, `/health`.

No `package.json`, no `server.ts`. Controllers import `@modules/services/authService` — those services exist in **web** (`apps/web/src/modules/services/authService.ts`) and as **empty files** in `apps/backend/src/services/`.

`apps/backend` copies of auth/sync routes, controllers, middleware, repositories, schemas, jobs: **0-byte files**.

### Runtime declared vs used

| Piece | Declared | Used by live server.ts | Used by app.ts |
|---|---|---|---|
| PostgreSQL | yes | no | yes (if started) |
| Redis / BullMQ | yes | no | no (queueService empty) |
| JWT | env example | no | no |
| Swagger | empty file | no | no |
| Helmet | dep | no | yes |
| Rate limit | empty file | no | no |

## 7.2 API INVENTORY

### A. Live entry `server.ts` (what `npm run dev:backend` actually serves)

| Method | Endpoint | Auth | Input | Output | Status |
|---|---|---|---|---|---|
| GET | `/` | none | — | `"API running"` text | PLACEHOLDER |
| GET | `/dashboard/summary` | none | — | `{ totalRevenue, totalOrders, totalCustomers }` **hardcoded** | PLACEHOLDER; **shape ≠ frontend DashboardSummary** |
| GET | `/orders` | none | — | `[{ id, amount, status, date }]` | PLACEHOLDER; **shape ≠ ProductionBoard/Dashboard usage** |
| GET | `/invoices` | none | — | `[{ id, amount, status, date }]` | PLACEHOLDER |
| GET | `/dashboard/payments-analytics` | none | — | `{ totalPaid, totalPending, weeklyData }` | PLACEHOLDER; **shape ≠ frontend bars/trendPercent** |
| GET | `/settings/workspace-members` | none | — | `[]` | PLACEHOLDER |
| GET | `/customers` | none | — | `[]` | PLACEHOLDER (GET only) |
| GET | `/settings` | none | — | `{ workspace_profile: { name, defaultCurrency } }` | PLACEHOLDER |

No POST/PUT/DELETE. No `/health`. No production-stages. No materials. No reports. No payments create.

### B. Unmounted `app.ts` routers (code exists, process does not run)

| Method | Endpoint | Controller | Auth | Input | Output | Status |
|---|---|---|---|---|---|---|
| GET | `/` | app.ts | none | — | `{ message }` | IMPLEMENTED_UNVERIFIED |
| GET | `/health` | app.ts | none | — | `{ status: 'ok' }` | IMPLEMENTED_UNVERIFIED |
| GET | `/dashboard/summary` | dashboardRoutes | none | — | counts from SQL | IMPLEMENTED_UNVERIFIED; schema may not exist |
| GET | `/dashboard/payments-analytics` | dashboardRoutes | none | — | `{ bars, thisWeekTotal, ... }` | IMPLEMENTED_UNVERIFIED |
| GET/POST/PUT | `/customers` | customerRoutes | none | `{ fullName, phone, email, address, notes }` | camelCase customer | IMPLEMENTED_UNVERIFIED; IDs = `Date.now()` |
| GET | `/customers/:id/orders` | customerRoutes | none | id | orders subset | IMPLEMENTED_UNVERIFIED |
| GET/POST/PUT | `/orders` | orderRoutes | none | large order body | camelCase order | IMPLEMENTED_UNVERIFIED |
| GET | `/orders/:id` | orderRoutes | none | id | order | IMPLEMENTED_UNVERIFIED |
| GET | `/orders/:orderId/production-stages` | orderRoutes | none | — | stages DTO | IMPLEMENTED_UNVERIFIED |
| POST | `/orders/:orderId/production-stages/:stageCode/transition` | orderRoutes | none | `{ action, note }` | `{ orderStatus, productionStages }` | IMPLEMENTED_UNVERIFIED |
| POST | `/orders/:orderId/production-stages/:stageCode/note` | orderRoutes | none | `{ note }` | `{ productionStages }` | IMPLEMENTED_UNVERIFIED |
| PATCH | `/orders/:id/studio-session` | orderRoutes | none | studio body | order | IMPLEMENTED_UNVERIFIED; **no frontend caller found** |
| GET/POST/PUT | `/invoices` | invoiceRoutes | none | invoice + items | invoice | IMPLEMENTED_UNVERIFIED; uses `invoice_items` **not in initDb** |
| GET | `/payments` | paymentRoutes | none | — | payments | IMPLEMENTED_UNVERIFIED |
| GET | `/payments/invoice/:invoiceId` | paymentRoutes | none | — | payments | IMPLEMENTED_UNVERIFIED |
| POST | `/payments` | paymentRoutes | none | payment | payment + invoice update (transaction) | IMPLEMENTED_UNVERIFIED |
| GET/POST/PUT/DELETE | `/materials/fabrics` | materialRoutes | none | fabric | fabric | IMPLEMENTED_UNVERIFIED; table `fabric_records` **not in initDb** |
| GET | `/materials/fabrics/low-stock` | materialRoutes | none | — | fabrics | IMPLEMENTED_UNVERIFIED |
| POST/DELETE | `/materials/usages` | materialRoutes | none | usage | usage + stock adjust | IMPLEMENTED_UNVERIFIED; table `order_material_usages` **not in initDb** |
| GET | `/materials/usages/order/:orderId` | materialRoutes | none | — | usages | IMPLEMENTED_UNVERIFIED |
| GET | `/reports/summary` | reportRoutes | none | — | aggregates | IMPLEMENTED_UNVERIFIED |
| GET | `/reports/order-status` | reportRoutes | none | — | counts | IMPLEMENTED_UNVERIFIED |
| GET | `/reports/monthly-revenue` | reportRoutes | none | — | series | IMPLEMENTED_UNVERIFIED |
| GET | `/reports/overdue-orders` | reportRoutes | none | — | orders | IMPLEMENTED_UNVERIFIED |
| GET | `/reports/low-stock-materials` | reportRoutes | none | — | fabrics | IMPLEMENTED_UNVERIFIED |
| GET/PUT | `/settings`, `/settings/:key` | settingsRoutes | none | `{ value }` | kv | IMPLEMENTED_UNVERIFIED; table `app_settings` **not in initDb** |
| GET/POST/PUT/DELETE | `/settings/workspace-members` | settingsRoutes | none | member | member | IMPLEMENTED_UNVERIFIED; table `workspace_members` **not in initDb** |

No multi-tenancy: queries are global, not workspace-scoped. No auth.

### C. Documented / apps/api (not running)

From `docs/api.md` and `apps/api/src/routes`:

| Method | Endpoint (docs say `/api/v1/...`; code mounts without prefix) | Auth | Status |
|---|---|---|---|
| POST | `/auth/register` `/auth/login` `/auth/refresh` | rate limit | BACKEND_ONLY, unpackaged |
| POST | `/licenses/validate` | rate limit | BACKEND_ONLY |
| POST | `/licenses/:licenseId/devices/deactivate` | JWT | BACKEND_ONLY |
| POST | `/events` | JWT | BACKEND_ONLY |
| GET/POST | `/feature-requests`, vote | mixed | BACKEND_ONLY |
| POST `/sync/push` GET `/sync/pull` | JWT | BACKEND_ONLY |
| Admin users/analytics/licenses/audit | JWT+role | BACKEND_ONLY |
| GET `/health` | none | BACKEND_ONLY |

Frontend **does not call any of these**.

## 7.3 SERVICE INVENTORY

| Service | Location | Class | Callers | DB | Tests | Status |
|---|---|---|---|---|---|---|
| productionStageService | `apps/backend/src/services/productionStageService.ts` (552 lines) | CORE_DOMAIN | orderRoutes only | `order_production_stages` + events | none | IMPLEMENTED_UNVERIFIED; **unmounted** |
| dashboard/customer/order/invoice/payment/material/report/settings | inline in route files | APPLICATION_SERVICE | app.ts | various | none | SQL in routes — boundary violation |
| auth/license/sync/admin/event/featureRequest/queue/audit | empty in backend; implementations in web + apps/api controllers | LEGACY / DUPLICATE | none running | users/licenses/sync_changes | JS tests exist, TS tests empty | DEAD / ORPHAN |
| patternEngine | web | CORE_DOMAIN | DesignStudio | none | none | PRESERVE |
| productionAssistant | web | CORE_DOMAIN | DesignStudio, AppContext, Orders | none | none | PRESERVE |
| tierEnforcement | web | APPLICATION_SERVICE | AppContext, FeatureGate | mockData | none | FRONTEND_ONLY simulated |
| jobSheetExport | web | UTILITY | ProductionBoard | none | none | IMPLEMENTED_UNVERIFIED |
| invoicePdf / jobCardPdf | web | UTILITY | Invoices / orders | none | none | IMPLEMENTED_UNVERIFIED |
| reporting.ts / productionAlerts.ts / garmentLogic.ts | web | DOMAIN-IN-UI | Reports / Orders | none | none | garmentLogic **CONFIRMED_DEAD** (no imports) |
| authService (web) | web modules | LEGACY | none in UI | would need pg | none | BROKEN (imports missing jwt + `../config/db`) |

## 7.4 BACKEND CODE INTEGRITY

| Issue | Evidence | Classification |
|---|---|---|
| Two entrypoints | server.ts vs app.ts | CRITICAL |
| ~50 empty TS files in backend | auth, middleware, repos, tests `.ts` | DEAD_CODE / PLACEHOLDER |
| Truncated junk files `$3`, `-`, `{` | backend root | BROKEN |
| IDs = `Date.now().toString()` | customers, orders, invoices, payments, fabrics | HIGH — collisions |
| `initDb` never called | only defined | CRITICAL schema gap |
| Business SQL columns (garment_type, production_plan, JSON) **not** in `initDb` CREATE TABLE | orderRoutes INSERT vs initDb orders DDL | CONTRACT / SCHEMA MISMATCH |
| invoice_items, fabric_records, app_settings, workspace_members, order_material_usages not created | routes query them | BROKEN if app.ts started against empty DB |
| orderStudio.schema.ts unused by routes | file exists, routes don't validate with it | DEAD_CODE |
| Zod 3 backend vs Zod 4 web | package.json | RISK |
| Express 4 backend vs Express 5 root devDep | package.json | RISK |
| No consistent error envelope | `{ message }` vs ApiError codes in unused web services | INCONSISTENT |
| No auth on business API | app.ts | CRITICAL if exposed |
| CI `npm test` at repo root | root package.json has **no test script**; tests live in backend | BROKEN CI |

---

# 4. DATABASE INVENTORY

## Technology

PostgreSQL 16 (docs, docker, CI). Access via `pg` Pool. **No ORM.** Migrations are raw SQL, duplicated in `migrations/` (mostly empty) and `migrations/migrations/` (real).

## Tables that SQL migrations actually create

| Table | Purpose | PK | Relationships | Frontend | Backend |
|---|---|---|---|---|---|
| users | auth | UUID | — | no | apps/api only |
| licenses | commercial license | UUID | user_id → users | no | apps/api only |
| license_devices | device binding | UUID | license_id | no | apps/api only |
| events | analytics ingest | UUID | user_id | no | apps/api only |
| feature_requests | feedback | UUID | user_id | no | apps/api only |
| feature_request_votes | votes | UUID | FR + user unique | no | apps/api only |
| audit_logs | audit | UUID | user_id | no | apps/api only |
| refresh_tokens | JWT refresh | UUID | user_id | no | apps/api only |
| sync_changes | offline sync log | UUID | user_id | no | apps/api only |
| order_production_stages | workflow | UUID | **REFERENCES orders(id)** | mixed | productionStageService |
| order_production_stage_events | stage audit | UUID | stages + orders | no | productionStageService |

**Core business tables are NOT in migrations.** `initDb()` would create simplified:

- `customers` (TEXT id, no workspace)
- `orders` (TEXT id, FK customer, **no garment/studio columns**)
- `invoices` (no items table)
- `payments`

`initDb` is never invoked. Production-stage migration **cannot apply** without `orders`.

## Missing vs used

| Concept | Used by code | Created by schema | Status |
|---|---|---|---|
| customers | app.ts + frontend API | initDb only | MISSING in migrations |
| orders extra columns | orderRoutes SELECT * / INSERT 27 cols | not in initDb | SCHEMA DRIFT |
| invoice_items | invoiceRoutes | nowhere | MISSING |
| fabric_records | materialRoutes | nowhere | MISSING |
| order_material_usages | materialRoutes | nowhere | MISSING |
| app_settings | settingsRoutes | nowhere | MISSING |
| workspace_members | settingsRoutes | nowhere | MISSING |
| measurement_profiles | frontend local only | nowhere | FRONTEND_ONLY |
| design_inspirations | frontend local | nowhere | FRONTEND_ONLY |
| pattern_library | frontend local | nowhere | FRONTEND_ONLY |
| workspaces / tiers | frontend mockData | nowhere | FRONTEND_ONLY |

**Orphan tables (if migrations ran):** users, licenses, events, feature_requests, sync_changes — no product UI.

**Duplicate concepts:** frontend Workspace/Tier vs backend licenses.tier (`free|pro|enterprise`) vs UI tiers (`BASIC|PRO|STUDIO`). **DATA_MODEL_MISMATCH.**

---

# 5. API INVENTORY (frontend client catalog)

Frontend HTTP clients:

| Client file | Env | Paths |
|---|---|---|
| `shared/utils/api.ts` | `VITE_API_BASE_URL` \|\| `:5000` | primitive GET/POST/PUT/DELETE, **no auth header** |
| `shared/utils/customerApi.ts` | via api.ts | `/customers` |
| `shared/api/Customers.ts` | via api.ts | same, with try/catch — **unused** |
| `shared/api/orders.ts` | via api.ts | `/orders` — **ApiOrder type is stub-shaped** |
| `shared/api/invoices.ts` | via api.ts | `/invoices` CRUD |
| `shared/api/payments.ts` | via api.ts | `/invoices/:id/payments` |
| `shared/api/productionStages.ts` | via api.ts | `/orders/:id/stages` |
| `shared/api/settings.ts` | via api.ts | `/settings` |
| `shared/api/workspaceMembers.ts` | via api.ts | `/settings/workspace-members` |
| `shared/api/materials.ts` | `VITE_API_URL` | `/materials/...` — **syntax-broken** |
| `shared/api/reports.ts` | `VITE_API_URL` | `/reports/...` |
| `shared/utils/dashboardApi.ts` | via api.ts | `/dashboard/summary` |
| `shared/utils/paymentsAnalyticsApi.ts` | via api.ts | `/dashboard/payments-analytics` |
| `shared/utils/customerOrdersApi.ts` | via api.ts | `/customers/:id/orders` |
| ProductionBoard inline fetch | API_BASE | `/orders/:id/production-stages/:code/transition` and `/note` |

---

# 6. FRONTEND ↔ BACKEND CONTRACT MATRIX

| Feature | Frontend request | Backend reality (live server.ts) | Backend reality (app.ts) | Request match | Response match | Status |
|---|---|---|---|---|---|---|
| Health | GET `/health` (ApiHealthCheck unused) | **missing** | GET `/health` `{status:'ok'}` | n/a | n/a | ENDPOINT_MISSING on live |
| Dashboard summary | GET `/dashboard/summary` expects customers/orders/revenue/balances/alerts/currency | hardcoded `{totalRevenue,totalOrders,totalCustomers}` | SQL object closer to frontend | partial | **NO** vs live | RESPONSE_MISMATCH |
| Payments analytics | expects `{bars,thisWeekTotal,previousWeekTotal,trendPercent,hasRevenue}` | `{totalPaid,totalPending,weeklyData}` | matches frontend | — | live **NO**; app.ts **YES** | RESPONSE_MISMATCH |
| Customers list | GET `/customers` `{fullName,...}` | `[]` | SQL mapped camelCase | GET yes | empty stub | PARTIALLY_ALIGNED if app.ts |
| Customer create | POST `/customers` | **missing** | exists | — | — | ENDPOINT_MISSING on live |
| Customer orders | GET `/customers/:id/orders` | **missing** | exists | — | — | ENDPOINT_MISSING on live |
| Orders list | `ApiOrder {id,amount,status,date}` but UI reads `orderNumber,customerId,dueDate,totalAmount` | stub matches **type file** not **UI** | rich order object matches UI not type file | — | **NO** | DATA_MODEL_MISMATCH |
| Order by id | GET `/orders/:id` | missing | exists | — | — | ENDPOINT_MISSING on live |
| Order create/update | none from Orders.tsx (local) | missing | POST/PUT exist | orphan API | — | ORPHAN if app.ts |
| Studio session save | none | missing | PATCH `/orders/:id/studio-session` | — | — | ORPHAN API |
| Production stages fetch (Orders.tsx helper) | GET `/orders/:id/stages` | missing | actual path `/production-stages` | **NO** | — | ENDPOINT_MISSING / REQUEST_MISMATCH |
| Production stages (ProductionBoard) | POST `/orders/:id/production-stages/:stageCode/transition` | missing | **this path exists** | vs app.ts YES | live missing | ENDPOINT_MISSING on live |
| Invoices | CRUD `/invoices` | GET stub wrong shape | real CRUD | live GET only | **NO** | MISALIGNED |
| Payments | POST `/invoices/:invoiceId/payments` | missing | POST `/payments` + GET `/payments/invoice/:id` | **NO** | — | REQUEST_MISMATCH |
| Materials API | `/materials/fabrics` | missing | exists | — | — | ENDPOINT_MISSING + **client file BROKEN** |
| Reports API | `/reports/*` | missing | exists | — | — | unused by Reports.tsx |
| Settings | GET `/settings` PUT `/settings/:key` | GET stub object; no PUT | kv table | partial | **NO** | PARTIALLY_ALIGNED |
| Workspace members | `/settings/workspace-members` | GET `[]` | CRUD | GET only live | empty | PARTIALLY_ALIGNED |
| Auth/login | **no UI** | no | no in app.ts | — | — | ABSENT |
| Sync | no UI | no | empty files | — | — | ABSENT |
| Design Studio | no HTTP | n/a | PATCH studio-session unused | — | — | FRONTEND_ONLY |
| Pattern Engine | no HTTP | n/a | n/a | — | — | FRONTEND_ONLY |
| Measurements | no HTTP | n/a | JSON columns on orders if schema existed | — | — | FRONTEND_ONLY |

### A. Phantom APIs (frontend calls; live server lacks)

POST/PUT customers; customer orders; order by id; `/orders/:id/stages`; production-stage transition (live); invoice mutations; `/invoices/:id/payments`; `/health`; materials; reports; settings PUT.

### B. Orphan APIs (app.ts has; no frontend caller or wrong path)

PATCH `/orders/:id/studio-session`; POST `/orders`; PUT `/orders/:id`; GET `/payments`; POST `/payments`; materials usages; reports (Reports screen ignores them).

### C. Contract drift

- Env: `VITE_API_BASE_URL` vs `VITE_API_URL`
- Payments path
- Stages path (`/stages` vs `/production-stages`)
- Dashboard summary fields
- Payments analytics fields
- Order DTO
- Invoice status vocab: frontend `sent|partial|overdue` vs invoiceRoutes compute `paid|overdue|partial|pending`
- Tier enums BASIC/PRO/STUDIO vs licenses free/pro/enterprise
- Currency default GHS everywhere; no auth tenant

### D. Duplicate APIs / clients

- `shared/api/Customers.ts` vs `shared/utils/customerApi.ts`
- `payments.ts` vs `paymentsAnalytics.ts` vs `paymentsAnalyticsApi.ts`
- Two production-stage clients (helper vs ProductionBoard inline, different paths)

### E. Hidden business logic in UI

- Pattern geometry
- Fabric yardage estimates
- Cutting lists / sewing checklists / fit risks
- Measurement merge, bust↔chest aliasing
- Auto cutting stock deduction in AppContext
- Invoice status on local payments
- Completeness alerts (`productionAlerts.ts`)
- Tier limits vs mock customer counts

---

# 7. DATA FLOW MAP

## Design / pattern pipeline (ACTUAL)

```
CUSTOMER (local or API — often different records)
    ↓  [BREAK: Customers screen does not write AppContext]
MEASUREMENT PROFILES (localStorage only)
    ↓  applyMeasurementProfile / DesignStudio
DESIGN STUDIO (canvas + local draft)
    ↓  generateStylePattern()  ← Pattern Engine (in-process)
    ↓  generateProductionPlan() ← Production Assistant (in-process)
    ↓  updateOrder() AppContext
ORDERS (localStorage)
    ↓  [BREAK: no PATCH studio-session]
PRODUCTION BOARD (fetch /orders from stub API)
    ↓  [BREAK: different order set]
```

**The intended CUSTOMER → MEASUREMENTS → STUDIO → PATTERN → PRODUCTION pipeline exists only inside AppContext/localStorage. It does not cross the HTTP boundary. Production Board does not consume that pipeline.**

## Where the chain breaks

1. Customers API ≠ customers in AppContext  
2. Design Studio save writes local order, not backend  
3. Pattern Engine never on server  
4. Production Board reads stub/API orders, not local orders  
5. Materials local ≠ materials API  
6. Dashboard mixes both  

---

# 8. DOMAIN ENGINE AUDIT

## Pattern Engine — `apps/web/src/modules/services/patternEngine.ts` (674 lines)

| Question | Finding |
|---|---|
| Inputs | `StylePatternKind` + measurements in **centimetres** |
| Outputs | Bodice control points + generic outline/guides/notches/pieceNotes |
| Deterministic? | Yes: clamp, round1, formulas, no I/O, no Date entropy except none |
| Kinds implemented | bodice, shirt, trouser, skirt, kaftan |
| Mapped but not drafted | dress/gown/blouse → bodice; senator → shirt; agbada → kaftan (mapping in DesignStudio) |
| Error handling | `PatternValidationError` on range |
| Units | **Assumed cm. No conversion.** |
| UI coupling | None (pure). SVG helpers `generateBodiceSvgPath` exist; DesignStudio uses canvas instead |
| Backend coupling | None |
| Classification | **PURE DOMAIN LOGIC** trapped in the web app. **PROTECTED / TRUSTED (partial garment coverage).** Not unit-tested. |

Not a full industrial pattern CAD. Foundation blocks with ease heuristics. **Do not rewrite casually.**

## Measurement intelligence — ACTUAL architecture

Intended: Body vs Garment vs Pattern.

Actual:

| Layer | Where | Shape |
|---|---|---|
| BodyMeasurements | `shared/types` extends GarmentMeasurements + required bust/waist/neck/shoulder/backLength | Studio sliders + `designStudioMeasurements` |
| GarmentMeasurements | 40+ optional numeric fields, aliases sleeve/sleeveLength, ankle/aroundAnkle | Profiles, orders, studio |
| Pattern measurements | Engine-internal (quarterBust, dartIntake, …) | Not persisted as first-class |
| Profiles | `CustomerMeasurementProfile.measurements: GarmentMeasurements` | localStorage |
| Order snapshot | `OrderMeasurementSnapshot extends GarmentMeasurements` + profile metadata | localStorage; backend JSON if schema existed |

**They are mixed.** AppContext `setDesignMeasurements` copies body fields into garment state and vice versa. `toBodyMeasurementUpdates` maps garment chest→body bust. DesignStudio `MEASUREMENT_ALIASES` further mixes names. Duplicate customer profile arrays: `measurementProfiles`, `profiles`, `measurementsProfiles`.

Units: UI labels say `cm`. No inch conversion. No stored unit field on measurements.

Validation: engine ranges; UI slider min/max **differ slightly** from engine ranges (e.g. waist max 120 vs 140). **PARTIAL.**

Database: no measurement tables. **FRONTEND_ONLY.**

Classification: **PARTIAL / UI-COUPLED DOMAIN LOGIC.** Concept is present. Separation is not enforced.

## Design Studio — `DesignStudio.tsx` ~4075 lines

| Aspect | Finding |
|---|---|
| Architecture | Single mega-component: helpers + canvas renderer + forms + FeatureGates |
| State | Local React state + AppContext + extra localStorage drafts |
| Canvas | 2D garment silhouette (front/back) + pieces mode using Pattern Engine |
| Categories | 11 garment types; 5 true drafts |
| Inputs | order, customer profiles, inspirations, fabrics, measurements |
| Outputs | garmentMeasurements, measurementSnapshot, productionPlan, pattern library PNG, inspiration, fabric id |
| Backend | **None** |
| Pattern Engine | `generateStylePattern` |
| Production Assistant | `analyzeDesignInspiration`, `generateProductionPlan` |
| Visual vs domain | Shape builders `buildUpperGarmentShape` etc. are **visual approximations**, not the pattern draft. Pieces view is closer to domain. |

A. Visual editor: canvas, tabs, zoom, fabric fill, inspiration gallery.  
B. Domain: measurement normalize, pattern call, production plan.  
C. Incorrectly embedded: production plan generation, profile CRUD, order persistence, fabric inventory selection.  
D. Extract eventually: measurement normalize, garment-type mapping, studio session DTO.  
E. Untouched initially: canvas math, pattern call sites, production plan call sites.

Classification: **PROTECTED asset, UI-COUPLED, not a clean module.** IMPLEMENTED_UNVERIFIED (no tests, no backend).

## Production / tailoring intelligence

| Capability | Location | Classification |
|---|---|---|
| Fabric yardage estimate | productionAssistant.estimateFabricRequirement | EXISTS_BUT_INCOMPLETE (heuristic, yards default) |
| Cutting pieces | buildCuttingList | EXISTS_BUT_INCOMPLETE (templates, not nested CAD) |
| Lining / interfacing qty | fabric estimate | EXISTS_BUT_INCOMPLETE |
| Sewing checklist | buildSewingChecklist | EXISTS_BUT_INCOMPLETE (narrative steps) |
| Fit risks | buildFitRiskWarnings | EXISTS_BUT_INCOMPLETE |
| Inspiration NLP | keyword/category heuristics labeled “AI” | EXISTS_BUT_INCOMPLETE — **not ML** |
| Production workflow stages | frontend Orders + backend productionStageService | SPLIT; backend unmounted |
| Auto stock deduction on cutting | AppContext updateOrder | FRONTEND_ONLY |
| Job sheet PDF | jobSheetExport.ts 979 lines | EXISTS_BUT_INCOMPLETE |
| Production alerts | productionAlerts.ts 455 lines | FRONTEND_ONLY |

---

# 9. DUPLICATION REPORT

| Concept | Location A | Location B | Which is used | Risk |
|---|---|---|---|---|
| Backend entry | server.ts stub | app.ts real | server.ts | CRITICAL |
| Auth/sync API | apps/api (code) | apps/backend empty files | neither running | HIGH |
| Auth services | apps/web/modules/services | apps/api controllers | none in UI | HIGH confusion |
| Customer API client | customerApi.ts | shared/api/Customers.ts | customerApi.ts | MEDIUM |
| Order form | OrderForm.tsx | Orders.tsx OrderFormModal | Orders.tsx | MEDIUM |
| Order card | OrderCard.tsx | Orders.tsx inline | Orders.tsx | LOW |
| Dashboard summary type | dashboardApi.ts | shared/types DashboardSummary | mixed | MEDIUM |
| Payments analytics client | paymentsAnalytics.ts (api) | paymentsAnalyticsApi.ts (utils) | utils in Dashboard | MEDIUM |
| API base env | VITE_API_BASE_URL | VITE_API_URL | both | HIGH |
| Capacitor config | root capacitor.config.ts (Tailor Studio, https) | apps/mobile (StitchFlow, http cleartext) | unknown which packaging uses | HIGH |
| Docker compose | docker/docker-compose.yml :5432 | apps/backend/docker-compose.yml :5433 | unknown | MEDIUM |
| Migrations | migrations/*.sql empty | migrations/migrations/*.sql | docs point at first set | CRITICAL |
| Tier prices | config/tiers.ts GHS 45/90 | tierEnforcement FEATURE_COMPARISON $29/$79 | Settings uses FEATURE_COMPARISON | HIGH product lie |
| License tiers | free/pro/enterprise | BASIC/PRO/STUDIO | UI uses BASIC/PRO/STUDIO | HIGH |
| Zod | v3 backend | v4 web | both unused on live path | MEDIUM |
| Tailwind | v3 postcss | v4 vite plugin dep | v3 config | LOW |
| Express | v4 backend | v5 root devDep | backend | MEDIUM |
| Types | shared/types/index.ts | apps/web/src/types.ts corrupted | imports say `../types` | CRITICAL |
| Pattern types | patternEngine GenericPatternDraft | shared/types GenericPatternDraft (no pieceNotes) | engine has extra fields | MEDIUM |
| Refresh token repo | refreshTokenRepository.ts | settingsRepository.ts **exports refreshTokenRepository** | unused | HIGH copy-paste |
| customerRepository.ts, authRepository.ts, designStudioRepository.ts | all comment-only stubs | unused | LOW |

---

# 10. DEAD CODE REPORT

| Item | Confidence |
|---|---|
| `apps/backend` empty auth/sync/middleware/swagger/jobs/utils | CONFIRMED_DEAD (0 bytes, unimported by server.ts) |
| `apps/api` entire tree | PROBABLY_DEAD until packaged |
| `apps/web` modules/repositories/* SQL | CONFIRMED_DEAD in browser (missing db module) |
| `apps/web` modules/services auth/sync/admin/license/event/queue | CONFIRMED_DEAD in UI |
| `apps/web/src/schemas/*` | CONFIRMED_DEAD in UI |
| `shared/types/express.d.ts` | CONFIRMED_DEAD in frontend |
| `garmentLogic.ts` | CONFIRMED_DEAD (zero imports) |
| `CustomerDetail.tsx`, `ApiHealthCheck.tsx`, `OrderCard.tsx`, `OrderForm.tsx` | PROBABLY_DEAD |
| `shared/api/Customers.ts` | PROBABLY_DEAD |
| `shared/api/materials.ts` | BROKEN + unused by Materials.tsx |
| `shared/api/reports.ts` | PROBABLY_DEAD vs Reports.tsx |
| `*.bak*` files | CONFIRMED_DEAD leftovers |
| `apps/backend/{`, `$3`, `-` | CONFIRMED_DEAD debris |
| `orderStudio.schema.ts` | PROBABLY_DEAD (unwired) |
| `initDb.ts` | UNKNOWN_USAGE — defined, never called |
| `@dnd-kit` | UNKNOWN_USAGE |
| root `tailwind.config.js` | PROBABLY_DEAD vs apps/web config |
| backend tests `*.ts` empty; `*.js` exist | PARTIAL |

Do not delete in this phase.

---

# 11. OFFLINE-FIRST REALITY REPORT

| Mechanism | Exists? | Evidence |
|---|---|---|
| Service worker | **No** | no registration, no workbox |
| IndexedDB | **No** | no usage |
| localStorage | **Yes** | namespaced business + studio data |
| Sync push/pull | Code only | apps/api + web syncService; **not in UI, not in live server** |
| Manifest | Yes, TailorPro | not a SW |

| Module | Works offline | Partial | Network required | Reason |
|---|---|---|---|---|
| Design Studio | Yes (after load) | | | localStorage + in-process engines |
| Orders (Orders.tsx) | Yes | stages API ignored on fail | | AppContext |
| Materials | Yes | | | AppContext |
| Reports | Yes | | | AppContext |
| Settings profile/tier | Partial | API settings fail open (`{}`) | | mixed |
| Customers | | | **Yes** | no local fallback |
| Invoices | | | **Yes** | API |
| Production Board | | empty catch | **Yes for data** | fetchOrders |
| Dashboard | Partial | API fail → zeros; fabrics local | summaries | mixed |

**Do not label the system offline-first.** It is local-first for studio/ops **and** online-required for CRM/finance screens, with **no sync**.

localStorage risk: unbounded growth (inspiration images and pattern PNGs as data URLs). Quota failures swallowed in DesignStudio draft writer.

---

# 12. MOBILE ARCHITECTURE REPORT

| Item | Finding | Status |
|---|---|---|
| Capacitor | 8.3 in apps/mobile; also root config | DUPLICATED |
| App id | root `com.tailorstudio.app` vs mobile `com.stitchflow.app` | CONTRACT_MISMATCH |
| webDir | root `dist` vs mobile `../web/dist` | mismatch |
| Android | project present; cleartext true on mobile config | PARTIALLY_IMPLEMENTED |
| iOS | not present in apps/mobile | ABSENT |
| API URLs | hardcoded localhost:5000 in web | **will fail on device** |
| LAN IP | CORS `192.168.100.4` | **development leakage** |
| Plugins | SplashScreen/Keyboard in root config only | UNKNOWN |
| Canvas | HTML canvas — generally OK in WebView | UNVERIFIED |
| Storage | localStorage in WebView | UNVERIFIED quota |
| MOBILE_SETUP.md | TailorPro, Flutter dashboard Windows path | LEGACY / WRONG PRODUCT |

Classification: **not production-ready mobile.** Wrapper only.

---

# 13. CONFIGURATION AUDIT

## Environment variable names (no secret values)

| Name | Purpose | Consumed by | Notes |
|---|---|---|---|
| NODE_ENV | runtime | backend env.ts | |
| PORT | listen | env.ts default 3000 | **server.ts ignores, uses 5000** |
| DATABASE_URL | pg | db.ts | required if env.ts loads |
| JWT_SECRET | JWT | .env.example; empty jwt.ts | unused live |
| REFRESH_TOKEN_SECRET | JWT | example | unused live |
| ACCESS_TOKEN_EXPIRES_IN | JWT | example | unused |
| REFRESH_TOKEN_EXPIRES_IN | JWT | example | unused |
| CORS_ORIGIN | CORS | env.ts | **server.ts ignores** |
| MAX_PAYLOAD_SIZE | body | app.ts | |
| BCRYPT_ROUNDS | hash | example | unused live |
| ADMIN_EMAIL / ADMIN_PASSWORD | seed | example + SQL | |
| FREE/PRO/ENTERPRISE_DEVICE_LIMIT | licenses | example | unused live |
| REDIS_URL | queues | env.ts default | unused live |
| RENDER_EXTERNAL_URL | deploy | example | |
| VITE_API_BASE_URL | frontend API | api.ts | **not in .env.example** |
| VITE_API_URL | frontend API | materials.ts, reports.ts | **duplicate, not in example** |
| RENDER_DEPLOY_HOOK_URL | CI | GitHub secret | |

Hardcoded: `localhost:5000`, `localhost:5173`, `192.168.100.4:5173`. Frontend never sends Authorization.

Missing for Studio rebuild: documented single API origin, tenant id, measurement unit, feature flag source.

---

# 14. PROTECTED ASSET REGISTER

| Asset | Path | Decision | Trust | Notes |
|---|---|---|---|---|
| Pattern Engine | `apps/web/src/modules/services/patternEngine.ts` | **PRESERVE** | TRUSTED (untested) | Pure, cm, 5 drafts |
| Production Assistant | `apps/web/src/modules/services/productionAssistant.ts` | **PRESERVE** | TRUSTED-PARTIAL | Heuristic, not ML |
| Design Studio | `apps/web/src/components/DesignStudio.tsx` | **PRESERVE UI-coupled; EXTRACT later** | PARTIAL | 4k-line asset |
| Measurement types + merge | `shared/types/index.ts`, AppContext helpers | **ADAPT** | PARTIAL | mixed body/garment |
| Production stage engine | `apps/backend/src/services/productionStageService.ts` | **PRESERVE** | PARTIAL | unmounted, untested |
| Job sheet export | `jobSheetExport.ts` | **ADAPT** | PARTIAL | frontend PDF |
| Tier simulation | tierEnforcement + config/tiers | **ADAPT** | DANGEROUS (two price tables) | not real billing |
| Fabric intelligence | productionAssistant + Materials local | **ADAPT** | PARTIAL | |
| Live server.ts | stub | **REPLACE** | DANGEROUS | |
| apps/api auth | | **REPAIR / DEFER** | UNKNOWN | incomplete |

---

# 15. REBUILD BOUNDARY DOCUMENT

## WHAT THE NEW FRONTEND MAY REPLACE

- Layout, navigation, visual design, motion, splash, theming  
- Dashboard/Customers/Orders/Invoices/Reports/Settings **presentation**  
- View routing (may introduce a real router)  
- Dead/orphan UI components listed above (after explicit approval)  
- PWA manifest branding  

## WHAT IT MUST CONSUME (not reimplement)

- `generateStylePattern` / bodice+generic drafts  
- `generateProductionPlan` / analyze inspiration / fabric estimate / cutting list / sewing checklist / fit risks  
- Measurement field vocabulary in `GarmentMeasurements` / `BodyMeasurements`  
- Production stage codes and transition rules (even if re-hosted)  
- Order completeness concepts in productionAlerts (review before copy)

## WHAT IT MUST NOT REIMPLEMENT

- Pattern geometry formulas  
- Production assistant heuristics as a new “AI”  
- A second measurement model with different field names without a mapping layer  

## BACKEND WORK THAT MUST HAPPEN BEFORE INTEGRATION

1. Single process entry: either retire `server.ts` stub or make it mount `app.ts`.  
2. Schema for customers, orders (studio columns), invoices/items, payments, fabrics, usages, settings, members, measurement profiles.  
3. Align paths: stages, payments, health, dashboard DTOs.  
4. Auth decision: local-first with later sync **or** JWT on all business routes.  
5. Workspace tenancy.  
6. Stop timestamp IDs.  
7. `initDb` vs migrations: one pipeline.  
8. Fix or isolate corrupted `materials.ts` and `apps/web/src/types.ts`.  

## WHAT CAN HAPPEN IN PARALLEL

- Experience redesign against **local domain engines** and fixtures  
- Extraction of pattern/production modules into a future `packages/domain` **without changing formulas**  
- Inventory of DTO contracts (this report)  
- **Not** wiring new UI to current `:5000` stub as if it were production  

---

# 16. RISK REGISTER

| ID | Rank | Issue | Evidence | Systems | Why it matters | Future resolution (do not implement now) |
|---|---|---|---|---|---|---|
| R1 | CRITICAL | Dual backend entry; stub is live | package.json + server.ts vs app.ts | all API | Rebuild would integrate with fake data | One entrypoint |
| R2 | CRITICAL | Dual source of truth | AppContext vs fetch screens | CRM vs studio | Orders/customers diverge | Pick SoT + sync |
| R3 | CRITICAL | Schema incomplete / initDb unused | migrations vs routes | DB | app.ts would 500 on real DB | Unified migrations |
| R4 | CRITICAL | types.ts overwritten | file content = main.tsx | TS types | Studio imports `../types` | Restore types barrel |
| R5 | CRITICAL | No auth on business API | app.ts | backend | Data leak if mounted | AuthZ |
| R6 | HIGH | Contract mismatches (stages, payments, DTOs, envs) | client vs routes | FE/BE | Silent empty/wrong UI | Contract tests |
| R7 | HIGH | materials.ts syntax corruption | truncated encodeURIComponent / Promise.race debris | materials API | cannot compile if imported | Repair or quarantine |
| R8 | HIGH | localhost + LAN IP leakage | server.ts CORS, api.ts | mobile/prod | Devices cannot reach API | Env-based origin |
| R9 | HIGH | Domain logic trapped in UI | DesignStudio 4k, AppContext 2k | studio | Rebuild could destroy IP | Extract don't rewrite |
| R10 | HIGH | Tier/billing is simulated | FeatureGate `window.alert` | commercial | Fake monetization | Defer real billing |
| R11 | HIGH | Empty backend files look “implemented” | 0-byte controllers | onboarding | False confidence | Mark orphan |
| R12 | MEDIUM | Timestamp IDs | Date.now() | writes | collisions | UUID |
| R13 | MEDIUM | localStorage images | inspirations/patterns data URLs | quota | data loss | blob storage later |
| R14 | MEDIUM | CI test script mismatch | root npm test | quality | CI false |
| R15 | MEDIUM | Duplicate Capacitor identities | two configs | mobile | wrong app shipped | unify |
| R16 | LOW | bak files | *.bak* | clutter | confusion | delete after approval |
| R17 | MEDIUM | “AI” labeling | analyzeDesignInspiration keywords | product | overclaim | rename heuristic |
| R18 | HIGH | Measurement mixing | aliases in 3 layers | fit quality | wrong pattern inputs | explicit mapping layer |

---

# 17. PRESERVE / ADAPT / EXTRACT / REPAIR / REPLACE / DEFER MATRIX

| Module | Decision | Reason | Risk | Dependency |
|---|---|---|---|---|
| Pattern Engine | PRESERVE | Pure deterministic domain | Medium if untested | Design Studio |
| Production Assistant | PRESERVE | Heuristic domain; rename later | Medium | Studio, Orders |
| Design Studio | EXTRACT later; PRESERVE now | IP + canvas; too coupled to rewrite first | High | engines, AppContext |
| Measurement types | ADAPT | Vocabulary useful; mixing must be documented | High | Studio, orders |
| AppContext persistence | ADAPT | Local SoT until backend ready | High | all studio modules |
| Customers UI | REPLACE experience; REPAIR contract | Screen is API-only against stub | High | backend customers |
| Orders UI | ADAPT | Local domain-rich; don't throw away stages UX | High | productionStageService |
| Production Board | REPAIR | Wrong SoT + paths | High | orders API |
| Invoices UI | REPAIR contract / REPLACE chrome | Payments path wrong | High | payments routes |
| Materials UI | PRESERVE local logic; DEFER API | Working local; API client broken | Medium | schema |
| Reports UI | ADAPT | Local reporting.ts is substantial | Medium | SoT |
| Settings / tiers | ADAPT | Simulation OK for UX; not billing | Medium | later Control Center |
| Auth/license/sync | DEFER + REPAIR backend separately | Incomplete, unwired | High | schema users/licenses |
| server.ts stub | REPLACE | Blocks truth | Critical | app.ts |
| apps/api | DEFER | Platform Control Center candidate | High | packaging |
| Capacitor | DEFER | After API origin strategy | Medium | web build |
| Billing/Stripe | DEFER | ABSENT (alerts only) | — | — |
| 3D fitting | DEFER | No 3D stack; 2D outlines only | — | richer garment geometry |
| Control Center | DEFER | Identify config only | — | — |
| garmentLogic.ts | REPLACE later (dead) | unused | Low | — |
| FeatureGate | ADAPT | UX pattern useful; prices conflict | Medium | tiers.ts vs FEATURE_COMPARISON |

---

# 18. MODULE-BY-MODULE ALIGNMENT MATRIX

Legend: GREEN = verified aligned · YELLOW = partial · RED = broken/misaligned · GREY = not implemented

| Domain Module | Frontend | Backend | Database | Contract | Overall |
|---|---|---|---|---|---|
| 1. Authentication | GREY | RED empty/orphan | YELLOW tables exist | GREY | **RED** |
| 2. User Management | GREY | RED | YELLOW users | GREY | **RED** |
| 3. Customer Management | YELLOW API UI | YELLOW unmounted | RED no migration | RED vs live | **RED** |
| 4. Measurement Management | YELLOW local rich | GREY | GREY | GREY | **YELLOW** (FE only) |
| 5. Garment Management | YELLOW in orders/studio | YELLOW JSON cols unwired | RED | RED | **YELLOW** |
| 6. Design Studio | YELLOW local | YELLOW orphan PATCH | GREY | RED unused | **YELLOW** |
| 7. Pattern Engine | YELLOW untested pure | GREY | GREY | n/a | **YELLOW/GREEN domain** |
| 8. Orders | YELLOW local | YELLOW unmounted | RED | RED | **RED** |
| 9. Production | YELLOW split | YELLOW service | YELLOW migration blocked | RED paths | **RED** |
| 10. Fabric / Materials | YELLOW local | YELLOW unmounted | RED | RED + broken client | **YELLOW** |
| 11. Inventory | same | same | RED | RED | **YELLOW** |
| 12. Financial Records | YELLOW invoices API | YELLOW unmounted | RED | RED payments path | **RED** |
| 13. Reports | YELLOW local | YELLOW unmounted | RED | unused client | **YELLOW** |
| 14. File Management | GREY (data URLs) | GREY | GREY | GREY | **GREY** |
| 15. Notifications | GREY | GREY | GREY | GREY | **GREY** |
| 16. Settings | YELLOW mixed | YELLOW unmounted | RED | YELLOW | **YELLOW** |
| 17. Mobile Integration | YELLOW wrapper | GREY | GREY | RED localhost | **RED** |
| 18. Offline Synchronization | GREY UI | RED orphan | YELLOW sync_changes | GREY | **RED** |

No module is GREEN end-to-end.

---

# STATE MANAGEMENT AUDIT

Systems in use: React `useState`/`useMemo`/`useEffect`, one AppContext, localStorage, ad-hoc fetch (no cache library). No Redux, Zustand, React Query, IndexedDB.

| Domain | Current SoT | Problem | Future boundary |
|---|---|---|---|
| Session view | React memory | lost on refresh (starts dashboard) | router |
| Workspace/tier | localStorage + mock | simulated | server entitlements |
| Customers | **HTTP** (Customers screen) vs **local** (Dashboard names, studio) | split | one SoT |
| Orders | localStorage | Production Board uses HTTP | one SoT |
| Invoices/payments | HTTP | stub | backend after schema |
| Measurements | localStorage | no server | domain package + API later |
| Studio drafts | extra localStorage key | not in AppContext persist | session DTO |
| Materials | localStorage | API unused/broken | local until schema |
| Auth | none | — | defer |

---

# TESTING & VERIFICATION AUDIT

| Domain | Tests exist | What is tested | Confidence |
|---|---|---|---|
| Frontend | **None** | — | LOW |
| Pattern Engine | None | — | LOW despite reading as coherent |
| Production Assistant | None | — | LOW |
| Design Studio | None | — | LOW |
| Backend CRUD | None | — | LOW |
| Auth | `tests/*.js` present; `*.ts` empty | unknown if Jest wired to JS | LOW |
| E2E | None | — | NONE |
| CI | build + `npm test` at root | root has no test script | BROKEN |

NO TESTS ≠ features don't work. NO TESTS = cannot mark VERIFIED_WORKING.

---

# CONTROL CENTER READINESS (audit only)

| Category | Current location | Centralization candidate? |
|---|---|---|
| Feature flags / tiers | hardcoded `tierEnforcement` + `config/tiers.ts` | Yes |
| Tenant/workspace | mockData + localStorage | Yes |
| Pricing | two conflicting tables + alert() | Yes (after single source) |
| Billing | ABSENT | Yes later |
| Subscription entitlements | simulated FeatureGate | Yes |
| Platform settings | `app_settings` kv (unmounted) + local workspace | Yes |
| AI config | none (heuristics in code) | Maybe |
| Integrations | none | Later |
| Analytics | events table unused | Yes |
| License device limits | env vars unused | Yes |
| API origin | env + hardcoded | Yes |

**Do not implement Control Center now.**

---

# BILLING / COMMERCIAL READINESS

| Piece | Classification |
|---|---|
| Subscription models | PLACEHOLDER (tier simulation) |
| Plan definitions | PARTIAL (conflicting prices/currency) |
| Usage tracking | ABSENT (events table unused) |
| Entitlement logic | PARTIAL frontend only |
| Payment infrastructure (Stripe etc.) | ABSENT |
| Invoices (customer job invoices) | PARTIAL (ops invoices, not SaaS) |
| Transaction records | PARTIAL local/API stub |

SaaS billing: **ABSENT**. Shop invoices: **PARTIAL**.

---

# FUTURE 3D EXPERIENCE READINESS (audit only)

Current: 2D canvas silhouettes + 2D pattern polygons. No three.js, glTF, morph targets, or avatar.

| Need for 3D | Current | Gap |
|---|---|---|
| Measurement completeness | optional sparse fields | missing ease, posture, units |
| Garment geometry | 2D outlines | no 3D mesh, no panel 3D |
| Pattern outputs | 2D points | no seam network, no grading |
| Garment parameters | type + fitType strings | no ease table per size |
| Customer profile | garment measurements blob | no body scan, no photos structured |

**CURRENT IMPLEMENTATION ≠ FUTURE 3D.** Preserve measurement vocabulary; do not pretend it is 3D-ready.

---

# SECTION G — DOMAIN ENGINE PROTECTION SUMMARY

| Engine | Tag |
|---|---|
| Pattern Engine | **PROTECTED / TRUSTED (untested) / PURE** |
| Measurement System | **PARTIAL / UI-COUPLED / DANGEROUS if renamed ad hoc** |
| Design Studio | **PROTECTED / PARTIAL / UI-COUPLED** |
| Production Logic (assistant) | **PROTECTED / PARTIAL / HEURISTIC** |
| Production Logic (stages backend) | **PROTECTED / PARTIAL / UNMOUNTED** |
| Fabric Intelligence | **PARTIAL / FRONTEND** |

---

# SECTION K — READINESS SCORECARD

| Area | Score /10 | Confidence | Reason |
|---|---|---|---|
| Frontend Architecture | 4 | HIGH | Works as SPA; no router; mega-components; dual SoT |
| Backend Architecture | 2 | HIGH | Stub is live; real app unmounted; empty files |
| API Contracts | 2 | HIGH | Systematic mismatch |
| Database | 2 | HIGH | Split schema, missing business tables |
| Domain Logic | 7 | MEDIUM | Strong FE engines, untested, not packaged |
| Offline Architecture | 2 | HIGH | localStorage ≠ offline-first |
| Mobile Architecture | 2 | HIGH | wrapper + localhost |
| Design Studio | 7 | MEDIUM | Substantial, coupled, untested |
| Pattern Engine | 7 | MEDIUM | Coherent pure code, limited garments, no tests |
| Measurement System | 5 | MEDIUM | Rich fields, mixed layers |
| Testing | 1 | HIGH | essentially none |
| Configuration | 3 | HIGH | conflicting ports, env names, CORS LAN IP |

---

# FINAL GO / NO-GO DECISION

## OPTION B — CONDITIONAL GO

**Frontend architecture work for StitchFlow Studio MAY begin**, with these hard conditions:

### Allowed now

- Rebuild the **experience layer** (shell, navigation, visual system).  
- Consume Pattern Engine and Production Assistant **as libraries**, without changing formulas.  
- Treat Design Studio as a protected island: wrap, don't rewrite, until extraction design is approved.  
- Use fixtures / localStorage as the integration stand-in.

### Forbidden until backend repair

- Treating `http://localhost:5000` as the platform API.  
- Reimplementing pattern or production heuristics in the new UI.  
- Assuming customers/orders/invoices share one database.  
- Shipping Capacitor against localhost.  
- Implementing Control Center, billing, or 3D.

### Backend/API repairs required before integration

See Rebuild Boundary items 1–8.

### Why not Option A

Contracts are not sufficiently implemented in the running process. Alignment is documented, not operational.

### Why not Option C

Domain engines **are** identifiable and mostly isolated as TypeScript modules. The experience rebuild can proceed **without** destroying them if the boundary above is enforced.

---

# STOP CONDITION

Audit complete.

No frontend rebuild started.  
No backend modified.  
No refactors.  
No deletions.

Next implementation phase requires explicit owner approval of this report.

---

## Evidence index (primary files)

- `apps/web/src/App.tsx` — view switcher  
- `apps/web/src/context/AppContext.tsx` — local SoT  
- `apps/web/src/shared/lib/db.ts`, `storageKeys.ts`  
- `apps/web/src/components/DesignStudio.tsx`  
- `apps/web/src/modules/services/patternEngine.ts`  
- `apps/web/src/modules/services/productionAssistant.ts`  
- `apps/web/src/shared/utils/api.ts`  
- `apps/backend/src/server.ts` — live stub  
- `apps/backend/src/app.ts` — unmounted API  
- `apps/backend/src/config/initDb.ts`  
- `apps/backend/migrations/migrations/*.sql`  
- `apps/backend/src/services/productionStageService.ts`  
- `apps/api/src/routes/index.ts`  
- `docs/api.md`  
- `apps/web/src/shared/api/materials.ts` — corrupted  
- `apps/web/src/types.ts` — corrupted  

END OF AUDIT.
