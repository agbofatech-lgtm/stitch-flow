# Garment Specification Authority Model

Legend: **FACT** / **INFERENCE** / **PROPOSAL**.

## Current (FACT)

| Question | Answer |
|---|---|
| What is current garment intent? | Ambiguous: Studio state vs AppContext vs Order.garmentType |
| What was frozen for this order? | Measurement snapshot may exist. **Garment type is not versioned.** |
| Who is measurement authority? | Phase 13 (do not duplicate) |
| Who is pattern-output authority? | Derived (T10/P13). Not garment specification. |

T6 `GarmentSpecification` is a **handoff DTO**, documented as “fields are FACT from existing Order / profile types — not invented completeness.”

## Required semantic distinction (not implemented)

| Role | Meaning | Current evidence |
|---|---|---|
| LIVE | Mutable working intent | Studio + AppContext + Order fields |
| FROZEN | Immutable historical specification | **ABSENT** as a garment-spec version |

**PROPOSAL (not implemented):** If later authorized, reuse T2 create-only pattern (as T8 MeasurementVersion) rather than a new persistence authority. Do not auto-name `LiveGarmentSpecification` until implementation is authorized.

## Binding to MeasurementVersion

**FACT:** `GarmentSpecification.measurementProfileId` and `measurementVersionCapturedAt` exist. They do not store a T8/T2 MeasurementVersion id.

**FACT:** P13 freeze writes MeasurementVersion separately from Order.measurementSnapshot.

## Second source of truth

Phase 14 Stage 0 introduces **no** store.

Pre-existing dualism (AppContext TRANSITIONAL vs T2) remains. Garment type additionally lives in Studio drafts — LEGACY, not authority.
