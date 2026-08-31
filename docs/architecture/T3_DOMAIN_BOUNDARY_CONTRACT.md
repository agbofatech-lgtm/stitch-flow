# T3 Domain Boundary Contract

| Field | Value |
|---|---|
| Date | 2026-08-31 |
| Stage | T3 — Domain Boundary & Intelligence Isolation |
| Doctrine | EXTRACT — DO NOT REWRITE |

## Boundary

```
EXPERIENCE          DesignStudio.tsx (PROTECTED, unedited)
APPLICATION         AppContext (TRANSITIONAL localStorage)
DOMAIN GATEWAY      apps/web/src/domain/*
PROTECTED ENGINES   patternEngine.ts, productionAssistant.ts
STAGE CODES         productionStageService.ts (unmounted, unedited)
INFRASTRUCTURE      T2 repositories (IndexedDB / Memory)
```

New T3 code must enter engines only through `apps/web/src/domain`. Existing Studio/AppContext callers remain on the engines directly. T7 may re-point them after regression.

## Ownership (FACT)

See `apps/web/src/domain/ownership.ts`.

Assignable: pattern draft, production plan heuristics, production stage codes, body/garment measurement, pattern projection, order job, T2 persistence.

**STOP / unassignable:** AI advisory, 3D fitting, SaaS billing, AGBOFA Control Center.

## Non-goals

- No Design Studio rebuild
- No Pattern Engine / Production Assistant formula change
- No unauthenticated CRUD mount
- No new localStorage keys
- No T3 completion tag until Owner Acceptance
