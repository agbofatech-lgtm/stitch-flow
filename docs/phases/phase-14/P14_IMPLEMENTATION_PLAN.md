# P14 Implementation Plan

| Field | Value |
|---|---|
| Date | 2026-08-31 |
| Forensic baseline | `7dc07b3ec0f160fe9ed1fc80bc72fa550c6b9b71` |
| Phase 13 | `cb49d267038407b9e60a89a558c505c7855cf5a5` |
| Implementation | AUTHORIZED in slices |
| Phase 15 | **LOCKED** |

Legend: **FACT** / **INFERENCE** / **PROPOSAL**.

## Binding forensic facts

F1 Authority conflict across Order / AppContext / Studio / drafts / profileType / DesignCategory / PatternType. No existing store is product SoT.

F2 T6 `GarmentSpecification` remains TRANSITIONAL projection.

F3 dress/gown/blouse/custom → bodice is **engine compatibility**, not a component graph.

F4 Canvas / slider min / visual presets are not tailoring authority.

F5 hip 98/100/102 unresolved. Phase 14 must not include hip as a specification field.

## Slices

| Slice | Outcome |
|---|---|
| P14.1 | Domain taxonomy + canonical contract (no UI) |
| P14.2 | Evaluation: completeness, structural validation, unknown |
| P14.3 | Deterministic canonicalization + non-crypto fingerprint |
| P14.4 | Immutable `GarmentSpecificationVersion` via T2 `garment` repository |
| P14.5 | Studio **adapter** only — DesignStudio.tsx untouched |
| P14.6 | Explicit freeze (evaluate → canonicalize → version) |
| P14.7 | Tests + established regression |

## Required vs optional (**FACT**-justified)

| Class | Fields |
|---|---|
| REQUIRED FOR IDENTIFICATION | known `GarmentType` (11 repository values) |
| OPTIONAL DESIGN DETAIL | fitType, sleeveStyle, collarStyle, neckline, lengthType, pocketStyle, fabricType, designCategory, notes |
| OBSERVED NOT AUTHORITATIVE | T6 projection, Studio drafts, canvas, slider minima |
| NOT IN THIS CONTRACT | body/garment measurements (Phase 13), pattern geometry (T10/engine), production plan |

Unknown garment strings: **UNKNOWN**, not coerced to bodice as P14 authority. Legacy `mapGarmentTypeToPatternKind` remains isolated compatibility.

## Persistence

T2 `repositories.garment` create-only for frozen versions. No new localStorage. No second mutable store.
