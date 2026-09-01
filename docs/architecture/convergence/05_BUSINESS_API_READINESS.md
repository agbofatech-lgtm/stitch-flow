# 05 — Business API Readiness

**ABSOLUTE:** Do not recommend `MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES=true` as production architecture.

## Why routes are unmounted (FACT)

T1 STOP D / T0 R4: previously unmounted CRUD must not be exposed without an owner auth decision. Flag exists as forensic/transitional infrastructure only.

**EVIDENCE:** `app.ts` lazy-imports shop routers only if flag is true. Default `.env.example` false.

## Per-router forensic

| Area | Auth middleware | Tenant isolation | Workspace ownership | DB real? | FE contract | Legacy assumptions | Safe as authenticated API? |
|---|---|---|---|---|---|---|---|
| customers | **none** | **none** | **none** | SQL if pool + tables; `initDb` never called by live server | `ApiCustomer` vs AppContext Customer | Date.now ids possible in older dist | **Not yet** — needs identity + tenant column + contract |
| orders | none | none | none | SQL + JSON columns; production stages FK historically to `orders(id)` | Studio order vs SQL row | PATCH studio-session unused | Not yet |
| production stages | none | none | none | service real; tables in nested migration | path mismatch `/stages` vs `/production-stages` | — | Service rules **protected**; HTTP must match |
| invoices | none | none | none | SQL if created | screen HTTP | — | Not yet |
| payments | none | none | none | SQL | **path mismatch** vs `/invoices/:id/payments` | shop ≠ SaaS | Not yet; keep domain split |
| materials | none | none | none | `fabric_records` not in core migrations | Materials.tsx **does not call** | broken client env `VITE_API_URL` | Not yet |
| reports | none | none | none | SQL | Reports.tsx uses AppContext | — | Derived; not SoT |
| settings | none | none | members CRUD | kv `app_settings` | mixed AppContext | — | Must not become Control Center |
| dashboard | none | none | none | SQL aggregates | mixed | — | Derived |

`requireIdentity` / `requireTenantContext` **exist** on platform routers. They are **not** applied to shop routers.

`query()` uses `pg` Pool from `DATABASE_URL`. Live `createApp` does not require DB unless shop routes load.

## What must exist before shop routes become authenticated, tenant-aware production APIs

**RECOMMENDATION (SAC-3 preconditions):**

1. Owner decision: Tenant vs Workspace as **shop record owner** (see 06 / 14).
2. JWT already identity-only — keep it; resolve tenant server-side (already P19).
3. Add `requireIdentity` + `requireTenantContext` to shop routers — **do not** use the unauth flag.
4. Persist `tenantId` (and maybe `workspaceId`) on shop tables; never trust client tenant header alone (P19 already forbids that for platform).
5. Align HTTP paths and payloads with frontend **or** introduce a contract layer (ADR-010). Fix `/stages` and payments path.
6. Do not use `initDb()` ad-hoc CREATE as production migration.
7. Atelier FeatureGate must not authorize API access.
8. Shop payments remain distinct from SaaS billing.

**STOP-E:** **Not triggered.** Identity runtime exists; shop routes need wiring + schema, not a new IdP.
