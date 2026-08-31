# Garment Specification Taxonomy

Legend: **FACT** unless marked.

This is a **classification of repository evidence**. Names in this file are not new domain types unless they already exist.

## GARMENT IDENTITY

| Concept | Repository evidence | Notes |
|---|---|---|
| Garment Type | `GarmentType` 11 values: bodice, shirt, trouser, skirt, kaftan, dress, gown, senator, agbada, blouse, custom | Order, Studio, types |
| Garment Family | **UNKNOWN** as a type. **INFERENCE:** upper (bodice/shirt/kaftan maps), lower (trouser/skirt), combined (dress/gown UI) | No `garmentFamily` field |
| Pattern Classification | `PatternKind` / `StylePatternKind`: bodice, shirt, trouser, skirt, kaftan | Engine kinds |
| Design Category | `DesignCategory` 16 values including suit, bridal, wedding, casual | Inspiration, not Order.garmentType |
| Profile Type | `MeasurementProfileType`: shirt, dress_kaba, skirt, trouser, blouse, custom | Not 1:1 with GarmentType |
| Pattern Library Type | `PatternType` includes sleeve, collar, suit | Maps sleeve/collar/suit → Studio `custom` |

## STRUCTURAL COMPONENTS

**FACT:** There is no first-class component entity (no Bodice/Sleeve/Collar records).

| Name in repo | Kind | Computational? |
|---|---|---|
| Engine kinds as pieces | bodice/shirt/trouser/skirt/kaftan drafts | Pattern engine **geometry** |
| Production `CuttingPiece.name` | heuristic list (sleeves if sleeveStyle ≠ sleeveless) | Production assistant **heuristic**, Category D |
| PatternType `sleeve` / `collar` | library labels | **SEMANTIC ONLY** — load maps to custom garment |
| Canvas silhouette builders | `buildUpperGarmentShape` / skirt / trouser | **VISUAL ONLY** (T10 C4) |

Do not invent Jacket or other unsupported components.

## STYLE ATTRIBUTES

| Attribute | Where | Class |
|---|---|---|
| `fitType` | Order, Inspiration, Profile, analysis | captured optional; **no engine formula** |
| `collarStyle`, `sleeveStyle`, `pocketStyle` | Inspiration free text | SEMANTIC / heuristic production |
| `lengthType` | InspirationAnalysis | heuristic |
| Fabric colour chips | Studio local `FABRIC_PATTERNS` | UI convenience |
| `orderType` | Order string (often title-cased garment) | display |

## FIT REQUIREMENTS

`FitType` = slim | regular | relaxed | oversized | tailored | custom.

**FACT:** Pattern engine does not take FitType. Production assistant may emit notes. Ease constants inside engines are **Category D** — not Phase 14 rewrite.

## DIMENSIONAL REQUIREMENTS

T3 already splits **body** vs **garment-length** fields (`GARMENT_MEASUREMENT_FIELDS`: trouserLength, skirtLength, fullLength, …). Those lengths are **measurement fields**, owned by Phase 13 classification, not new garment components.

## COMPUTATION CLASSIFICATION

| Class | Examples |
|---|---|
| Captured | Order.garmentType when user selected; inspiration collar/sleeve if typed |
| Defaulted | Studio initial garment `dress`; slider `field.min`; canvas hip 102 |
| Derived | `patternKind` from map; production cutting list; pattern geometry |
| Computed | Pattern engine output; fabric yards |
| Unknown | Whether a silent UI default was user intent |
