# Railway pre-flight

## Diagnosis (MODULE_NOT_FOUND class)

**Failure class:** root `package.json` previously had `"main": "index.js"` and **no** `start` script. Nixpacks/Railway at repo root would run `node index.js` or `npm start` → `MODULE_NOT_FOUND` / missing script.

**Why local `npm run dev:backend` hides it:** dev uses `tsx watch src/server.ts` inside `apps/backend`, never `index.js`.

**Correction in this preparation (config only):**

- `"main": "apps/backend/dist/server.js"`
- `"start": "npm --workspace=apps/backend run start"`
- `"engines": { "node": ">=20" }`

Start still requires `npm run build` first so `apps/backend/dist/server.js` exists. `dist/` is gitignored.

## Recommended Railway service (backend)

| Field | Value |
|---|---|
| Repository | `agbofatech-lgtm/stitch-flow` |
| Branch | `arena/01a05677-stitch-flow` (or owner-chosen) |
| Root directory | **repo root** (workspaces) **or** `apps/backend` if using `apps/backend/Dockerfile` |
| Node | 20 |
| Build | `npm install && npm run build` |
| Start | `npm start` (after this prep) |
| Port | `PORT` env (server binds `0.0.0.0`) |
| Health | `GET /health` |

If Root directory = `apps/backend`, use `apps/backend/Dockerfile` (context must include that folder’s `package.json`, `src`, `migrations`). Copying **root** `package.json` into that Dockerfile would still be wrong.

## Frontend

Vite preview/static host is a **separate** service. API URL must be `VITE_API_BASE_URL` at **build** time.

## Env (names only)

`JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `PORT`, optional `PLATFORM_DATA_PATH`, `BILLING_WEBHOOK_SECRET`.  
`DATABASE_URL` does not make Postgres verified.  
Do not set live PSP keys.

## Status

**CONDITIONAL / NOT VERIFIED** — this environment did not deploy to Railway.
