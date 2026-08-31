# P14 Versioning Model

```
LIVE intent  →  evaluate  →  explicit freezeGarmentSpecification
        →  GarmentSpecificationVersion { frozen: true }
        →  T2 repositories.garment.create
```

Independent of MeasurementVersion. Optional `measurementVersionId` is a reference only.

`createdAt` is metadata, excluded from fingerprint identity.

Refuse patch: `refuseFrozenGarmentSpecificationMutation`.
