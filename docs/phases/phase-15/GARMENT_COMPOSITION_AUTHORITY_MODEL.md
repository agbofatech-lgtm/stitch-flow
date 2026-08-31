# Garment Composition Authority Model

## Current (FACT)

There is **no** canonical composition authority.

| Candidate | Why it is not composition SoT |
|---|---|
| Live Studio / Order | P14 C1 — transitional |
| T6 `GarmentSpecification` | projection, not frozen composition |
| P14 `GarmentSpecificationVersion` | **intent**, not structure |
| Pattern Engine | geometry for one PatternKind |
| Production Assistant cutting list | heuristic, regenerated, clocked `generatedAt` |
| Canvas | visual |

## Target (PROPOSAL — not implemented)

```
GarmentSpecificationVersion (P14, frozen)
        │
        ▼
Composition evaluation   — NOT BUILT
        │  explicit freeze
        ▼
GarmentCompositionVersion   — NOT JUSTIFIED YET
```

**FACT:** Forensic evidence does **not** require creating `GarmentCompositionVersion` in Stage 0. Creating it now would invent a store without a contract.

**INFERENCE:** A future version entity would reuse T2 create-only (as MeasurementVersion / GarmentSpecificationVersion). That is a later authorization, not this stage.

## Desired consumption direction (binding if implementation is later authorized)

```
Live UI → P14 evaluate/freeze → GarmentSpecificationVersion → P15 composition
```

Bypassing P14 with raw Studio state would be STOP-P15-E.

Phase 15 must not create a second measurement store or second garment-intent store.
