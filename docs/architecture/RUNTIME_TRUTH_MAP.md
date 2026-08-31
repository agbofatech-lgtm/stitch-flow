# T0.3 — RUNTIME TRUTH MAP

**Stage:** T0  
**Date:** 2026-08-31  
**Question this document answers:** Which process is running, and which process is only sitting in the tree?

---

## 1. PROCESS MAP (FACT)

```
DEVELOPER
   │
   ├── npm run dev:web ──────────────► Vite  :5173
   │                                     │
   │                                     ├── React App (App.tsx)
   │                                     └── fetch(VITE_API_BASE_URL || http://localhost:5000)
   │                                                     │
   └── npm run dev:backend ──► tsx watch src/server.ts :5000
                                     │
                                     └── HARDCODED JSON (no DB)

NOT STARTED BY THOSE SCRIPTS
   ├── apps/backend/src/app.ts          Express CRUD + pg
   ├── apps/api (no package.json)       Auth/license/sync fragments
   ├── proxy-server.js :5174            static dist + /api → :5000
   └── docker compose api :3000         Dockerfile path, unused by npm scripts
```

---

## 2. ENTRYPOINTS

| Runtime | Entry file | How started | Port | DB | Auth | Status |
|---|---|---|---|---|---|---|
| Web SPA | `apps/web/src/main.tsx` → `App.tsx` | `npm run dev:web` | 5173 | no | no | FACT: product UI |
| Backend live | `apps/backend/src/server.ts` | `npm run dev:backend` / `npm start` after tsc | **5000 hardcoded** | no | no | FACT: stub authority |
| Backend real | `apps/backend/src/app.ts` | **no script** | would use `env.PORT` (3000) **if composed** | pg Pool | no | FACT: unmounted |
| Auth API | `apps/api/src/routes/index.ts` | none | n/a | intended pg | JWT intended | FACT: orphan |
| Proxy | `proxy-server.js` | `node proxy-server.js` (undocumented in package.json) | 5174 | no | no | FACT: unused by workspaces |
| Mobile WebView | Capacitor loads web dist | Android Studio / cap | n/a | localStorage | no | PARTIAL |
| CI | GitHub Actions | push/PR to main | n/a | postgres:16 service | test secrets | `npm test` at root **undefined** |

---

## 3. FRONTEND → API BINDING (FACT)

`apps/web/src/shared/utils/api.ts`:

```
API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
```

No `Authorization` header. No `/api` prefix. No `/v1` prefix.

Second env name `VITE_API_URL` used by materials and reports clients.

**Contract implication:** even if `app.ts` were started on port 3000, the frontend would still call 5000 unless env is set.

---

## 4. LIVE STUB SURFACE (`server.ts`)

| Method | Path | Body |
|---|---|---|
| GET | `/` | text `API running` |
| GET | `/dashboard/summary` | `{ totalRevenue, totalOrders, totalCustomers }` hardcoded |
| GET | `/orders` | `[{ id, amount, status, date }]` |
| GET | `/invoices` | `[{ id, amount, status, date }]` |
| GET | `/dashboard/payments-analytics` | `{ totalPaid, totalPending, weeklyData }` |
| GET | `/settings/workspace-members` | `[]` |
| GET | `/customers` | `[]` |
| GET | `/settings` | `{ workspace_profile: { name, defaultCurrency: "GHS" } }` |

No POST/PUT/DELETE. No `/health`. No production-stages. No materials.

CORS origins (FACT): `http://localhost:5173`, `http://localhost:5174`, `http://192.168.100.4:5173`, `http://127.0.0.1:5173`.

---

## 5. UNMOUNTED `app.ts` SURFACE (CODE EXISTS)

Mounted at process root (not `/api/v1`):

- `/dashboard/summary`, `/dashboard/payments-analytics`
- `/customers`, `/customers/:id/orders`
- `/orders`, `/orders/:id`, `/orders/:orderId/production-stages...`, `PATCH /orders/:id/studio-session`
- `/invoices`
- `/payments`, `/payments/invoice/:invoiceId`
- `/materials/fabrics`, `/materials/usages...`
- `/reports/...`
- `/settings`, `/settings/workspace-members`
- `/health`

No version prefix. No auth middleware. SQL executed in route files.

---

## 6. DOCUMENTED vs RUNNING (DRIFT)

`docs/api.md` describes `/api/v1/health`, `/api/v1/auth/*`, licenses, sync.

FACT: neither live `server.ts` nor `app.ts` mounts `/api/v1`.

---

## 7. MOBILE RUNTIME

| Config | appId | appName | webDir | scheme |
|---|---|---|---|---|
| Root `capacitor.config.ts` | `com.tailorstudio.app` | Tailor Studio | `dist` | androidScheme https, mixed content |
| `apps/mobile/capacitor.config.ts` | `com.stitchflow.app` | StitchFlow | `../web/dist` | androidScheme http, cleartext true |

FACT: two identities. UNKNOWN: which one a release build would use.

API on device: localhost:5000 will not reach a host machine API unless reverse-proxied. LAN IP in CORS is development leakage.

---

## 8. HEALTH

| Check | Live stub | app.ts | apps/api |
|---|---|---|---|
| GET `/health` | **missing** | `{ status: 'ok' }` | `/health` via router |
| GET `/ready` | missing | missing | missing |
| Frontend `ApiHealthCheck` | calls `/health` | unused component | — |

T1 health contract (`GET /health` and `GET /ready`) is **not** satisfied by the running process.

---

## 9. T0 STATEMENT OF RUNTIME AUTHORITY

**Locked fact:** Under repository npm scripts, backend authority is the **stub** `server.ts`.

**Locked fact:** `app.ts` is not authority until a composition root starts it.

**Locked fact:** `apps/api` is not authority.

T1 mission is to change this. T0 does not change this.

---

**T0.3 complete.**
