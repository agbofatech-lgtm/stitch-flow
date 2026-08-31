# T10 Unit Safety Boundary

**Status:** IMPLEMENTED as guards + T8 reuse.  
**Date:** 2026-08-31

| Kind | Canonical | Display | Engine | Material |
|---|---|---|---|---|
| Body length | cm | Studio labels cm; inches only if declared on T8 freeze / T10 request | cm | n/a |
| Garment length | cm (same family as body) | cm | cm | n/a |
| Pattern geometry | cm | canvas `px/cm` **UNKNOWN** | cm | n/a |
| Fabric quantity | yards default | UI shows plan.unit | n/a (not pattern) | yards / meters / pieces |

## Allowed conversions

- `in` → `cm` via T8 `CM_PER_INCH = 2.54` **before** Pattern Engine
- fabric yards ↔ meters via T9 `METRES_PER_YARD = 0.9144` **within fabric family only**

## Prohibited

- body centimetres treated as fabric yards
- `bodyCm / 91.44` or any implicit body→fabric conversion
- display formatting (`toFixed`, locale strings) as computation authority
- changing engine rounding

T10.1 `executeDeterministicProductionPlan` requires measurement input unit cm (same STOP as T9). It does not convert body length into `fabricEstimate`.
