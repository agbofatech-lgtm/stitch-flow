# Garment Composition Semantic Boundary

Mandatory separations:

| Layer | Owns | Must not become |
|---|---|---|
| Phase 13 MeasurementVersion | body / garment **lengths** | components |
| Phase 14 GarmentSpecificationVersion | **intent** (type + optional style strings) | structure graph |
| Phase 15 composition (future) | structural entities + dependencies | pattern geometry |
| Pattern Engine | one-kind draft geometry | composition authority |
| Production Assistant | heuristic cut/sew lists | domain composition |
| Design Studio canvas | pixels / silhouettes | geometry or components |

```
sleeveStyle: "long"     ≠  SleeveComponent
PatternKind: bodice     ≠  dress composition
CuttingPiece "Sleeve"   ≠  required structural component
canvas outline          ≠  pattern piece
```

**FACT:** P14 already treats style strings as optional. Completeness of specification ≠ completeness of composition.
