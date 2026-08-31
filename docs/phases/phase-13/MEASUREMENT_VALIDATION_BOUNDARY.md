# Measurement Validation Boundary

Legend: **FACT** / **INFERENCE** / **PROPOSAL** / **UNKNOWN**

## Structural validation — FACT (Phase 13 / T8)

Allowed:

- known body or garment field (T3 classify);
- finite number;
- declared unit `cm` | `in` (unknown unit STOP);
- no UI-only keys on the contract;
- no string→number coercion on the governed path (T10).

Not structural validation:

- “this bust looks too large for a human”;
- waist < hip;
- BMI or proportion rules.

## Domain plausibility — FACT / UNKNOWN

Engine `MEASUREMENT_RANGES` and `PatternValidationError` (`out of safe range`) are AUTHORITATIVE **inside the engine**. Domain must not copy min/max/default.

Phase 13 observes engine rejection only on a **complete** required set. Incomplete sets are not sent (engine would default missing keys).

UI slider min/max **drift** from engine (FACT): e.g. Studio bodice waist max 120 vs engine 140; shoulder max 18 vs 22. EXPERIENCE, not domain.

**UNKNOWN:** scientific / professional plausibility tables. Do not silently reject human measurements on invented assumptions.

## Completeness — FACT

Minimum viable for **governed pattern** = T3 `PATTERN_INPUT_FIELDS` for the mapped PatternKind.

| PatternKind | Required (engine-consumed keys) |
|---|---|
| bodice | bust, waist, neck, shoulder, backLength, bustSpan, armholeDepth |
| shirt | chest, neck, shoulder, sleeve, backLength |
| trouser | waist, hip, trouserLength, thigh, knee, ankle |
| skirt | waist, hip, skirtLength |
| kaftan | chest, shoulder, backLength, neck |

Optional in UI only (Studio `optional: true`) is **not** used as Phase 13 required-list authority.

Missing handling: report missing; STOP before T10 execute; **do not** apply 90/96/98/100/102.

Conditional measurements: only via garmentType → PatternKind map already in `mapGarmentTypeToPatternKind`. No extra dress/agbada formulas.

## T10 integration — FACT / PROPOSAL

Phase 13 may: provide governed inputs; freeze snapshots; derive pattern projections.

Phase 13 must not: overwrite deterministic outputs; modify protected engines; create competing computation authority.
