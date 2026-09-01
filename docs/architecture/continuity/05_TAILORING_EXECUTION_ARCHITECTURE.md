# 05 — Tailoring Execution Architecture

**Date:** 2026-09-01  
**Permanent condition (T10 C1):** the trusted deterministic core exists and is **not** the exclusive live Design Studio execution path.

---

## PATH A — Live Design Studio (product UX)

**Powers Design Studio today. FACT.**

```
DesignStudio.tsx
  → application/design (T7 barrel)
      generateStylePattern / generateProductionPlan / analyzeDesignInspiration
  → patternEngine.ts / productionAssistant.ts
  → canvas render / order patch / localStorage drafts
```

| | |
|---|---|
| Input | Mixed measurement blob + garment type + optional inspiration |
| Transformation | Studio-local `getPatternKindForGarment`; aliases bust↔chest etc. **No** T3 `separate` on this path. **No** unit canonicalize. **No** freeze |
| Engine | Protected files, identity re-export |
| Output | Pattern draft in canvas; production plan on session/order; PNG library optional |

Does **not**: freeze MeasurementVersion; create GarmentSpecificationVersion; create CompositionVersion; call `executeTrustedTailoring`; fingerprint provenance.

Two save paths remain: `DesignStudio.handleSaveToOrder` and `AppContext.saveStudioOutputToOrder`.

---

## PATH B — T3 / T6 / T7 workflow

**Powers WorkflowPanel / T6 orchestration. Not the canvas.**

```
WorkflowContext
  → orchestrate.buildWorkflowSpecification
  → requestPattern / requestProductionPlan   (domain gateways)
      → separateLegacyMeasurementBlob
      → generateStylePattern / generateProductionPlan
  → optional persistSpecificationSnapshot → T2 garment repo
```

| | |
|---|---|
| Input | Selected customer / profile / order from AppContext |
| Transformation | T3 measurement separation + garment-type map; T6 specification projection |
| Engine | Same protected engines |
| Output | Pattern summary in workflow panel; production plan written onto local Order |

Freeze on this path is `applyMeasurementProfileToOrder` (snapshot on the order), **not** T8 `MeasurementVersion`.

`runPatternContract` (T9) exists and is **not** what Workflow `generatePattern` calls (`requestPattern` is).

---

## PATH C — P13–P16 trusted deterministic path

**Powers MeasurementWorkspace freeze actions and tests. Not exclusive Studio.**

```
Live measurement blob
  → separate / completeness / plausibility (observe, do not fill)
  → freeze MeasurementVersion (P13) → T2 measurement repo
  → freeze GarmentSpecificationVersion (P14) → T2 garment repo
  → freeze GarmentCompositionVersion (P15) → T2 garment repo
  → executeTrustedTailoring (P16)
      → executeDeterministicPattern / executeDeterministicProductionPlan (T10)
          → canonicalize, unit convert to cm, refuse body↔fabric mix
          → protected engines
          → strip production generatedAt
          → provenance + fnv1a-64 fingerprint
  → TrustedTailoringExecution record (immutable)
```

| Question | Path C answer |
|---|---|
| Freeze MeasurementVersion? | **Yes** (explicit action) |
| GarmentSpecificationVersion? | **Yes** (explicit freeze; unknown types not coerced to bodice) |
| CompositionVersion? | **Yes** (P15; required-component registry empty on purpose) |
| `executeTrustedTailoring`? | **Yes** |
| Fingerprint provenance? | **Yes** (fnv1a-64, not cryptographic) |
| Certified? | **CONDITIONAL** (T10 C1–C7 permanent). Governed boundary certified; not exclusive live UI; not scientific tailoring accuracy |

P17 intelligence **reads** frozen P13–P16 records and must not mutate them (ADR-004). Default provider is a local interpreter, not a verified live LLM.

---

## Path comparison

| Capability | A Studio | B Workflow | C Trusted |
|---|---|---|---|
| Live product canvas | **Yes** | No | No |
| T3 separate | No | Yes | Yes (via freeze inputs) |
| T10 execute | No | No | Yes |
| MeasurementVersion | No | Order snapshot only | Yes |
| Spec / composition versions | No | Spec projection only | Yes |
| Fingerprint | No | No | Yes |
| Exclusive live path | **This is live** | Side panel | **Not exclusive** |

Job sheet export uses T9 **re-exports** of `generateStylePattern` (engine identity), not Path C.

---

## T10 conditions that remain binding (C1–C7)

1. Design Studio still calls T7 identity re-exports — **not** exclusive governed path.
2. Duplicate hip/bust defaults (98/100/102) inventoried, not reconciled.
3. Canvas px/cm **UNKNOWN**.
4. PDF visual equivalence **UNKNOWN**.
5. Fingerprint is fnv1a-64, not a seal.
6. Production Assistant remains heuristic-stable, not a second pattern engine.
7. T8 MeasurementVersion freeze is not Studio-wired; persistent provenance on Order is not certified.

Do not hide C1.
