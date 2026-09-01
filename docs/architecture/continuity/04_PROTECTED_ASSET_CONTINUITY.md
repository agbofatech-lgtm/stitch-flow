# 04 — Protected Asset Continuity

**Date:** 2026-09-01  
**Governing ADR:** ADR-001  
**Registry:** [`../PROTECTED_ASSET_REGISTRY.md`](../PROTECTED_ASSET_REGISTRY.md) (T0; hashes still match git blobs)

```
PROTECTED ≠ PERFECT ≠ PRODUCTION COMPLETE
```

Doctrine: **Preserve → Isolate → Verify → Modernize around → Expand.**  
Do not confuse bad architecture (UI coupling, unmounted service) with bad domain intelligence.

---

## Hash verification method (FACT)

Registry SHA-256 is of **git blob / LF bytes**, not a Windows CRLF working copy.

```
git show HEAD:<path> | sha256sum
```

or: read file bytes, replace `\r\n` → `\n`, then SHA-256.

Verified at pack baseline HEAD `610037661c3b15f5b8587240fdabdf10c8e6dd24`:

| Asset | Lines (git) | SHA-256 | vs T0 / P19.11 |
|---|---|---|---|
| `apps/web/src/modules/services/patternEngine.ts` | 674 | `d02000d6b8e96b2665bde245056367d5c72f05d3447893469ca91e84510e16dc` | unchanged vs T0 |
| `apps/web/src/modules/services/productionAssistant.ts` | 1312 | `140a646d2bfa933e47951169b953f29bef108b6e0e48dd8dfe99a3c66ad571c4` | unchanged vs T0 |
| `apps/web/src/shared/types/index.ts` | 915 | `424ef6181705cffcbcbbf7008ddf85c61b65cd3a820bb167d1fb4033eee3d0d9` | unchanged vs T0 |
| `apps/backend/src/services/productionStageService.ts` | 552 | `eef8854f42b6aa41930f74d18e7ab35cfc709240c5a3254c60981e0dfccd67c8` | unchanged vs T0 |
| `apps/web/src/components/DesignStudio.tsx` | 4047 | `5059c0db5633d9340793e620863cfc521ee8118a2f3188ead9082ee2c1ae783b` | T7 import/draft extraction; T0 was `78ddd839…` |

T10 engine identity constants in `domain/tailoring/deterministic/versioning.ts` cite these Pattern Engine / Production Assistant digests.

---

## Tier A assets

### Pattern Engine

| Field | Value |
|---|---|
| Path | `apps/web/src/modules/services/patternEngine.ts` |
| Purpose | Deterministic 2D pattern geometry from kind + measurement map |
| Tier | **PROTECTED / TRUSTED (engine untested in isolation) / PURE** |
| I/O | None. Pure functions |
| Units | Centimetres assumed. No conversion inside the file |
| Implemented kinds | bodice, shirt, trouser, skirt, kaftan |
| Mapped elsewhere | dress/gown/blouse → bodice; senator → shirt; agbada → kaftan |
| Must not | change formulas, ease constants, validation ranges, point construction without a fixture harness |
| Tests | None on the file itself; wrappers/fixtures cover observed behavior |
| Current authority | This file. Wrappers must delegate, not copy |

### Production Assistant

| Field | Value |
|---|---|
| Path | `apps/web/src/modules/services/productionAssistant.ts` |
| Purpose | Fabric estimate, cutting list, sewing checklist, fit risks, inspiration keyword analysis |
| Tier | **PROTECTED / PARTIAL / HEURISTIC** |
| Nature | Deterministic heuristics. **Not ML.** UI historically labelled “AI” |
| Units | Fabric default yards |
| Must not | replace with a model that silently changes estimates |
| Tests | None on the file itself; T10 strips `generatedAt` for identity |
| Current authority | This file |

### Measurement vocabulary

| Field | Value |
|---|---|
| Path | `apps/web/src/shared/types/index.ts` |
| Purpose | `BodyMeasurements`, `GarmentMeasurements`, profiles, order snapshots |
| Tier | **PROTECTED / PARTIAL / UI-COUPLED in live Studio** |
| Constraint | Adapt names only with a mapping layer. Do not invent a parallel vocabulary (ADR-003) |
| Limitation | Body vs Garment vs Pattern **not enforced** in the live blob. T3 `separate` exists for new/governed writes |
| Corrupted barrel | `apps/web/src/types.ts` is a copy of `main.tsx` — **not** this vocabulary. DANGEROUS |

### Production stage engine

| Field | Value |
|---|---|
| Path | `apps/backend/src/services/productionStageService.ts` |
| Purpose | Ordered stages + transition guards + event log |
| Codes | measurement → cutting → sewing → embroidery → first_fitting → second_fitting → final_press → ready → delivered |
| Tier | **PROTECTED / PARTIAL / UNMOUNTED** under default npm boot |
| Callers | `orderRoutes.ts` only, and those routes mount only if business flag is true |
| Frontend copy | `domain/production/stages.ts` copies codes — do not invent UI stage codes |
| Must not | re-invent stage codes in the UI |

### Design Studio

| Field | Value |
|---|---|
| Path | `apps/web/src/components/DesignStudio.tsx` |
| Purpose | Canvas, measurement sliders, garment silhouettes, pattern invocation, production plan invocation, drafts, order save |
| Tier | **PROTECTED / PARTIAL / UI-COUPLED** |
| T7 | Extracted **imports and draft I/O** to `application/design`. Canvas/formulas/silhouettes remain |
| Backend | None on the live path |
| Extra key | `stitchflow:design-studio:drafts` |
| Must not | rebuild as a new Design Studio. Extract only with mapping + tests |
| Dual save | `handleSaveToOrder` vs `AppContext.saveStudioOutputToOrder` — still distinct |

---

## Adjacent (adapt, do not casually delete)

| Asset | Path | Decision |
|---|---|---|
| Job sheet PDF | `modules/services/jobSheetExport.ts` | ADAPT |
| Invoice PDF | `shared/utils/invoicePdf.ts` | ADAPT |
| Production alerts | `shared/utils/productionAlerts.ts` | ADAPT |
| Reporting | `shared/utils/reporting.ts` | ADAPT |
| AppContext persist | `AppContext.tsx` + `shared/lib/db.ts` | ADAPT (SoT until a data-authority programme) |
| Tier simulation | `tierEnforcement.ts`, `config/tiers.ts` | ADAPT; not billing law |
| `garmentLogic.ts` | unused | UNKNOWN / likely dead — do not delete casually |

---

## Layers around protection (do not collapse)

| Layer | What it is | Example |
|---|---|---|
| **Protected formula** | The intelligence | `generateStylePattern` inside `patternEngine.ts` |
| **Adapter** | Same signature, extraction boundary | T7 `patternAdapter.ts` / `generateStudioPattern` |
| **Wrapper / gateway** | Adds separation or mapping, still delegates | T3 `requestPattern` |
| **Governed contract** | Canonicalize, units, fingerprint, provenance | T10 `executeDeterministicPattern`; T9 `runPatternContract` |
| **UI canvas visualization** | Experience silhouettes, not pattern geometry | `buildUpperGarmentShape` in DesignStudio |

T10 wraps engines. It does not copy formulas.

---

## Not protected (may be replaced after a named programme; not in this pack)

`server.stub.ts`; empty/orphaned `apps/api`; backend debris filenames; PWA TailorPro naming; unused `proxy-server.js`; duplicate Capacitor configs; `.bak*` files.
