# P13 Completeness Matrix

Authority: T3 `PATTERN_INPUT_FIELDS` + T3/T7 `mapGarmentTypeToPatternKind`. **FACT.** Studio `MEASUREMENT_FIELD_MAP` is EXPERIENCE, not this matrix.

Missing required key → INCOMPLETE. Phase 13 does **not** fill 90/96/98/100/102.

| Garment Type | Pattern Kind | Required Inputs | Completeness Result |
|---|---|---|---|
| bodice | bodice | bust, waist, neck, shoulder, backLength, bustSpan, armholeDepth | complete iff all present |
| dress | bodice | same as bodice | UI hip/skirtLength are **not** required |
| gown | bodice | same as bodice | same |
| blouse | bodice | same as bodice | same |
| custom | bodice | same as bodice | same |
| shirt | shirt | chest, neck, shoulder, sleeve, backLength | bust alias may satisfy chest |
| senator | shirt | same as shirt | same |
| trouser | trouser | waist, hip, trouserLength, thigh, knee, ankle | missing hip → INCOMPLETE |
| skirt | skirt | waist, hip, skirtLength | missing hip → INCOMPLETE |
| kaftan | kaftan | chest, shoulder, backLength, neck | — |
| agbada | kaftan | same as kaftan | UI fullLength is **not** engine-required |
| *(any other string)* | bodice (**pre-existing default**) | bodice set | **FACT** of `mapGarmentTypeToPatternKind` default; not a Phase 13 invention. Status is explicit mapped-default, not a new table. |

**UNKNOWN:** shop-optional vs engine-required for bustSpan/armholeDepth beyond the engine field list.

**FACT:** Hip conflict 98/100/102 remains unresolved (`hipConflictUnresolved()` true).
