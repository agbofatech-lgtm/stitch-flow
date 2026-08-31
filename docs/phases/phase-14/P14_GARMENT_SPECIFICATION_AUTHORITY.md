# P14 Garment Specification Authority

**FACT:** Stage 0 CONFLICT remains. Phase 14 introduces **governed** authority; it does not silently pick a winner among live stores.

```
LIVE Studio / Order / AppContext / drafts     (mutable, TRANSITIONAL / LEGACY)
        │  extract (adapter) — no Studio rewrite
        ▼
evaluateGarmentSpecification                  (analysis, no mutation)
        │
        ▼
CanonicalGarmentSpecification                 (governed semantic intent)
        │  explicit freeze
        ▼
GarmentSpecificationVersion                   (immutable, T2 garment repo)
```

| Record | Authority | Mutability |
|---|---|---|
| T6 `GarmentSpecification` | TRANSITIONAL projection | derived DTO |
| Studio draft | LEGACY | mutable |
| Order.garmentType | LIVE reference | mutable |
| Canonical spec (evaluated) | GOVERNED | not persisted until freeze |
| `GarmentSpecificationVersion` | FROZEN | immutable |

MeasurementVersion remains Phase 13. Optional `measurementVersionId` on a frozen spec is a **reference**, not Phase 15 composition.

Pattern output remains derived. Visual canvas remains EXPERIENCE.
