# Verification matrix

Suites: `apps/backend/tests/shop.sac3.test.ts`, `apps/backend/tests/shop.sac4.test.ts`.

Ran from `apps/backend`: `npx jest --runInBand --forceExit tests/shop.sac3.test.ts tests/shop.sac4.test.ts` → **11 passed**.

| Requirement | Result | Evidence |
|---|---|---|
| Unauthenticated | 401 | sac3 + sac4 postgres app |
| Invalid token | 401 | sac3 + sac4 |
| Non-member | 403 | sac3 |
| Tenant spoof | 403 | sac3 + sac4 |
| Foreign workspace header | 403 | sac3 + sac4 |
| Cross-tenant read | 403 | sac3 + sac4 (regression fix) |
| Cross-tenant mutation | 403 | sac4 snapshot PUT |
| Ownership injection | ignored | sac3 + sac4 create customer |
| Fresh migration | pass | sac4 ledger + `\dt` |
| Migration re-run | pass | checksum skip |
| Restart persistence | pass | new `Pool` + GET 200 |
| Tenant/workspace persisted | pass | GET after restart |
| Artifact append-only | 405 PUT/PATCH/DELETE | sac4 |
| Artifact fingerprint/payload | preserved | sac4 |
| Invalid stage after persist | 409 | skip sewing after restart |
| `/ready` postgres verified | 200 | sac4 configured boot |
| Postgres mode without URL | throws | sac4 fail-closed |
| Protected engines | unchanged | git blob hashes |
| SAC-1 frontend | 6 pass | `npm run test:sac1` |
| SAC-2 frontend | 10 pass | `npm run test:sac2` |
| Backend tsc | pass | `npx tsc --noEmit -p tsconfig.json` |
| Frontend vite build | pass | `npx vite build` |
| Frontend tsc | fail (pre-existing) | `materials.ts` / `reports.ts` / `types.ts` — not SAC-4 |
