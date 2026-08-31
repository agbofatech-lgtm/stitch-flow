# T9 Implementation Boundary

**Status:** IMPLEMENTED for the authorized wrap/re-point slice. Owner ACCEPT of implementation is **PENDING**. T9 tag is **NOT CREATED**.

## T9 vs Phase 13+

| In T9 (if later authorized) | Not T9 — Phase 13–16 | Locked — 17–19 |
|---|---|---|
| Re-point remaining engine callers (jobSheet, AppContext) through existing T3/T7 wrappers **with equality tests** | New structured measurement product features | AI tailoring |
| Contract fabric estimate / cutting / sewing / fit-risk as named derived outputs without changing numbers | New garment/pattern intelligence beyond current engines | 3D / virtual fitting |
| Document/map duplicate garment-type maps; do not silently merge | Completing Trusted Deterministic Tailoring Core | Billing / Control Center |
| PDF/job-sheet fixtures before any export change | New calculation libraries | New backend runtime |

## Exact boundary

T9 may **observe, wrap, test, and formally contract** existing deterministic calculations.

T9 must **not** replace Pattern Engine or Production Assistant mathematics.

T9 must **not** redesign Design Studio.

T9 must **not** introduce new localStorage.

T9 must **not** bypass T2 repositories for new domain writes.

T9 must **not** bypass T3 vocabulary / ownership.

T9 must **not** mount unauthenticated business CRUD.

T9 must **not** silently change measurement semantics or canonical names.

## Regression if implementation is later authorized

Suites that must stay green: persistence, domain, experience, studio, workflow, design.

Any protected-engine byte change or unexpected numeric drift: **STOP**.
