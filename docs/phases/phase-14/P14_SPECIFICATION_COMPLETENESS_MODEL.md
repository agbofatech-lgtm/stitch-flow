# P14 Specification Completeness Model

Separate from Phase 13 measurement completeness.

| State | When |
|---|---|
| complete | `garmentType` is a known GarmentType |
| incomplete | garmentType absent |
| unknown | garmentType present but not in the known set |
| not_applicable | unused in current evaluator |

Optional style fields (fit, sleeve, collar, …) may be absent on a **complete** identification.

**FACT:** No silent fill of dress/sleeve/hip defaults.
