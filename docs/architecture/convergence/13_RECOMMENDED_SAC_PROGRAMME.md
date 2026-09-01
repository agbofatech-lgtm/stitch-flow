# 13 — Recommended SAC Programme (not authorized)

**RECOMMENDATION only. SAC-1 LOCKED.**

## Why this order

Trusted geometry must be identifiable **before** it is synced or stored in Postgres. Shop HTTP must not go live unauthenticated. T2 outbox needs an authenticated remote. 3D and Phase 20 wait.

```
CURRENT
  → SAC-1 Studio → trusted execution (save/explicit generate façade)
  → SAC-2 Shop data → T2 dual-read (no delete)
  → SAC-3 Authenticated tenant-aware shop API
  → SAC-4 PostgreSQL for verified domains
  → SAC-5 Offline sync certification
```

| Stage | Purpose | Preconditions | Protected boundary | Exit criteria |
|---|---|---|---|---|
| SAC-1 | Preserve Studio UX; authoritative save/generate via Path C | Owner review; dual-run fixtures; hashes PASS | No engine formula change; no canvas rewrite | Path C artifacts on explicit save; T7 equality tests still pass; C1 reduced but canvas may remain Path A |
| SAC-2 | AppContext → repository dual-read | SAC-1 freeze ids stable **or** independent if owner splits; T2 STOP 12 lifted by owner | No localStorage mass delete | Dual-read proven; no data loss; T2 still blocked remote |
| SAC-3 | Identity → tenant → auth shop API | Owner OD shop owner; never unauth flag | productionStageService rules unchanged | Authz on shop routes; contracts aligned; 401 without JWT |
| SAC-4 | Postgres authority | Applied migrations verified; backup/rollback; tenant tests; platform vs shop separate | Engines stay in web domain unless later ADR | `/ready` postgres verified for named domains |
| SAC-5 | Outbox → ack | SAC-3 live; conflict policies exercised | none of engines | Idempotent sync certified |

Phase 20 and 3D are **not** SAC stages.
