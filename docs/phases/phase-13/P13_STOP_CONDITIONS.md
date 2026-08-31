# Phase 13 Stop Conditions

| ID | Trigger | Action |
|---|---|---|
| STOP-P13-A | Protected Pattern Engine / Production Assistant / Design Studio hashes change, or formulas are copied into a second engine | IMMEDIATE STOP |
| STOP-P13-B | A second measurement source of truth is created (new localStorage key, parallel field vocabulary, or AppContext replaced without ADR) | STOP |
| STOP-P13-C | Invented formulas, invented required-field lists, or invented min/max ranges (including copying `MEASUREMENT_RANGES` into domain) | STOP |
| STOP-P13-D | Hip/bust/chest defaults 98/100/102 (or 90/96) are silently reconciled or applied by Phase 13 | STOP |
| STOP-P13-E | AI, 3D, billing, or Control Center work is started | STOP |
| STOP-P13-F | Phase 13 completion tag created without owner acceptance | STOP |

Micro-gates are prohibited. T0–T10 tags must not be moved. Existing `phase-13-complete` (legacy programme) must not be retagged.

Transformation programme is complete at T10. This is product Phase 13, not T11.
