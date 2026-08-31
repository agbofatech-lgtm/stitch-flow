# Garment Specification Completeness Model

**FACT:** Specification completeness ≠ measurement completeness (Phase 13).

No implemented `assessGarmentSpecificationCompleteness` exists.

## Competing completeness checkers (FACT)

| Checker | Required for “complete” | Authority |
|---|---|---|
| P13 `PATTERN_INPUT_FIELDS` | engine measurement keys for mapped kind | Measurement — Phase 13 |
| `productionAlerts.PROFILE_REQUIRED_FIELDS` | profileType-specific keys (e.g. dress_kaba wants shoulderToWaist, nippleToNipple) | Order UX — **different list** |
| Studio `MEASUREMENT_FIELD_MAP` | UI sliders; optional flags | EXPERIENCE |
| Orders.tsx duplicate field map | order form sliders | EXPERIENCE (copy) |
| `checkOrderCompleteness` | measurements + inspiration + fabric + production_plan | Order workflow, not garment semantics |
| Studio `getOrderMissingAlerts` | any numeric measurement, inspiration, fabric, production plan | EXPERIENCE |

**CONFLICT:** A dress can be P13-complete (bodice keys) while productionAlerts still wants hip/shoulderToWaist, and Studio still shows hip/skirtLength.

## Specification completeness (conceptual — PROPOSAL, not implemented)

Minimum **evidenced** garment-intent fields for a specification to even be classifiable:

- `garmentType` present and in `GarmentType`
- `patternKind` derived via existing map (not independently captured)

Missing sleeve **style** cannot be required: there is no captured sleeve-selection field on Order.

**FACT:** The system today **does** silently present slider minima and canvas defaults. That is UI, not an authorized completeness fill.

**RULE for later implementation:** missing required garment choices stay INCOMPLETE. Do not invent sleeve.
