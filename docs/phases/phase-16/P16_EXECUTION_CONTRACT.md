# P16 Execution Contract

**FACT:** `EXECUTION_CONTRACT_VERSION = trusted-tailoring-execution-v1`

Request authorities (all frozen):

- MeasurementVersion
- GarmentSpecificationVersion
- GarmentCompositionVersion
- ExecutionConfigurationReference (`engine-internal-defaults`, hip unresolved)

Pipeline: validate chain → canonicalize → T10 pattern (if OBSERVED projection) → T10 production (if known garment type) → fingerprints → provenance → immutable snapshot.

PatternKind from composition `patternProjection` is **not** composition identity.
