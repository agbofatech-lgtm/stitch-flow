# Laptop setup

## Requirements

| Tool | Required |
|---|---|
| Node.js | 20+ (`engines.node` on root package.json) |
| npm | 10+ (workspaces) |
| Git | any recent |
| PostgreSQL 16 | **optional** — Postgres is **NOT VERIFIED**. App runs without it. |
| Redis 7 | **optional** — queues not required for atelier UI |

OS: Linux / macOS / Windows (WSL recommended on Windows).

## Install

```bash
git clone https://github.com/agbofatech-lgtm/stitch-flow.git
cd stitch-flow
git checkout arena/01a05677-stitch-flow
git pull origin arena/01a05677-stitch-flow
npm install
cp .env.example .env
```

Edit `.env` locally. Names only in git. Do not paste production keys.

Frontend Vite vars: `VITE_API_BASE_URL` / `VITE_API_URL` default to `http://localhost:5000` if unset (`apps/web/src/shared/utils/api.ts`).

## Run (development)

Terminal A:

```bash
npm run dev:backend
```

Expect: `StitchFlow authoritative runtime listening on http://0.0.0.0:5000`

Terminal B:

```bash
npm run dev:web
```

Expect: Vite on `http://localhost:5173` (host `0.0.0.0`).

Business CRUD (`/customers`, `/orders`, …) is **not mounted** unless `MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES=true`. Default is false (T1). The web app still uses AppContext / T2 stores for many rooms.

## Production-style local

```bash
npm run build
npm start
```

`npm start` runs `node dist/server.js` **inside** `apps/backend` (requires the backend build). Frontend static files are **not** served by that process — use `npm --workspace=apps/web run preview -- --host 0.0.0.0` after `npm --workspace=apps/web run build`.

## What this repo is not

- Not a live PSP
- Not a verified Postgres production
- Not a 3D product
- Not an API-platform product
