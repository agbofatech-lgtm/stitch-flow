# 02 — Runtime Authority Map

**Date:** 2026-09-01  
**Question:** Which process actually runs, and what does the product call?

```
CODE EXISTS
≠ ROUTE IS MOUNTED
≠ ROUTE IS AUTHORITATIVE
≠ ROUTE IS USED BY THE PRODUCT
```

---

## How to start (FACT)

| Script | What starts | Port |
|---|---|---|
| `npm run dev:web` | Vite → `apps/web/src/main.tsx` | 5173 |
| `npm run dev:backend` | `tsx watch apps/backend/src/server.ts` → `createApp()` | `PORT \|\| 5000` |
| `npm start` (root) | `node apps/backend/dist/server.js` | **stale dist risk** |
| Docker backend | `CMD node dist/server.js`, EXPOSE 3000 | **stale dist risk** |

Authoritative **source** entrypoint: `apps/backend/src/server.ts` composing `apps/backend/src/app.ts`.

Retired: `apps/backend/src/server.stub.ts` (T0 hardcoded JSON). Not started by npm scripts.

Orphaned: `apps/api` — no package.json, not a workspace, never executed.

Unused convenience: `proxy-server.js` (not in package.json scripts). Vite already proxies `/auth`, `/platform`, `/control`, `/health`, `/ready` to `127.0.0.1:5000`.

---

## Web application (FACT)

```
USER
  ↓
Vite :5173
  ↓
main.tsx
  ├─ startDataAuthorityRuntime()     T2 IndexedDB or memory; shop push blocked
  └─ App
       └─ AppProvider (AppContext + localStorage)     TRANSITIONAL shop SoT
            └─ SplashScreen
                 └─ WorkflowProvider
                      └─ StudioShell          no URL router
                           ├─ Atelier Home
                           ├─ Clients → Customers.tsx          HTTP /customers
                           ├─ Measurements → MeasurementWorkspace   domain / T10
                           ├─ Design → DesignStudioFrame → DesignStudio
                           ├─ Production → ProductionBoard.tsx     HTTP /orders
                           ├─ Business → Orders | Materials | Invoices | Reports
                           ├─ Settings overlay
                           └─ Control Center → /auth + /control (proxied)
```

Navigation is `AppContext.currentView` plus StudioShell workspace ids (`command`, `clients`, `measurements`, `design`, `production`, `business`). There is **no React Router**.

---

## Backend application (FACT)

```
server.ts
  PORT = process.env.PORT || 5000
  mountBusinessRoutes = MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES === 'true'
  ↓
createApp()
  CORS origin: true
  Helmet CORP cross-origin
  JSON body
  GET /  GET /health  GET /ready
  /auth        always
  /platform    always (IAM + commercial)
  /control     always (operator)
  if mountBusinessRoutes:
    /dashboard /customers /orders /invoices
    /payments /materials /reports /settings
```

Default `.env.example`: `MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES=false`. Shop CRUD is **unmounted**. `/ready` reports `postgres: not-verified`, `billingProvider: deferred`, persistence `file` only if `PLATFORM_DATA_PATH` is set else `memory`.

`src/config/env.ts` still defaults PORT 3000. Live `server.ts` does not use that file.

---

## Screen → data path (FACT)

| Surface | Persistence / API | Live default backend |
|---|---|---|
| Design Studio | AppContext + `stitchflow:design-studio:drafts` | none |
| Orders.tsx | AppContext localStorage; stage HTTP `/orders/:id/stages` (**wrong path**) | 404 / soft fail |
| Materials, Reports | AppContext localStorage | none |
| Customers.tsx | HTTP `/customers` (no auth header) | **unmounted → fail** |
| Invoices.tsx | HTTP `/invoices`, payments | **unmounted → fail** |
| Production Board | HTTP `/orders`, `/customers`, `/orders/:id/production-stages/...` | **unmounted** |
| Dashboard API bits | HTTP `/dashboard/*` + local fabrics | **unmounted** |
| Settings | HTTP `/settings` **and** AppContext | mixed; HTTP unmounted |
| Measurement workspace | AppContext profiles + T2 freeze APIs | T2 local |
| Workflow panel | T3 gateways + AppContext; T2 snapshot optional | local |
| Control Center | `/auth/login`, `/control/*` via Vite proxy | **mounted** |
| T2 sync push | `blockedBusinessApiTransport` | never hits shop CRUD |

`shared/utils/api.ts`: `VITE_API_BASE_URL || http://localhost:5000`. No `Authorization`. No `/api` or `/v1` prefix.

Control Center uses same-origin `/auth` and `/control` (proxy). Bearer token.

---

## `src` versus `dist` (FACT / trap)

`apps/backend/package.json` `start` = `node dist/server.js`.

Checked-in `dist/` has been observed to import modules and mount surfaces (`/ai`, `/crm`, `/api/v1`, `initDb.verifySchema`) that **do not exist in current `src`**. Until `dist` is rebuilt from current `src`, **`npm start` is not the same process as `npm run dev:backend`.**

This pack does not rebuild `dist`.

---

## Mobile (FACT)

Two Capacitor identities:

| File | appId | appName |
|---|---|---|
| Root `capacitor.config.ts` | `com.tailorstudio.app` | Tailor Studio |
| `apps/mobile/capacitor.config.ts` | `com.stitchflow.app` | StitchFlow |

Which one a release build would use is **UNKNOWN** without a named build pipeline. Device `localhost:5000` will not reach a host API.

---

## Nested duplicate (FACT)

Untracked `stitch-flow/` is an older copy: nested `server.ts` is the T0 stub; nested `app.ts` mounts shop CRUD unconditionally; no `src/platform/`. It is **not** in root workspaces. Not runtime authority.
