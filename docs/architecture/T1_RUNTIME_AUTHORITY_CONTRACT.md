# T1 Runtime Authority Contract (implemented)

Canonical narrative also: [`docs/transformation/T1_RUNTIME_AUTHORITY_CONTRACT.md`](../transformation/T1_RUNTIME_AUTHORITY_CONTRACT.md) (forensic proposal). This file records **what T1 implemented**.

| Item | Value | Kind |
|---|---|---|
| Frontend | Vite React `:5173` | FACT |
| API base | `VITE_API_BASE_URL` \|\| `http://localhost:5000` | FACT |
| Backend entrypoint | `apps/backend/src/server.ts` | IMPLEMENTED |
| Application | `createApp()` in `apps/backend/src/app.ts` | IMPLEMENTED |
| Dev command | `npm run dev:backend` | FACT / VERIFIED |
| Prod command | `npm start` → `node dist/server.js` | FACT (script; tsc not re-run in T1 verification) |
| Port | `PORT` or **5000** | IMPLEMENTED / VERIFIED |
| Health | `GET /health` | VERIFIED |
| Ready | `GET /ready` (`database: not-verified`) | VERIFIED |
| Business CRUD | unmounted unless `MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES=true` | IMPLEMENTED |
| Database path | `db.ts` only if CRUD mounted | FACT |
| Inactive | `server.stub.ts`, `apps/api`, `proxy-server.js` | FACT |

CURRENT FACT ≠ later T2 data authority. Postgres is **NOT IMPLEMENTED** as product SoT.
