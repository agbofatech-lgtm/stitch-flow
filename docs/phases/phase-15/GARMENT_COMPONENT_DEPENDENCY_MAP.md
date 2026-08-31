# Garment Component Dependency Map

**FACT:** No `requires` / `incompatibleWith` / `optionalComponent` registry exists in domain code.

## Observed relationships (not domain law)

```
GarmentType
    │  mapGarmentTypeToPatternKind (LEGACY compatibility)
    ▼
PatternKind  ──generateStylePattern──►  PatternOutput (derived geometry)

GarmentType + InspirationAnalysis.sleeveStyle
    │  buildCuttingList (PROTECTED heuristic)
    ▼
CuttingPiece[]   (names only; not frozen as composition)

P14 CanonicalGarmentSpecification
    │  optional sleeveStyle/collarStyle strings
    ▼
NO component resolver
```

| From | To | Evidence | Class |
|---|---|---|---|
| dress/gown/blouse/custom | PatternKind bodice | T3/T7 switch | compatibility, **not** “dress = bodice + skirt components” |
| dress cutting list | Front Bodice + Skirt Panels + optional Sleeve | production assistant | **OBSERVED heuristic** |
| agbada cutting list | Inner Tunic Front/Back + Outer Agbada Panel | production assistant | **OBSERVED heuristic**; **no trouser** in that list |
| sleeveStyle === sleeveless | omit Sleeve cutting piece | production assistant | heuristic condition |
| shirt | Collar + Cuff always in cutting list | production assistant | heuristic; P14 collarStyle may be absent |

**PROPOSAL — OWNER DECISION REQUIRED:** Whether heuristic cutting names may be cited as OBSERVED composition candidates. They must **not** be promoted to AUTHORITATIVE defaults (`if (garmentType === 'dress') return DEFAULT_DRESS_COMPONENTS`) without that decision (STOP-P15-F / STOP-P15-C).

**UNKNOWN:** Required vs optional vs incompatible components per garment family.
