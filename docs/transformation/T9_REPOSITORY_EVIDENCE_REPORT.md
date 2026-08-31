# T9 Repository / Evidence Report

| Field | Value |
|---|---|
| Date | 2026-08-31 |
| T8 checkpoint | `transformation-t8-measurement-intelligence-foundation-complete` → `bec091bc393be0581a3254e0305bc3153c0c61bd` |
| T9 | Forensics only. **No implementation.** |
| T9 tag | **NOT CREATED** |

Legend: **FACT** / **INFERENCE** / **PROPOSAL** / **UNKNOWN**

## Constitutional purpose (PROPOSAL, pending owner)

T9 is the next architectural intervention after T8’s measurement foundation:

**Isolate, verify, and contract existing deterministic tailoring intelligence — do not replace it.**

It prepares Phases 13–16. It is **not** Phase 13 implementation, **not** AI (17), **not** 3D (18), **not** commercialization (19).

## Upstream checkpoints — FACT

| Stage | Tag | Commit |
|---|---|---|
| T7 | `transformation-t7-design-studio-extraction-complete` | `c55debcbaca16ca54fc02415cc61e528d7feb080` |
| T8 | `transformation-t8-measurement-intelligence-foundation-complete` | `bec091bc393be0581a3254e0305bc3153c0c61bd` |

Working tree at T8 tag: clean. Remote: pushed.

## Current tailoring-intelligence capabilities — FACT

| Capability | Location | Callable without React? | Tests |
|---|---|---|---|
| Pattern draft | `patternEngine.ts` via T3 `requestPattern` / T7 adapters | YES | Equality vs engine (domain + design) |
| Production plan heuristics | `productionAssistant.ts` via T3 / T7 | YES | Equality except `generatedAt` |
| Fabric yardage estimate | `estimateFabricRequirement` inside assistant | YES (not independently wrapped) | Covered only as part of plan equality |
| Cutting list / sewing / fit risks | same assistant | YES | same |
| Stage codes | `domain/production/stages.ts` copied from backend service | YES | merge tests |
| Measurement version / units / provenance | T8 domain modules | YES | 8 T8 tests |
| Job sheet PDF | `jobSheetExport.ts` | NO (jsPDF + engine import) | **UNKNOWN** (no fixture) |
| Production alerts / completeness | `productionAlerts.ts` | YES | **UNKNOWN** (no dedicated suite) |
| Canvas silhouettes | `DesignStudio.tsx` private functions | NO | **UNKNOWN** (no pixel harness) |
| `garmentLogic.ts` | `shared/utils/garmentLogic.ts` | YES | **UNKNOWN** — T0 recorded **no importers**; still no product importer found this cycle |

## Direct engine callers remaining — FACT

T7 re-pointed `DesignStudio.tsx`. **FACT:** `jobSheetExport.ts` still imports `generateStylePattern` from `./patternEngine` (not T3/T7).

AppContext still imports `productionAssistant` directly for `saveStudioOutputToOrder` / studio plan generation (T7 dual-path, not re-pointed).

## Persistence / runtime — FACT

- T2 repositories: measurement (`MeasurementSet`, `MeasurementVersion`), garment (`GarmentSpecification`). Schema v1. No new localStorage in T3–T8.
- AppContext `saveAppStorage` TRANSITIONAL.
- Legacy drafts `stitchflow:design-studio:drafts` (T7 condition).
- Authoritative backend: `apps/backend/src/server.ts` → `app.ts`. Business CRUD **not** mounted unless `MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES=true`.
- `productionStageService.ts` still unmounted under default npm scripts.

## Protected hashes vs T0 — FACT (verified this close)

| Asset | SHA-256 |
|---|---|
| patternEngine.ts | `d02000d6b8e96b2665bde245056367d5c72f05d3447893469ca91e84510e16dc` |
| productionAssistant.ts | `140a646d2bfa933e47951169b953f29bef108b6e0e48dd8dfe99a3c66ad571c4` |
| shared/types/index.ts | `424ef6181705cffcbcbbf7008ddf85c61b65cd3a820bb167d1fb4033eee3d0d9` |
| productionStageService.ts | `eef8854f42b6aa41930f74d18e7ab35cfc709240c5a3254c60981e0dfccd67c8` |
| DesignStudio.tsx | `5059c0db5633d9340793e620863cfc521ee8118a2f3188ead9082ee2c1ae783b` (T7 import extraction; T0 was `78ddd839…`) |

## This cycle

IMPLEMENTED: documentation only.  
NOT STARTED: T9 code.
