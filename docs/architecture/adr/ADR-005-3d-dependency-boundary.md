# ADR-005 — 3D Dependency Boundary

| Field | Value |
|---|---|
| ADR ID | ADR-005 |
| Title | 3D Dependency Boundary |
| Status | **Accepted / Active** |
| Date | 2026-08-31 |
| Authority | Principal Architecture Governance |
| Classification | Constitutional |
| Scope | 3D visualization and virtual fitting |
| Supersession | None |

---

## Context

T0 FACT: no Three.js / glTF / avatar stack. Design Studio is 2D canvas silhouettes plus 2D pattern polygons. 3D is a future consumer, not a present engine.

3D is visually compelling and therefore architecturally dangerous if started before domain truth exists.

---

## Decision

3D shall be a **downstream consumer** of trusted tailoring intelligence.

3D shall **not** be the authority for measurements, pattern mathematics, or garment specification.

```
MEASUREMENT TRUTH
        ▼
GARMENT SPECIFICATION
        ▼
PATTERN TRUTH
        ▼
3D TRANSLATION
        ▼
VISUALIZATION / SIMULATION
```

Never reverse the authority chain.

---

## Maturity model

| Level | Name | Claim allowed |
|---|---|---|
| 1 | Visualization | Preview, rotation, color. **No physical fit accuracy.** |
| 2 | Parametric representation | Approximate proportion from trusted body measurements |
| 3 | Virtual fitting | Requires topology, panels, seams, material, collision, ease, simulation |

**Stop:** no Level 3 until Measurement Intelligence = TRUSTED, Garment Specification = CANONICAL, Pattern Output = CONTRACTED, Pattern Topology = AVAILABLE.

---

## Marketing integrity

Must not claim “virtual fitting” when only visualization exists. Capability naming must match technical maturity.

---

## Constraints

Do not add a 3D library in T1–T7 “to get ahead.” STOP-ADR-05.

---

## Enforcement

3D dependency gate.
