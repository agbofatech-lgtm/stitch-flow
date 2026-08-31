# T8 Measurement Authority Map

**Date:** 2026-08-31  
**Vocabulary:** `docs/domain/CANONICAL_DOMAIN_VOCABULARY.md` — do not invent parallel names.

```
CUSTOMER (identity)
  ↓
BODY MEASUREMENTS          AUTHORITATIVE capture (person)
  ↓
MEASUREMENT INTELLIGENCE   T3 separate + T8 provenance/version/units
  ↓
GARMENT SPECIFICATION      T6 GarmentSpecification (handoff)
  ↓
GARMENT MEASUREMENTS       AUTHORITATIVE garment lengths / notes
  ↓
PATTERN MEASUREMENTS       DERIVED projection only
  ↓
PATTERN ENGINE             PROTECTED, cm inputs
  ↓
PRODUCTION INTELLIGENCE    PROTECTED heuristics (wrap, do not rewrite)
```

| Concept | Authority | Must not |
|---|---|---|
| BodyMeasurement | Domain `body.fields` after separation | Be stored only as UI tab state |
| GarmentMeasurement | Domain `garment.fields` | Compete with body as the same class |
| PatternMeasurement | Derived `pattern.fields` | Become a second SoT |
| MeasurementVersion | Frozen T2 `kind: MeasurementVersion` | Be overwritten by live profile edits |
| Order.measurementSnapshot | TRANSITIONAL AppContext freeze | Be treated as T2 completion |
| Studio drafts | LEGACY localStorage | Gain a new key |
| Engine ease / defaults | Protected engine internals | Be reimplemented in UI |

UI → Application adapter → Domain contract → T2 repository. No new localStorage.
