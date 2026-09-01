# Existing API inventory — API PLATFORM NOT STARTED

Authoritative app: `apps/backend/src/app.ts` + `server.ts`. Default **does not** mount business CRUD.

## Always mounted

| Route | Method | Auth | Status |
|---|---|---|---|
| `/` | GET | none | health-ish JSON |
| `/health` | GET | none | ok |
| `/ready` | GET | none | postgres not-verified, billing deferred |
| `/auth/register` | POST | none | IAM register |
| `/auth/login` | POST | none | JWT |
| `/auth/me` | GET | identity | current principal |
| `/platform/context` | GET | identity + tenant | tenant context |
| `/platform/plans` | GET | identity + tenant | plans from store |
| `/platform/entitlements` | GET | identity + tenant | entitlements |
| `/platform/access/check` | POST | identity + tenant | capability check |
| `/platform/billing/checkout` | POST | identity + tenant | adapter port — live PSP deferred |
| `/platform/billing/payments/:id` | GET | identity + tenant | |
| `/platform/billing/subscription` | GET | identity + tenant | |
| `/platform/billing/webhooks/:adapter` | POST | HMAC adapter | not a live PSP |
| `/control/status` | GET | operator | |
| `/control/tenants` | GET | operator | |
| `/control/tenants/:id` | GET | operator | |
| `/control/configuration` | GET | operator | |
| `/control/configuration` | PATCH | operator | |
| `/control/audit` | GET | operator | |
| `/control/billing/provider` | GET | operator | DEFERRED |

## Mounted only if `MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES=true`

`/dashboard`, `/customers`, `/orders`, `/invoices`, `/payments`, `/materials`, `/reports`, `/settings` — **unauthenticated historically**. Default off. Not production-ready tenancy.

## Not an API platform

No public API keys, no versioned partner SDK, no OpenAPI product, no 3D endpoints.

## Measurements / specification / composition / execution / AI

These authorities live in **frontend domain modules** (P13–P17) with T2 repositories, not as first-class backend REST resources in `createApp`.
