# 10 — 3D Input Readiness

**Do not start 3D. Do not install Three.js / Babylon. Do not generate assets.**

Principle (ADR-005): **3D IS A CONSUMER, NOT AN AUTHORITY.**

```
Trusted MeasurementVersion
  → Trusted GarmentSpecificationVersion
  → Trusted GarmentCompositionVersion
  → Trusted pattern output (Path C / T10)
  → 3D adapter (future, not SAC)
```

## Availability

| Input | Status | Notes |
|---|---|---|
| Frozen body/garment fields (cm) | **PARTIALLY AVAILABLE** | Path C; not live Studio SoT |
| Garment type known vs unknown | **AVAILABLE** | P14 status; unknown not coerced on Path C |
| Pattern control points / outline | **AVAILABLE** as engine output | 2D polygons; not mesh |
| Ease / construction constants | **AVAILABLE** inside engine | must not be re-derived in 3D |
| Composition component graph | **PARTIALLY AVAILABLE** | types exist; required-component registry **empty** |
| Body landmark set for avatar | **MISSING** | no named 3D landmarks distinct from measurement keys |
| Fabric drape parameters | **MISSING** | fabric record is shop inventory, not mechanical |
| Canvas silhouette vs physical geometry | **FACT they differ** | silhouettes are experience; pattern points are domain |
| Unit: px/cm on canvas | **UNKNOWN** | T10 C3 |
| Hip default 98/100/102 | **UNRESOLVED** | must not be filled by 3D |
| Trusted exclusive Studio path | **MISSING** (T10 C1) | 3D must wait for Path C authority |

**STOP-H:** would trigger if 3D wrote measurements or pattern points. SAC must not allow that. 3D is **FUTURE PROGRAMME**, not an SAC stage.

**RECOMMENDATION:** Do not begin 3D until SAC-1 makes Path C the authoritative pattern artifact (even if canvas remains Path A for UX).
