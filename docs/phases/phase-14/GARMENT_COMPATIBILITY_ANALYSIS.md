# Garment Compatibility Analysis

**FACT:** No compatibility registry exists.

Engine accepts any of five kinds independently. Nothing rejects “dress + trouserLength” except Studio custom silhouette heuristic (`custom` + trouserLength + no bust → draw trousers).

| Combination | Evidence | Status |
|---|---|---|
| UI garment → mapped PatternKind | switch statements | **permitted by map** |
| dress measurements include hip/skirtLength | Studio UI | **UI extra**; engine ignores for bodice |
| PatternType sleeve as garment | maps to custom → bodice engine | **no sleeve engine** |
| FitType vs PatternKind | unused by engine | **UNKNOWN** effect |
| Sleeve style vs sleeveless cutting list | production assistant heuristic | Category D — do not rewrite |
| Incompatible families (e.g. collar on trouser) | none encoded | **UNKNOWN** |

**STOP-P14-F:** Fabricating family/component compatibility from tailoring expertise is prohibited.

Later implementation may only:

1. restated repository maps, or
2. an explicit versioned registry authorized as such, or
3. leave UNKNOWN.
