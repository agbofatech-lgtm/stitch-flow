# T10 Deterministic Computation Contract

**Status:** IMPLEMENTED as T10.1 infrastructure. **Not** trusted-core certification.  
**Date:** 2026-08-31  
**Vocabulary:** Relates to ADR-003 PatternRequest / PatternOutput / ProductionPlan / MeasurementVersion. New names are contract types, not parallel domain entities.

## Names

| Contract type | Role |
|---|---|
| `DeterministicComputationRequest` | Explicit request: type, kind, measurements, declared unit |
| `CanonicalInput` | Sorted, unit-normalized, undefined-omitted input |
| `DeterministicComputationResult<T>` | `{ result, normalizedOutput, provenance, fingerprint, operationalMetadata }` |
| `ComputationProvenance` | Authority / engine / version / units / classification |
| `ComputationFingerprint` | Non-cryptographic identity of deterministic payload |
| `ComputationVersion` | `pattern-v1` \| `production-plan-v1` |

FORBIDDEN parallel: a second Pattern Engine.

## Request must identify

- computation type (`pattern-geometry` \| `production-plan`)
- input contract version (`measurement-input-v1`)
- measurement authority (optional `measurementVersionId`; not required)
- declared input units (`cm` \| `in`; default `cm`)
- canonical engine units (`cm`)
- deterministic configuration identity (`engine-internal-defaults`)
- engine source identity (T0 SHA-256 constant)
- computation version

No React state is required.

## Execution path (IMPLEMENTED)

```
Request
  → validate finite numbers / known unit
  → canonicalize (sort keys, omit undefined)
  → convert length to cm if declared `in` (T8)
  → refuse body↔fabric family mix
  → protected engine
  → normalize output (production: drop generatedAt)
  → provenance + fingerprint of deterministic identity
```

Engines are not copied. Formulas are not rewritten.

## Classification

| Kind | FACT |
|---|---|
| pattern-geometry | Pattern Engine; classification `deterministic` |
| production-plan | Production Assistant; classification `heuristic`; identity excludes `generatedAt` |
