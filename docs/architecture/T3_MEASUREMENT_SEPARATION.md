# T3 Measurement Separation

Intended ADR-003 split is now **enforced at the domain gateway**. Legacy types in `shared/types/index.ts` are **not mass-renamed**.

| Class | Meaning | Storage |
|---|---|---|
| BodyMeasurement | Taken on the person | `body.fields` |
| GarmentMeasurement | Garment lengths / notes | `garment.fields` + `notes` |
| PatternMeasurement | Engine input projection | derived from body+garment; **not SoT** |

Units: centimetres inside the Pattern Engine (ADR-001). T8 adds an explicit conversion boundary (`cm`/`in` → centimetres) **in front of** the engine; it does not change engine formulas.

Unknown numeric keys **STOP** (`DomainUnassignableError` / throw). Do not guess.

Aliases (anti-corruption, not a second system): chest↔bust, sleeve↔sleeveLength, ankle↔aroundAnkle.

T3 persist path: T2 `measurement` repository payload `kind: MeasurementSet`.
