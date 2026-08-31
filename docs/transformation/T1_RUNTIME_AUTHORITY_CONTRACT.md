# T1 Runtime Authority Contract

| Field | Value |
|---|---|
| Status | **IMPLEMENTED with STOP D constraint** — boot path live; business CRUD remains unmounted by default |
| Date | 2026-08-31 |
| Derived from | T1 forensic report + T0 runtime map + ADR-009 / ADR-010 / ADR-011 |
| Classification | Target law for T1 implementation **only after Owner authorization** |

Implementation (2026-08-31) established `server.ts` → `createApp()`. Owner implementation prompt **STOP D** forbids exposing previously unmounted CRUD without an auth decision. Therefore business routers are **not** mounted unless `MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES=true`.

Application factory: `createApp()` in `app.ts` (replaces a single `export const app` that imported all routers at load).

---

## 1. Authoritative chain (target)

```
Developer / Deployment
        ↓
Official startup command
  dev:  npm run dev:backend  →  tsx watch src/server.ts
  prod: npm start            →  node dist/server.js
        ↓
Authoritative entrypoint: apps/backend/src/server.ts
        ↓
Authoritative application: apps/backend/src/app.ts  (createApp)
        ↓
Mounted middleware (cors, helmet, json, request log)
        ↓
Always: GET / GET /health GET /ready
Opt-in: business routers (default off)
        ↓
Route handlers / productionStageService (unmodified)
        ↓
Infrastructure (pg Pool IF DATABASE_URL present)
```

There must be no second `listen()` for the product API.

---

## 2. What is not authoritative

| Candidate | T1 rule |
|---|---|
| Stub JSON handlers currently inside `server.ts` | Must not remain the product API once composed |
| `apps/api` | Preserve, isolate, defer. Not the T1 runtime |
| `proxy-server.js` | Not official. Do not wire into npm scripts in T1 unless required |
| Docker compose postgres | Infrastructure, **not** product SoT |
| Vite `:5173` | Frontend only |

---

## 3. Port and configuration ownership (ADR-011)

| Variable | Authority |
|---|---|
| `PORT` | Process listen port. **Default 5000** to match `VITE_API_BASE_URL` fallback (smallest web change) |
| `DATABASE_URL` | Required only for handlers that query. Missing URL must not be papered over with stub JSON |
| `CORS_ORIGIN` | Replace hardcoded LAN IP when implementation is authorized |
| `NODE_ENV` | Process mode |
| `VITE_API_BASE_URL` | Frontend → authoritative API. Prefer **one** name; `VITE_API_URL` is drift (ADR-010) — do not add a third |
| JWT / Redis | Documented; **not** activated as a new auth/queue architecture in T1 |

Do not hardcode `192.168.100.4` in new code.

---

## 4. Health vs readiness

| Endpoint | Meaning | Must not |
|---|---|---|
| `GET /health` | **Liveness** — process is running | Claim DB, auth, or product SoT |
| `GET /ready` | **Readiness** — HTTP application is mounted and can accept requests | Fake `{ db: true }` without a real check |

If a DB check is included on `/ready`, report actual connectivity. Omit DB rather than lie.

`app.ts` already has `GET /health` `{ status: 'ok' }`. Stub `server.ts` does **not**.

---

## 5. Route mounting authority

**Owner of the route table:** `app.ts` `app.use(...)` declarations.

T1 implementation must not add a parallel stub table for the same paths.

T1 implementation must **not** redesign the API (no new `/api/v1` prefix unless Owner later requires it). Frontend has no `/api` prefix.

Known contract debt (ADR-010) **deferred** unless blocking boot:

- `/orders/:id/stages` vs `/production-stages`
- `/invoices/:id/payments` vs `/payments`
- missing GET `/invoices/:id`, DELETE `/customers/:id`

Fixing those is **not** required to establish a single process. Record them; do not expand T1 into a contract rewrite unless Owner says so.

---

## 6. Database initialization boundary

T1 **does not**:

- claim PostgreSQL is product SoT
- invent a complete migration set
- call `initDb()` as a hidden schema
- add the missing `scripts/run-migrations.js` as a fake success path without a real migrator

T1 **does** (when authorized): document that handlers that import `db.ts` need `DATABASE_URL`, and that schema gaps will 500 (T0 R3).

---

## 7. Middleware ownership

`app.ts` already owns cors, helmet, json, access log.

T1 must not add JWT/auth middleware as a new identity platform.

Empty `apps/backend/src/middleware/*.ts` (0 bytes) are **not** mounted. Do not treat them as live.

---

## 8. Error and logging boundary

Keep existing `app.ts` per-request console log. Do not introduce a new observability stack in T1.

JSON 4xx/5xx from existing routers stay as-is.

---

## 9. Frontend runtime target

Web continues to call **the single backend listen port** with no `/api` prefix.

T1 may set/document `VITE_API_BASE_URL` only if the listen port changes.

T1 must **not** redesign navigation, Studio, or Design Studio.

---

## 10. Protected intelligence

`productionStageService.ts` may execute **unchanged** if order routes are mounted.

Pattern Engine, Production Assistant, Design Studio, measurement vocabulary: **no edits**.

---

## 11. Minimum implementation (authorized later)

1. `server.ts` imports `{ app }` from `./app` and `listen`s.
2. Isolate current stub handlers out of the live path (preserve file/history; do not “fix” ADR-009 by deleting `app.ts`).
3. `PORT` from env, default 5000.
4. Ensure `GET /health` and `GET /ready` on the live process.
5. Align Docker CMD with the same entry (`dist/server.js` after tsc) **if** `server.ts` is the composition root — no second CMD.
6. README/runtime map update as **new** T1 docs, not a silent T0 rewrite.

Anything beyond this is out of T1.

---

## 12. Success questions (must be answerable after implementation)

1. What starts the backend? → `npm run dev:backend` / `npm start`
2. Which file is the entrypoint? → `src/server.ts`
3. Which app object is authoritative? → `createApp()` in `src/app.ts`
4. Which routes are mounted? → `/`, `/health`, `/ready` always; business CRUD only if `MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES=true`
5. Which runtime does the web call? → `VITE_API_BASE_URL` or `http://localhost:5000`
