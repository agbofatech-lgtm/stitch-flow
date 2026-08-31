# P14 Integration Boundary

| System | Boundary |
|---|---|
| Design Studio | **Untouched**. Adapter extracts intent keys only |
| Drafts | `stitchflow:design-studio:drafts` transitional; not deleted; not a second key |
| Order | Not rewritten. Live garmentType remains mutable |
| T6 GarmentSpecification | TRANSITIONAL projection remains |
| T2 | `repositories.garment` create-only for versions |
| Phase 13 | MeasurementVersion unchanged |
| Phase 15 | **LOCKED** — no MeasurementVersion + spec composition into engines |
| Pattern Engine / Production Assistant | **UNCHANGED** |

Measurement workspace hosts evaluate/freeze controls (experience surface, not Studio rewrite).
