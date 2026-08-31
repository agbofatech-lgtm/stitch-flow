# T1 Backend Runtime Map

| Field | Value |
|---|---|
| Date | 2026-08-31 |
| Status | **IMPLEMENTED** for boot authority (T1) |
| T0 map | [`RUNTIME_TRUTH_MAP.md`](./RUNTIME_TRUTH_MAP.md) remains historical current-truth-at-T0 |

Do not rewrite T0. This file is the **T1** runtime map.

---

## Process map (after T1 implementation)

```
DEVELOPER
   │
   ├── npm run dev:web ──────────────► Vite  :5173
   │                                     fetch(VITE_API_BASE_URL || http://localhost:5000)
   │
   └── npm run dev:backend ──► tsx watch src/server.ts
                                     │
                                     ▼
                              createApp()  (apps/backend/src/app.ts)
                                     │
                                     ├── GET /  GET /health  GET /ready   ALWAYS
                                     └── business CRUD routers
                                            ONLY if MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES=true
                                            (default false)
```

Production command (unchanged script): `npm start` → `node dist/server.js` after `tsc` (compiles **server.ts**).

---

## Authority

| Role | File |
|---|---|
| Entrypoint | `apps/backend/src/server.ts` |
| Application | `apps/backend/src/app.ts` `createApp()` |
| Listen | `0.0.0.0` · `PORT` or **5000** |
| Retired stub | `apps/backend/src/server.stub.ts` — **not** started by npm |
| Orphan | `apps/api` — unchanged, unmounted |
| Proxy | `proxy-server.js` — unchanged, unused by npm |

---

## Health

| Method | Path | Proves |
|---|---|---|
| GET | `/health` | process + `app.ts` mounted |
| GET | `/ready` | HTTP app accepts requests; `database: not-verified` (not faked) |

---

## Database

Unchanged from T0: PostgreSQL is **not** product SoT. Default T1 boot does **not** import `db.ts`.
