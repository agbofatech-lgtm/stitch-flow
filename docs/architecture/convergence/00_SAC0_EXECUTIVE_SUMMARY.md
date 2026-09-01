# SAC-0 Executive Summary

**Baseline HEAD:** `4be89abb05e51f65e3a0d032019537b777bf7b45`  
**Branch:** `arena/01a05677-stitch-flow`

## Primary question

What exact migration architecture allows StitchFlow to converge live Studio, trusted tailoring, local-first data, authenticated backend, and future cloud persistence **without rewriting protected assets**?

## Answer (FACT + RECOMMENDATION)

A **façade-and-redirect** programme, not a rewrite:

1. **Keep Design Studio UX and canvas on Path A** for live typing (T7 identity re-export → protected engines).
2. **Redirect authoritative computation at the T7 adapter / save seam** onto Path C (freeze MeasurementVersion → GarmentSpecificationVersion → GarmentCompositionVersion → `executeTrustedTailoring` → T10 wrap → same engines).
3. **Keep shop records on AppContext/localStorage until dual-read onto T2 repositories** (T2 already exists; remote push is **intentionally blocked** because T1 shop CRUD is unauthenticated and unmounted).
4. **Do not set `MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES=true` as architecture.** Authenticate shop routes with P19 `requireIdentity` + `requireTenantContext`, then add tenant-scoped persistence.
5. **PostgreSQL is a later authority**, after schema validation. Platform (`006`) and shop (`initDb` / nested migrations) must not be treated as one applied database.
6. **3D remains a consumer** of Path C outputs (ADR-005). Not an SAC implementation stage.

**STOP-A:** not triggered — T10 already reaches engines without copying formulas.  
**STOP-B:** not triggered — T7 already extracted Studio imports; redirect is an adapter, not a Studio rewrite.  
**STOP-D:** owner must still decide shop-record ownership (Tenant vs Workspace). Platform already implements Tenant ≠ Workspace in code; owner register boxes remain unticked.

## Lowest-risk sequence (RECOMMENDATION)

```
CURRENT (split authorities)
  → SAC-1  Studio save/explicit-generate → Path C artifacts (UX stays)
  → SAC-2  AppContext dual-read → T2 repositories (no data delete)
  → SAC-3  Authenticated tenant-aware shop API (never the unauth flag)
  → SAC-4  PostgreSQL for verified domains
  → SAC-5  Offline outbox certification against authenticated API
```

Phase 20 (public API platform) and 3D are **outside SAC**.

## Implementation authorization

**NOT GRANTED.** SAC-1 is **LOCKED** pending owner review of this pack and the decisions in [`14_OWNER_DECISIONS_REQUIRED.md`](./14_OWNER_DECISIONS_REQUIRED.md).
