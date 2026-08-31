# T8.0 — Measurement & Tailoring Core Forensics

| Field | Value |
|---|---|
| Date | 2026-08-31 |
| T7 checkpoint | `transformation-t7-design-studio-extraction-complete` → `c55debcbaca16ca54fc02415cc61e528d7feb080` |
| Authorized next | Trusted measurement foundation (not Phases 13–16 completeness) |
| T8 tag | **NOT CREATED** |

Legend: **FACT** / **INFERENCE** / **PROPOSAL**. Classification: **AUTHORITATIVE** / **DERIVED** / **TRANSITIONAL** / **DUPLICATED** / **LEGACY** / **UNKNOWN**.

---

## 1. Measurement definitions — FACT

| Artifact | Classification | Notes |
|---|---|---|
| `domain/measurement/fields.ts` BODY / GARMENT / PATTERN_INPUT | AUTHORITATIVE (T3) | Disjoint body vs garment. Pattern keys are engine-consumed names. |
| `shared/types` `GarmentMeasurements` | TRANSITIONAL | 40+ optional numerics; mixed body+garment. |
| `shared/types` `BodyMeasurements extends GarmentMeasurements` | LEGACY / DUPLICATED | Vocabulary leak: body type inherits garment fields. |
| `patternEngine.ExtendedMeasurements` | DERIVED / DUPLICATED | Partial BodyMeasurements + extra keys. |
| Design Studio `StudioMeasurements` | TRANSITIONAL / DUPLICATED | Local alias set; not imported from domain. |
| `OrderMeasurement` type (`measurementKey`/`unit`) | UNKNOWN / unused | No importers found as a running store. |

## 2. Measurement storage — FACT

| Store | Classification | Key / entity |
|---|---|---|
| AppContext `measurementProfiles` | TRANSITIONAL | `saveAppStorage` localStorage |
| Order `garmentMeasurements` | TRANSITIONAL | AppContext orders |
| Order `measurementSnapshot` | TRANSITIONAL | Freeze-ish blob; mutable if later updates rewrite it |
| Studio session `designStudioMeasurements` / `designStudioGarmentMeasurements` | TRANSITIONAL | AppContext studioSession |
| `stitchflow:design-studio:drafts` | LEGACY | T7 acknowledged; not T2 |
| T2 `measurement` repository | AUTHORITATIVE for new domain writes | `kind: MeasurementSet` via `persistSeparatedMeasurements` |
| T2 `garment` repository | AUTHORITATIVE for T6 spec snapshots | `kind: GarmentSpecification` |

AppContext remains TRANSITIONAL SoT for live UI. T2 is not yet the running UI store.

## 3. Transformations — FACT

| Transform | Classification | Rule |
|---|---|---|
| `separateLegacyMeasurementBlob` | AUTHORITATIVE | Splits blob; unknown numeric keys STOP |
| `MEASUREMENT_ALIASES` / AppContext `normalizeMeasurementValues` | DUPLICATED anti-corruption | chest↔bust, sleeve↔sleeveLength, ankle↔aroundAnkle |
| `projectPatternMeasurements` | DERIVED | `derivedFrom: 'body+garment'` |
| Pattern Engine `validateAndRead` defaults / ease formulas | AUTHORITATIVE inside engine, DERIVED outputs | cm assumed; fallbacks and ease constants must not be copied |
| Production Assistant fabric estimates | DERIVED heuristic | Uses measurements with numeric defaults (96 bust, 102 hip, …) |
| Canvas silhouettes | EXPERIENCE / not domain | Must not become measurement authority |

## 4. Pattern Engine I/O — FACT

Inputs: `StylePatternKind` + measurement map. Units: **cm** (labels and validation ranges).  
Outputs: bodice control points / generic outline+guides. Regenerated, not persisted as geometry.  
T3 `requestPattern` ≡ engine for sampled kinds (domain tests). T7 adapters re-export the same functions.

## 5. Production Assistant measurement use — FACT

`generateProductionPlan` reads a mixed `GarmentMeasurements` blob. Fabric `unit` is yards/meters/pieces — **not** body-length units. Keyword “AI” in UI; engine is heuristic. Do not rewrite.

## 6. Design Studio / Order — FACT

Studio still hydrates from order snapshot + drafts. Dual save paths remain distinct (T7).  
`applyMeasurementProfileToOrder` copies live profile into `garmentMeasurements` **and** `measurementSnapshot` (new `capturedAt`). Live profile edits can later rewrite snapshot **label/type** on linked orders (`updateCustomerMeasurementProfile`) without rewriting numeric snapshot fields unless the snapshot object is replaced.

## 7. Unit handling — FACT

| Domain | Unit | Conversion |
|---|---|---|
| Pattern Engine | cm hardcoded | none |
| T3 separated sets | `unit: 'cm'` literal | none |
| Production fabric | yards default | fabric-only |
| Imperial body units | **absent** | GAP for T8 |

T3 doc said “no conversion layer” meaning **do not change engine units**. T8 conversion, if any, must sit **in front of** the engine.

## 8. Historical behaviour — FACT

T6 `historicalSnapshotIntact` is a weak check (bust equality **or** `capturedAt` present). Frozen snapshots live on Order in AppContext, not as immutable T2 versions. No field-level provenance (`source`, `capturedBy`, `verification`).

## 9. INFERENCE

Without an explicit version+provenance contract, live profile edits and Studio overlays can drift from the numbers used at cut time. Dual blobs (profile vs snapshot vs studio session vs drafts) are not one authority.

## 10. PROPOSAL (this T8 slice)

Add domain contracts for units, provenance, immutable `MeasurementVersion`, T2 persist of versions, validation, and engine-input projection in **cm**. Do not rewrite engines, Studio canvas, or AppContext localStorage. Do not migrate/delete legacy drafts.
