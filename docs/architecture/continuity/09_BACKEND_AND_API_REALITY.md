# 09 — Backend and API Reality

**Date:** 2026-09-01  
**Principle:** a frontend `fetch` does not prove the endpoint is available.

---

## Trees

| Tree | Role |
|---|---|
| `apps/backend/src/server.ts` + `app.ts` | **AUTHORITATIVE source runtime** (`tsx` / `dev`) |
| `apps/backend/src/server.stub.ts` | Retired T0 stub |
| `apps/backend/dist/` | **May be a different compiled app** than current `src` |
| `apps/api` | **ORPHAN** — no package.json, not started |
| Nested `stitch-flow/apps/backend` | Older snapshot, not a workspace |
| `apps/backend/src/routes/index.ts` | Empty, not imported |

`docs/api.md` describes `/api/v1/auth|licenses|sync`. **Neither live `app.ts` nor the stub mounts `/api/v1`.**

---

## Always mounted (default process)

| Method | Route | Client | Auth | Authority | Persistence | Status |
|---|---|---|---|---|---|---|
| GET | `/` | none required | none | runtime banner | n/a | LIVE |
| GET | `/health` | Vite proxy; unused `ApiHealthCheck` | none | health | n/a | LIVE |
| GET | `/ready` | — | none | readiness (honest not-verified fields) | n/a | LIVE |
| POST | `/auth/register` | API only — Control Center UI logs in, does not register | none | P19 identity | file/memory | LIVE |
| POST | `/auth/login` | `platformClient.platformLogin` | none | P19 identity | file/memory | LIVE |
| GET | `/auth/me` | — | Bearer | identity | file/memory | LIVE |
| GET | `/platform/context` | — | Bearer + tenant | IAM | file/memory | LIVE |
| POST | `/platform/records` | — | Bearer + tenant | isolation fixture | file/memory | LIVE |
| GET | `/platform/records/:id` | — | Bearer + tenant | isolation fixture | file/memory | LIVE |
| GET | `/platform/plans` | — | Bearer + tenant | catalog | in-store seed | LIVE |
| GET | `/platform/entitlements` | — | Bearer + tenant | derived | store | LIVE |
| POST | `/platform/access/check` | **not called by atelier FeatureGate** | Bearer + tenant | **commercial law** | derived | LIVE / unused by product UX |
| POST | `/platform/billing/checkout` | — | Bearer + tenant | test checkout | store | LIVE / test adapter |
| GET | `/platform/billing/payments/:id` | — | Bearer + tenant | SaaS payment | store | LIVE |
| GET | `/platform/billing/subscription` | — | Bearer + tenant | subscription | store | LIVE |
| POST | `/platform/billing/subscription/cancel` | — | Bearer + tenant | cancel | store | LIVE |
| POST | `/platform/billing/webhooks/:adapter` | PSP/test | HMAC, **no JWT** | payment confirm | store | LIVE / test |
| GET | `/control/status` | ControlCenter | Bearer + operator | ops | n/a | LIVE |
| GET | `/control/tenants` | ControlCenter | operator | tenancy list | store | LIVE |
| GET | `/control/tenants/:id` | ControlCenter | operator | tenant | store | LIVE |
| GET | `/control/configuration` | ControlCenter | operator | config | store | LIVE |
| PATCH | `/control/configuration` | ControlCenter | operator | `disabledCapabilities` only | store | LIVE |
| GET | `/control/audit` | ControlCenter | operator | last 100 audit events | store | LIVE |
| GET | `/control/billing/provider` | ControlCenter | operator | deferred port | n/a | LIVE / DEFERRED |

No `/api` prefix. Tenant hint: `X-Tenant-Id`.

---

## Mounted only if `MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES=true`

**Default false. No auth middleware on these routers.**

| Method | Route | Product client | Default mounted? | Persistence if mounted |
|---|---|---|---|---|
| GET | `/dashboard/summary` | Dashboard | no | SQL `customers`/`orders` |
| GET | `/dashboard/payments-analytics` | Dashboard | no | SQL |
| GET | `/customers` | Customers, ProductionBoard | no | SQL `customers` (`initDb` never called by live server) |
| GET | `/customers/:id/orders` | customerOrdersApi | no | SQL |
| POST | `/customers` | Customers | no | SQL |
| PUT | `/customers/:id` | Customers | no | SQL |
| GET | `/orders` | ProductionBoard, invoices utils | no | SQL |
| GET | `/orders/:id` | — | no | SQL |
| POST | `/orders` | — | no | SQL |
| PUT | `/orders/:id` | — | no | SQL |
| PATCH | `/orders/:id/studio-session` | **no caller found in forensic pass** | no | SQL |
| GET | `/orders/:orderId/production-stages` | ProductionBoard | no | `productionStageService` |
| POST | `/orders/:orderId/production-stages/:stageCode/transition` | ProductionBoard | no | stage engine |
| POST | `/orders/:orderId/production-stages/:stageCode/note` | ProductionBoard | no | stage engine |
| GET/POST/PUT | `/invoices` | Invoices.tsx | no | SQL |
| GET/POST | `/payments`, `/payments/invoice/:id` | Invoices (client path may be `/invoices/:id/payments` — **contract mismatch**) | no | SQL |
| GET/POST/PUT/DELETE | `/materials/fabrics`, usages | **Materials.tsx does not use** | no | `fabric_records` not in core migrations |
| GET | `/reports/*` | **Reports.tsx uses AppContext** | no | SQL |
| GET/PUT | `/settings`, `/settings/:key` | Settings | no | `app_settings` |
| CRUD | `/settings/workspace-members` | Settings | no | SQL |

Frontend Orders.tsx calls **`/orders/:id/stages`** which is **not** the backend path `/production-stages`. Soft-fails to `[]`.

---

## Present on disk, not mounted

Empty or unused: `adminRoutes`, `eventRoutes`, `featureRequestRoutes`, `healthRoutes` (duplicate; health is on `app.ts`), `licenseRoutes`, `syncRoutes`. Matching empty controllers. `jobs/*.ts` empty. `config/logger.ts` empty.

`apps/api` would mount `/auth`, `/licenses`, `/events`, `/feature-requests`, `/sync`, `/admin` under a never-created app.

---

## Why a frontend call is not proof

Customers.tsx calls `GET /customers`. Live default process does not mount that router → HTTP error. The screen is “wired.” The API is not available. That is T1 by design (STOP D), not an accident of this pack.
