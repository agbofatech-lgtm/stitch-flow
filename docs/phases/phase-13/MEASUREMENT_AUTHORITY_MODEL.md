# Measurement Authority Model

Legend: **FACT** / **INFERENCE** / **PROPOSAL** / **UNKNOWN**

## Who may write what — FACT

| Operation | Authority | Must not |
|---|---|---|
| Edit live profile | AppContext MeasurementProfile | Pretend it is frozen history |
| Persist MeasurementSet | T2 measurement repo | New localStorage key |
| Freeze MeasurementVersion | T8 `freezeMeasurementVersion` + T2 create | Patch frozen payload |
| Refuse frozen patch | `refuseFrozenMutation` STOP | Silent overwrite (STOP-P13-D) |
| Order snapshot | `applyMeasurementProfileToOrder` | Claim T2 / T8 completion |
| Studio draft | LEGACY key only | Extra draft key |
| Pattern projection | `projectPatternMeasurements` | Become capture SoT |
| T10 execute | governed adapter from frozen complete version | Fill hip/bust defaults in Phase 13 |
| Engine ranges / ease | Protected `patternEngine.ts` | Copy into domain (STOP-P13-C / A) |

## Version lineage — FACT

T8 versions have `id`, `frozen: true`, `provenance.version` (monotonic integer on the set), `capturedAt`. **No `parentVersionId` field exists.**

**PROPOSAL:** do not invent lineage pointers in this slice. New freeze = new id. Live profile remains a separate mutable record.

## Provenance — FACT

`source`: body-capture | profile | order-snapshot | studio-session | derived-formula | legacy-blob  
`verification`: unverified | verified | rejected  
`derived-formula` is not body capture.

Runtime T10 provenance ≠ persistent Order audit (T10 C7).

## Confidence — FACT / PROPOSAL

Inspiration analysis has a `confidence?: number` heuristic. Measurement capture has **no** confidence field. **PROPOSAL:** do not add one.

## Dual SoT — FACT

AppContext remains TRANSITIONAL UI SoT. T2 is authoritative for new domain writes. Phase 13 must not migrate or delete AppContext (STOP-P13-E).

## INFERENCE

Order snapshot `capturedAt` plus weak T6 bust-or-timestamp check is not MeasurementVersion immutability.
