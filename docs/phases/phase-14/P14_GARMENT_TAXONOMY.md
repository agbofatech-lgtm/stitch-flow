# P14 Garment Taxonomy

**FACT:** Known garment types = repository `GarmentType` (11 values). Known fit types = repository `FitType` (6 values).

Classification (`classifyGarmentType`) is independent of `mapGarmentTypeToPatternKind`.

| Input | P14 status | Legacy map (isolated) |
|---|---|---|
| dress / gown / blouse / custom / bodice | known | bodice |
| shirt / senator | known | shirt |
| trouser / skirt / kaftan / agbada | known | matching kind / kaftan |
| empty | absent | n/a |
| tuxedo, sleeve, trousers, suit | unknown | bodice (**not P14 authority**) |

Components: **DEFERRED / UNKNOWN** — no first-class graph. PatternType sleeve/collar are not garment types.

Visual silhouette: EXPERIENCE, not taxonomy.
