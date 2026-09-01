# 03 — Live Design Studio → Trusted Core

**This is SAC’s most important investigation.**

## PATH A — Live Design Studio (FACT)

**EVIDENCE:** `DesignStudio.tsx` imports `generateStylePattern`, `generateProductionPlan`, `analyzeDesignInspiration` from `application/design` (T7 barrel). Calls:

- `generateStylePattern(patternKind, measurements)` in `useMemo` (~1631) — canvas
- `generateProductionPlan({ garmentType, measurements, inspiration, analysis, selectedFabric })` in `useMemo` (~1660) and again in `handleSaveToOrder` (~2067)
- `handleSaveToOrder` (~2059) → `updateOrder(...)` AppContext localStorage

`getPatternKindForGarment` remains **inside DesignStudio** (duplicate of domain `mapGarmentTypeToPatternKind`).

T7 `generateStudioPattern` is a 1-line pass-through of `generateStylePattern`. **Studio does not call `generateStudioPattern`.** T7 equality test requires adapter output === engine output.

## PATH B — Workflow (FACT)

**EVIDENCE:** `workflow/orchestrate.ts` → `requestPattern` / `requestProductionPlan` (T3 gateways) → `separateLegacyMeasurementBlob` → engines.

Freeze: `applyMeasurementProfileToOrder` (order snapshot), **not** MeasurementVersion.

## PATH C — Trusted core (FACT)

**EVIDENCE:** `executeTrustedTailoring` requires frozen MeasurementVersion + GarmentSpecificationVersion + GarmentCompositionVersion. Then T10 `executeDeterministicPattern` / `executeDeterministicProductionPlan` wrap the same engines. Fingerprint fnv1a-64. Completeness gate on governed pattern-from-version. Unknown garment type skips production. Composition without pattern projection skips pattern.

P18 golden path test exercises Path C only.

## Divergence / convergence

```
                    ┌─ Path A: mixed blob, no freeze, no fingerprint, live canvas
measurements blob ──┼─ Path B: T3 separate, no T10, order snapshot freeze
                    └─ Path C: freeze triple → T10 canonicalize → engines
                                         │
                                         ▼
                              SAME protected engines
```

**Converge at:** `patternEngine.generateStylePattern` / `productionAssistant.generateProductionPlan`.  
**Diverge before:** input shaping, unit authority, freeze, completeness, provenance.

## Can identical inputs produce equivalent outputs?

**FACT:** T7 test: `generateStudioPattern` deepEquals engine for SAMPLE complete maps.

**FACT:** T10 wraps the same functions after canonicalize + cm conversion + omit undefined.

**INFERENCE:** For a complete finite-number cm map with the same kind, Path A and Path C **geometry should match** the engine. Provenance and refusal behavior will **not** match:

- Path A uses engine defaults for missing fields (T10 inputAuthority comment: “Missing keys stay missing (engine defaults apply)” on governed maps too, but completeness **assert** on version path throws).
- Path A aliases bust↔chest in Studio merge helpers; Path C `separateLegacyMeasurementBlob` maps aliases at freeze.
- Path A does not refuse string coercion the same way (`assertNoSilentCoercion`).
- Production `generatedAt` differs every call; T10 strips it from identity only.

**UNKNOWN without a paired fixture run this pass:** numeric equality of a live Studio session blob vs freeze-then-T10 on the same blob. **RECOMMENDATION:** SAC-1 regression = dual-run fixture (Path A vs Path C) on golden SAMPLE + Studio-like aliased blob.

## Missing Path A contracts

| Contract | Path A | Path C |
|---|---|---|
| Declared unit | implicit cm | explicit |
| MeasurementVersion | no | required for trusted execute |
| Completeness assert | engine ranges / try-catch | `assertPatternInputComplete` |
| GarmentSpecificationVersion | no | required |
| CompositionVersion | no | required |
| Fingerprint / provenance | no | yes |
| Unknown type handling | maps to bodice via Studio helper | spec `garmentTypeStatus` may skip production |

## Can a façade bridge Path A → Path C without rewriting DesignStudio.tsx?

**FACT:** T7 already moved engine imports out of Studio. Changing *which function* the barrel exports, or switching Studio’s import from `generateStylePattern` to `generateStudioPattern` / a new `generateAuthoritativeStudioPattern`, is the same class of extraction T7 already performed — **not** a canvas/formula rewrite.

**RECOMMENDATION — progressive, lowest-risk seam:**

| Slice | Seam | Studio UX | Authoritative artifact |
|---|---|---|---|
| SAC-1a | `handleSaveToOrder` / application save helper | Unchanged canvas Path A | On **explicit save**, freeze versions + `executeTrustedTailoring`; attach provenance to order **without** deleting Path A plan |
| SAC-1b | `generateStudioPattern` pointed at `governedPatternFromLoose` | Only if Studio is switched to that symbol | Governed generate; keep `generateStylePattern` identity re-export for T7 equality tests |
| SAC-1c | Optional later: live `useMemo` uses governed path **only when complete** | Canvas still draws; incomplete stays Path A try/catch | Align live geometry with Path C when legal |

**Preferred question answer:** **Yes.** Preserve UX; redirect **authoritative** computation through trusted contracts at the **T7 adapter and save boundary**, not by rewriting `DesignStudio.tsx` internals (canvas, silhouettes, sliders).

A one-line import change in DesignStudio (T7-class) may be needed to opt into SAC-1b. That is **not** STOP-B (rewrite). STOP-B would fire if canvas math, measurement alias tables, or silhouette builders had to be reimplemented to reach Path C. Evidence says they do not.

## Save semantics that must adapt (FACT)

Two paths remain distinct (`application/design/saveContract.ts`):

- `studio-order-commit` = `DesignStudio.handleSaveToOrder`
- `context-studio-session` = `AppContext.saveStudioOutputToOrder`

SAC-1 must not silently merge them. Authoritative freeze should be an **additional** write, or an explicit third path, with owner approval.

## Provenance missing on Path A

No MeasurementVersion id, no computation version, no fingerprint, no frozen chain. Order `measurementSnapshot` is a mixed blob + profile metadata, not P13.

## Lowest-risk convergence point (RECOMMENDATION)

```
application/design/patternAdapter.ts
application/design/productionAdapter.ts
DesignStudio.handleSaveToOrder  (call site, not canvas)
```

Do **not** start at `patternEngine.ts`. Do **not** start at canvas `useMemo` as the first slice.

## STOP checks

| ID | Triggered? |
|---|---|
| STOP-A | **No** — engines already wrapped |
| STOP-B | **No** — adapter seam exists |
