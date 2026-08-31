# Garment Type Inventory and Component Taxonomy

Legend: **FACT** unless marked.

## Garment type inventory

| Identifier | Location | Meaning | Authority | Confidence |
|---|---|---|---|---|
| bodice, shirt, trouser, skirt, kaftan, dress, gown, senator, agbada, blouse, custom | `shared/types` `GarmentType`; P14 `KNOWN_GARMENT_TYPES` | UI/order garment identity | Phase 14 known set | FACT |
| bodice, shirt, trouser, skirt, kaftan | `PatternKind` / engine | draft kind | T3 compatibility map | FACT |
| shirt, dress_kaba, skirt, trouser, blouse, custom | `MeasurementProfileType` | profile vocabulary | LOSSY vs GarmentType | FACT |
| senator, kaftan, agbada, suit, shirt, trousers, gown, dress, skirt, blouse, bridal, wedding, casual, traditional, unisex, other | `DesignCategory` | inspiration category | not GarmentType | FACT |
| bodice, shirt, trouser, kaftan, senator, agbada, suit, gown, blouse, skirt, sleeve, collar, custom | `PatternType` | pattern library | sleeve/collar → Studio custom | FACT |
| orderType | Order free string | display | not classification | FACT |

Do **not** silently consolidate these identifiers.

## Candidate “components” — classification

Primary category (A–I) per PART VIII.

| Concept | Location | Data | Used by | Class | Authority |
|---|---|---|---|---|---|
| PatternKind bodice/shirt/trouser/skirt/kaftan | gateway + engine | enum | pattern generate | **E PATTERN INPUT** | engine compatibility |
| Front/Back Bodice, Skirt Panel, Inner Tunic, Outer Agbada Panel, Sleeve, Collar, Cuff, Waistband, Facing, Lining, Pocket, Fly | `productionAssistant.buildCuttingList` | `{name, quantity, fabric}` | production plan | **F PRODUCTION HEURISTIC** | protected; not domain SoT |
| Sewing step titles (join bodice to skirt, attach sleeves) | `buildSewingChecklist` | checklist | production plan | **F** | same |
| sleeveStyle, collarStyle, neckline, pocketStyle, lengthType, fitType | P14 contract / Inspiration | optional string | evaluation | **C STYLE ATTRIBUTE** | optional intent; not a component entity |
| sleeve (numeric) | measurements / Studio slider | number cm | engine shirt input | **E / G** | Phase 13 measurement |
| canvas sleeve/hem silhouette | DesignStudio `buildUpperGarmentShape` | pixels | preview | **D VISUAL** | T10 C4 |
| PatternType sleeve/collar | library | enum | load as custom | **H LEGACY label** | not an engine |
| liningQty / interfacingQty | fabric estimate | yards | production | **F** | heuristic qty |
| `garmentLogic.ts` | unused duplicate field maps | — | T9 tests: unused by contracts | **H** | dead duplicate |
| Agbada inner+outer+trouser graph | — | — | — | **I UNKNOWN** | not in domain; only heuristic cutting names |

**FACT:** No row is a persisted **A STRUCTURAL COMPONENT** entity.
