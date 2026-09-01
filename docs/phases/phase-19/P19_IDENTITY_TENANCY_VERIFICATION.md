# P19.2+P19.3 Verification

## New tests

`apps/backend/tests/identityTenancy.p19.test.ts` — **9 passed** (2026-09-01).

Covered: register bootstrap, login valid/invalid, missing/malformed/invalid/expired token, inactive identity, tenant context, workspace ≠ tenant, suspended membership, cross-tenant read/mutation, X-Tenant-Id injection, missing context.

## Protected hashes (UNCHANGED)

| Asset | SHA-256 |
|---|---|
| patternEngine.ts | `d02000d6b8e96b2665bde245056367d5c72f05d3447893469ca91e84510e16dc` |
| productionAssistant.ts | `140a646d2bfa933e47951169b953f29bef108b6e0e48dd8dfe99a3c66ad571c4` |
| shared/types/index.ts | `424ef6181705cffcbcbbf7008ddf85c61b65cd3a820bb167d1fb4033eee3d0d9` |
| DesignStudio.tsx | `5059c0db5633d9340793e620863cfc521ee8118a2f3188ead9082ee2c1ae783b` |

## P13–P18 regression (re-run)

golden-path 1, intelligence 12, composition 19, execution 13, domain 69, tailoring 8, design 7, studio 4, workflow 8, experience 8, persistence 10 — **pass**. deterministic suite pass (exit 0).

## Performance

Authentication / membership / tenant resolution overhead: **NOT MEASURED**.

## Claims that are **not** made

Pentest, SOC2, ISO 27001, enterprise IAM, RLS, Postgres IAM, product login UI, billing, entitlements enforcement.
