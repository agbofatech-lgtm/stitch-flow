# T0.2 — PROTECTED ASSET REGISTRY

**Stage:** T0  
**Date:** 2026-08-31  
**Rule:** These assets must not be casually rewritten, deleted, or “cleaned up” during later stages. Extraction requires regression protection first (Constitution Gate G).

Classification:

| Tag | Meaning |
|---|---|
| PROTECTED | Do not rewrite. Extract only with mapping + tests. |
| TRUSTED | Logic appears coherent from source inspection; **untested** |
| PARTIAL | Useful but incomplete or coupled |
| DANGEROUS | Looks like a system but is stub, split, or corrupted |
| UNKNOWN | Not enough runtime evidence |

---

## 1. PATTERN ENGINE

| Field | Value |
|---|---|
| Path | `apps/web/src/modules/services/patternEngine.ts` |
| Size | 674 lines |
| Layer today | Domain inside web app |
| I/O | None. Pure functions. |
| Units | Centimetres assumed. No conversion. |
| Inputs | `StylePatternKind` + measurement map |
| Outputs | Bodice control points or generic outline/guides/notches/piece notes |
| Implemented kinds | bodice, shirt, trouser, skirt, kaftan |
| Mapped elsewhere | dress/gown/blouse → bodice; senator → shirt; agbada → kaftan (`DesignStudio.tsx`) |
| UI coupling | None in the engine file |
| Tests | None |
| Decision | **PRESERVE** |
| Trust | **PROTECTED / TRUSTED (untested) / PURE** |

Must not: change formulas, ease constants, validation ranges, or point construction without a fixture harness.

---

## 2. PRODUCTION / TAILORING ASSISTANT

| Field | Value |
|---|---|
| Path | `apps/web/src/modules/services/productionAssistant.ts` |
| Size | 1312 lines |
| Functions | `inferGarmentTypeFromInspiration`, `analyzeDesignInspiration`, `estimateFabricRequirement`, `buildCuttingList`, `buildSewingChecklist`, `buildFitRiskWarnings`, `generateProductionPlan` |
| Nature | Deterministic heuristics and keyword matching. **Not ML.** UI labels it “AI”. |
| Units | Fabric default `yards` |
| Tests | None |
| Decision | **PRESERVE** |
| Trust | **PROTECTED / PARTIAL / HEURISTIC** |

Must not: replace with a new “AI” implementation that silently changes estimates.

---

## 3. DESIGN STUDIO (LEGACY MONOLITH)

| Field | Value |
|---|---|
| Path | `apps/web/src/components/DesignStudio.tsx` |
| Size | ~4075 lines |
| Mixed responsibilities | UI, canvas render, measurement aliases, garment silhouettes, pattern invocation, production plan invocation, localStorage drafts, order persistence via AppContext, feature gates |
| Backend | None. Save writes AppContext/localStorage. |
| Extra persistence | `stitchflow:design-studio:drafts` |
| Decision | **PRESERVE now. EXTRACT in T7, not rewrite.** |
| Trust | **PROTECTED / PARTIAL / UI-COUPLED** |

T7 is authorized only after dependency mapping and regression baseline. T0–T6 must not rebuild this file as a new Design Studio.

---

## 4. MEASUREMENT VOCABULARY

| Field | Value |
|---|---|
| Canonical types file | `apps/web/src/shared/types/index.ts` |
| Corrupted barrel | `apps/web/src/types.ts` (**DANGEROUS** — file content is `main.tsx`) |
| BodyMeasurements | Required bust, waist, neck, shoulder, backLength; extends garment fields |
| GarmentMeasurements | 40+ optional numeric fields + notes |
| Profiles | `CustomerMeasurementProfile` |
| Order snapshot | `OrderMeasurementSnapshot` |
| Mixing | AppContext and DesignStudio alias bust↔chest, sleeve↔sleeveLength, ankle↔aroundAnkle |
| Persistence | localStorage only |
| Decision | **ADAPT names only with a mapping layer. Do not invent a parallel vocabulary.** |
| Trust | **PARTIAL / UI-COUPLED** |

Intended Body vs Garment vs Pattern separation is **not enforced**. FACT: they are mixed.

---

## 5. PRODUCTION STAGE ENGINE (BACKEND)

| Field | Value |
|---|---|
| Path | `apps/backend/src/services/productionStageService.ts` |
| Size | 552 lines |
| Codes | measurement → cutting → sewing → embroidery → first_fitting → second_fitting → final_press → ready → delivered |
| Actions | start, complete, skip, reopen, note |
| Callers | `orderRoutes.ts` only |
| Mounted? | Only if `app.ts` runs — **it does not under npm scripts** |
| Tables | `order_production_stages`, `order_production_stage_events` (migration references `orders(id)` which core migrations do not create) |
| Decision | **PRESERVE rules. Do not re-invent stage codes in the UI.** |
| Trust | **PROTECTED / PARTIAL / UNMOUNTED** |

