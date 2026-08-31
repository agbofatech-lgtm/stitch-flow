# Measurement Taxonomy

Legend: **FACT** / **INFERENCE** / **PROPOSAL** / **UNKNOWN**

Do not collapse Body / Garment / Pattern / Profile / Version / Provenance.

## Record classes — FACT

| Canonical (ADR-003) | Repo type / kind | Class | Mutability | SoT |
|---|---|---|---|---|
| MeasurementProfile | `CustomerMeasurementProfile` | live capture | mutable | TRANSITIONAL AppContext localStorage |
| MeasurementSet | T2 payload `kind: MeasurementSet` | separated blob persist | updatable | T2 `measurement` repository |
| MeasurementVersion | T8 `MeasurementVersionRecord` `kind: MeasurementVersion` | historical freeze | frozen | T2 create-only |
| OrderMeasurementSnapshot | `Order.measurementSnapshot` | freeze-ish order copy | order-owned | TRANSITIONAL AppContext |
| BodyMeasurement | `BODY_MEASUREMENT_FIELDS` | person lengths | captured | after T3 separate |
| GarmentMeasurement | `GARMENT_MEASUREMENT_FIELDS` | garment lengths / notes | captured | after T3 separate |
| PatternMeasurement | `PATTERN_INPUT_FIELDS` + `derivedFrom: 'body+garment'` | engine input projection | derived | not a capture SoT |
| MeasurementProvenance | T8 `MeasurementProvenance` | source / actor / time / verification | frozen with version | T8 contract |
| Studio draft | `stitchflow:design-studio:drafts` | session overlay | mutable | LEGACY (T7 key unchanged) |
| Engine ExtendedMeasurements | `patternEngine.ts` | duplicate input shape | — | protected engine, not a store |

## Derived engine outputs — FACT (not capture)

Bodice `BodiceCalculatedMeasurements`: `quarterBust`, `quarterWaist`, `neckWidth`, `neckDepth`, `armholeDepth`, `dartIntake`. Generic drafts add width/fullLength/quarters. These are PatternOutput internals. **FORBIDDEN parallel:** storing them as body capture.

## Semantic notes — FACT

- `BodyMeasurements extends GarmentMeasurements` in `shared/types` is a **LEGACY type leak**. T3 field tables are the class lock for new work.
- Aliases (chest↔bust, sleeve↔sleeveLength, ankle↔aroundAnkle) are anti-corruption, not a second vocabulary.
- UI `MEASUREMENT_FIELD_MAP` (Design Studio) is EXPERIENCE. Slider `optional` flags (bustSpan, armholeDepth) are **not** T3 required-key authority.
- Dress/gown/blouse/custom map to engine **bodice**. Senator → shirt. Agbada → kaftan. FACT from `mapGarmentTypeToPatternKind` (same mapping as Design Studio `getPatternKindForGarment`).

## INFERENCE

Live profile, order snapshot, studio session, and T2 version can disagree. Cut-time truth is the frozen version when one exists.

## PROPOSAL

Keep taxonomy classifier on existing names only. Do not add MeasurementConfidence (absent from repo except inspiration heuristic `confidence`).

## UNKNOWN

Anatomical textbook meaning of each field beyond the identifier. Shop practice for optional vs required beyond engine input keys.
