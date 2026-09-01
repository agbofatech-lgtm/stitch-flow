# 01 — Runtime Authority Map (SAC-0)

**FACT.** Complements `docs/architecture/continuity/02_RUNTIME_AUTHORITY_MAP.md`. This file emphasizes *who is allowed to mutate what at runtime*.

## Processes

| Process | Entry | Authority |
|---|---|---|
| Web | `apps/web/src/main.tsx` | Product UX |
| Backend source | `apps/backend/src/server.ts` → `createApp()` | Platform + optional shop |
| Backend `dist` | `node dist/server.js` | **May not match src** — not SAC authority |
| `apps/api` | none | Orphan |
| Nested `stitch-flow/` | untracked | Not authority |

## Mutation authorities at runtime (FACT)

| Action | Who mutates today | Guard |
|---|---|---|
| Pattern geometry on canvas | DesignStudio `useMemo` → T7 `generateStylePattern` | Engine `PatternValidationError` |
| Production plan on canvas/save | DesignStudio → T7 `generateProductionPlan` | Heuristic; always produces a plan |
| Order shop fields | AppContext `updateOrder` → localStorage | None |
| Frozen MeasurementVersion | MeasurementWorkspace explicit freeze → T2 | Completeness on T10 pattern from version |
| Trusted execution | Tests + freeze APIs | Triple-frozen chain |
| Identity / tenant | `/auth` `/platform` | JWT identity-only + server context |
| Control Center | `/control` | Platform operator set |
| Shop HTTP | Unmounted | T1 flag; no auth even if mounted |

## Principle for SAC

```
UX RENDER  ≠  AUTHORITATIVE COMPUTATION
APPCONTEXT  ≠  T2 REPOSITORY
P19 TENANT  ≠  ATELIER workspaceId
MOUNTED ROUTE  ≠  AUTHENTICATED API
```