---

## 6. RELATED PROTECTED-ADJACENT ASSETS

| Asset | Path | Decision | Trust |
|---|---|---|---|
| Job sheet PDF | `apps/web/src/modules/services/jobSheetExport.ts` | ADAPT | PARTIAL |
| Invoice PDF | `apps/web/src/shared/utils/invoicePdf.ts` | ADAPT | PARTIAL |
| Production alerts | `apps/web/src/shared/utils/productionAlerts.ts` | ADAPT | PARTIAL |
| Reporting aggregates | `apps/web/src/shared/utils/reporting.ts` | ADAPT | PARTIAL |
| AppContext persist | `AppContext.tsx` + `shared/lib/db.ts` | ADAPT (SoT until T2) | DANGEROUS as architecture, valuable as current store |
| Tier simulation | `tierEnforcement.ts`, `config/tiers.ts` | ADAPT; do not treat as billing | DANGEROUS (two price tables) |
| `garmentLogic.ts` | unused | UNKNOWN / likely dead | Do not delete in T0 |
| `orderStudio.schema.ts` | unwired Zod | ADAPT later | PARTIAL |

---

## 7. EXPLICITLY NOT PROTECTED (may be replaced after T0, still not in T0)

| Asset | Why |
|---|---|
| `apps/backend/src/server.ts` stub | PLACEHOLDER authority |
| Empty backend auth/sync files | 0-byte placeholders |
| `apps/backend/$3`, `-`, `{` | debris |
| `*.bak*` files | leftovers |
| PWA manifest TailorPro naming | brand drift |
| `proxy-server.js` unused in scripts | convenience |
| Duplicate Capacitor root config | identity drift |

Replacement of these is **T1+ work**, not T0.

---

## 8. PROTECTION RULE FOR LATER STAGES

If a later stage needs to move Pattern Engine, Production Assistant, or Design Studio logic:

```
Existing behavior mapped
  + Pure logic identified
  + Regression baseline established
  + Canonical contract defined
  + New implementation verified
```

Until then: **STOP** (T3/T7 stop condition).

---

## 9. CONTENT HASH BASELINE (T0 verification, 2026-08-31)

Working tree matches git HEAD `b576c3e6f5a4d7aac08ef75de47cf6235a2ed619` for these files (`git diff` empty). SHA-256 of file bytes:

| Asset | Lines | SHA-256 |
|---|---|---|
| `apps/web/src/modules/services/patternEngine.ts` | 674 | `d02000d6b8e96b2665bde245056367d5c72f05d3447893469ca91e84510e16dc` |
| `apps/web/src/modules/services/productionAssistant.ts` | 1312 | `140a646d2bfa933e47951169b953f29bef108b6e0e48dd8dfe99a3c66ad571c4` |
| `apps/web/src/components/DesignStudio.tsx` | 4075 | `78ddd839fe2baeeedd37408b3ef9aaead0b8b1e1863ebec438e72334ae4e9507` |
| `apps/web/src/shared/types/index.ts` | 915 | `424ef6181705cffcbcbbf7008ddf85c61b65cd3a820bb167d1fb4033eee3d0d9` |
| `apps/backend/src/services/productionStageService.ts` | 552 | `eef8854f42b6aa41930f74d18e7ab35cfc709240c5a3254c60981e0dfccd67c8` |

Git blob SHA-1 (index, same commit):

| Asset | blob |
|---|---|
| patternEngine.ts | `b8a70a2df3bcec814a467b20376e37fa30de1c86` |
| productionAssistant.ts | `d52c14e56b091f152846fd43da5ddedb6da6b9d3` |
| DesignStudio.tsx | `de43878ebf6ab54bf7dbf0790243127580ff41de` |
| shared/types/index.ts | `bf10fcc96581872486a502aa715d54ee70a19bcd` |
| productionStageService.ts | `d2c5604b5a8d0c73ec68fc34dae89e52e560c599` |

Adjacent (not Tier A freeze, recorded for traceability):

| Asset | Lines | SHA-256 |
|---|---|---|
| `jobSheetExport.ts` | 979 | `de3925d02d7861a53f4c6eb6e5bd8a5fa5f6cfd46667698fbf2ea869ace36922` |
| `invoicePdf.ts` | 311 | `1d0c6f07e555999efdcc2e3ac9e09df1bfe10465459238449a747fcd9d2af31f` |
| `productionAlerts.ts` | 455 | `007e22bd4689db49a3546634140a2225de720e56a4fc14c65ee61eab32fce5de` |
| `reporting.ts` | 497 | `5fe166284bce03a792ab89ae09e194756b0ec23076053063b9d62d735ff9de6d` |
| `garmentLogic.ts` (no importers found) | 336 | `84d0511eeea5fb904b441751abb22a4cd995539ce03dd5798540f0c1f897eb94` |

**T0.2 complete.** (hashes added during T0 owner-acceptance verification; files themselves unmodified)
