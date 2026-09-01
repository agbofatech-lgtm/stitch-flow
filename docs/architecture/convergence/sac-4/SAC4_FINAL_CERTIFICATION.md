# SAC-4 Final Certification

PostgreSQL is the verified persistence path for authenticated `/shop` domains when `SHOP_DATABASE_MODE=postgres`. Platform IAM remains file/memory. Frontend screens, T2 remote sync, SAC-5, 3D, and Phase 20 were not started.

## Baseline

- Branch: `arena/01a05677-stitch-flow`
- HEAD before: `d01ba0b837ae7c32da86bfd6c64f641472ad05ee`
- Implementation: `567c85d704cc18ff794e26842517a31b90e9d724`
- Remote: `https://github.com/agbofatech-lgtm/stitch-flow.git`

## Decision

- Platform PostgreSQL authority: **NO** (Option A, file/memory)
- Shop PostgreSQL authority: **YES** behind `ShopRepository`
- Canonical migrations: `apps/backend/migrations/` active `001` + `007`
- Default `SHOP_DATABASE_MODE=memory`; postgres mode fails closed (no silent fallback)

## Verification (ran)

- Backend `npx jest --runInBand --forceExit` matching `p19|sac3|sac4`: **7 suites, 37 passed**
- `tests/shop.sac3.test.ts`: 7 passed (including restored 403 `SHOP_SCOPE`)
- `tests/shop.sac4.test.ts`: 4 passed against Docker `stitchflow-postgres` `127.0.0.1:5434`
- SAC-1 `npm run test:sac1`: 6 passed
- SAC-2 `npm run test:sac2`: 10 passed
- Backend `tsc --noEmit` and `tsc -p tsconfig.json`: pass
- Frontend `vite build`: pass
- Frontend `tsc --noEmit`: fail — pre-existing `materials.ts` / `reports.ts` / `types.ts`, not SAC-4
- Protected git-blob hashes unchanged

Live schema after apply: `schema_migrations`, `shop_customers`, `shop_orders`, `shop_trusted_artifacts`. Ledger: `001_init_extensions.sql`, `007_shop_authority.sql`.

## Certification

**PASS**

Known conditions: default remains memory unless postgres is configured; platform stays file/memory; no unknown-schema upgrade path tested; verification used local Docker Postgres 15 on 5434.

SAC-5 LOCKED. 3D LOCKED. Phase 20 LOCKED.
