# Garment Defaults Inventory

| Default | Value | Source | Category |
|---|---|---|---|
| Studio garmentType | `'dress'` | `useState` | B UI convenience |
| Order form garmentType | `'dress'` | Orders/OrderForm | B |
| Inspiration fitType | `'tailored'` | Studio newInspiration | B |
| Inspiration category | `'senator'` | Studio form reset | B |
| map unknown garment string | `bodice` | T3/T7 switches | C Legacy mapped-default |
| Slider empty | `field.min` | Studio range input | B (looks like a value) |
| `buildInitialMeasurements` hip | 100 | DesignStudio | C / related T10 C3 |
| Canvas silhouette hip | 102 | `buildGarmentRenderShape` | B visual; T10 C4 |
| Canvas bust/chest | 96 | same | B visual |
| Canvas sleeve | 24 | same | B visual |
| Initial sleeve / wrist / thigh / knee / ankle / lengths | 24 / 20 / 58 / 42 / 28 / 108 / 75 / 135 | `buildInitialMeasurements` | B |
| Production assistant sleeve if missing | 24 | protected engine | **D** |
| Pattern/production hip 98/100/102 | path-specific | protected engines | **D / E unresolved** (T10 C3) |
| `buildStudioGarmentSpecification` missing type | `'bodice'` | T7 adapter | C |
| `buildGarmentSpecification` missing type | map(`'bodice'`) | T6 | C |
| garmentLogic unused copy of field maps | — | dead duplicate | C |

**CRITICAL:** UI defaults are **not** tailoring authority.

**STOP-P14-G:** 98/100/102 remain unresolved. Phase 14 must not reconcile them.

Category A (deterministic canonical default, versioned): **NONE found** for garment style/sleeve/fit.
