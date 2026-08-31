# Garment Intent Dependency Map

```
LIVE UI (Design Studio garmentType, drafts, AppContext.selectedGarmentType)
        │  handleSaveToOrder / Orders form
        ▼
ORDER RECORD (garmentType, fitType, inspiration id, fabric id, pattern id,
              garmentMeasurements, measurementSnapshot, productionPlan)
        │  T6 buildGarmentSpecification (projection)
        ▼
GarmentSpecification { garmentType?, patternKind, separated measurements,
                       fabric/inspiration ids, productionPlanPresent }
        │  optional T2 repositories.garment.create (kind: GarmentSpecification)
        ▼
T2 garment snapshot  — NOT MeasurementVersion-class immutability

PARALLEL:
  profileType  ⇄  garmentType  (lossy; dress_kaba ↔ dress/gown/kaftan/agbada/bodice)
  DesignCategory / PatternType  ⇄  garmentType  (not bijective)
  mapGarmentTypeToPatternKind / getPatternKindForGarment  →  PatternKind (5)
        │
        ▼
  Pattern Engine (protected) / Production Assistant (protected)
```

**FACT:** Three copies of the 11→5 map exist: T3 `mapGarmentTypeToPatternKind`, DesignStudio `getPatternKindForGarment`, unused `garmentLogic.getPatternKindForGarment`. Values match.

**FACT:** T6 persist is a snapshot of the projection at call time. Later `updateOrder({ garmentType })` does not rewrite that T2 record automatically. Order fields remain LIVE.

**INFERENCE:** Historical garment **style** on an order is only as frozen as whoever last wrote `Order.garmentType`. There is no refuse-mutate for garment type analogous to T8 `refuseFrozenMutation`.
