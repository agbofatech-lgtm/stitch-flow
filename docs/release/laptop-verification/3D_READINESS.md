# 3D readiness inventory — NOT STARTED

No 3D, virtual fitting, or canvas rewrite is in this preparation.

## 3D READINESS: **NOT READY**

### AVAILABLE INPUTS (trusted / governed — not a 3D mesh)

- MeasurementVersion: frozen body fields in centimetres; pattern kind; provenance
- GarmentSpecificationVersion: type status, optional-absent, fingerprint
- GarmentCompositionVersion: observed components; unknown types not coerced to bodice
- TrustedTailoringExecution: pattern wrap + production wrap; fingerprints (not cryptographic)
- PatternOutput: 2D pattern geometry from **protected** `patternEngine` (bodice/shirt/trouser/skirt/kaftan)
- ProductionOutput: heuristic job sheet from **protected** `productionAssistant` (`generatedAt` excluded from identity)
- AI advisory: application-layer explanation; cannot mutate frozen authorities; live LLM NOT YET VERIFIED

### MISSING INPUTS (do not invent)

- 3D body mesh / avatar
- Drape / cloth simulation
- Seam 3D paths
- Texture UV for fabric
- Camera / AR fitting
- Hip conflict resolution (98/100/102 still unresolved — must not be coerced)

### DO NOT INVENT

- Treating PatternKind projection as garment identity
- Using empty composition registry as “complete garment”
- Feeding Studio heuristics as 3D truth
- Using invoice/PSP data as geometry
