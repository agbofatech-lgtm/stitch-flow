# Phase 13 Stage 0 — Measurement Intelligence Forensics

| Field | Value |
|---|---|
| Date | 2026-08-31 |
| T10 checkpoint | `transformation-t10-trusted-deterministic-core-complete` → `563a240db2ba453c1b0196d84ce3752c7b9f6689` |
| Mode | Investigation then implementation from repository evidence |
| Legend | **FACT** / **INFERENCE** / **PROPOSAL** / **UNKNOWN** |

T8 foundation and T10 governed core already exist. Phase 13 must not invent a second measurement system.

---

## 1. Taxonomy — FACT

| Name | Authority | Mutability | Location |
|---|---|---|---|
| MeasurementProfile (`CustomerMeasurementProfile`) | TRANSITIONAL live capture | Mutable | AppContext localStorage |
| MeasurementSet (`kind: MeasurementSet`) | T2 persist of a separated blob | Updatable | T2 `measurement` repository |
| MeasurementVersion (`kind: MeasurementVersion`) | AUTHORITATIVE historical freeze | Frozen | T8 + T2 create-only |
| OrderMeasurementSnapshot | TRANSITIONAL freeze-ish | Order-owned; live profile must not silently rewrite numbers | AppContext Order |
| PatternMeasurement | DERIVED projection `derivedFrom: 'body+garment'` | Regenerated | `projectPatternMeasurements` |
| Studio drafts | LEGACY | Session | `stitchflow:design-studio:drafts` (unchanged key) |
| Engine `ExtendedMeasurements` | DUPLICATED / DERIVED | — | Protected engine input shape |

**FORBIDDEN parallel:** a new “Measurement Intelligence” entity family that does not map onto the names above (ADR-003).

**PROPOSAL (this phase):** classify records explicitly; freeze live profiles into MeasurementVersion; do not migrate AppContext off localStorage.

---

## 2. Semantics — FACT

| Class | Meaning |
|---|---|
| Body | Person-taken lengths (`BODY_MEASUREMENT_FIELDS`) |
| Garment | Garment lengths / notes (`GARMENT_MEASUREMENT_FIELDS`) |
| Pattern | Engine-consumed keys per kind (`PATTERN_INPUT_FIELDS`) — not a third capture vocabulary |
| Units | Engine centimetres. T8 converts `in` → cm in front of the engine (`CM_PER_INCH = 2.54`). Fabric yards are a different family (T9/T10). |
| Aliases | chest↔bust, sleeve↔sleeveLength, ankle↔aroundAnkle — anti-corruption, not a second system |
| Defaults | Path-specific. Hip 98 (engine) / 100 (UI/job sheet) / 102 (assistant/canvas). **Unresolved (T10 C3).** |

**INFERENCE:** Treating a live profile as the numbers used at cut time is unsafe.

**UNKNOWN:** Historical inch snapshots already stored without a declared unit.

---

## 3. Dependency graph — FACT

```
Customer (identity)
  → MeasurementProfile (live, TRANSITIONAL)
  → separateLegacyMeasurementBlob (T3)
  → freezeMeasurementVersion (T8) → T2 MeasurementVersion
  → engineInputFromVersion (cm)
  → T10 governed adapter → protected Pattern Engine
  → PatternOutput (derived; not SoT)
  → T9/T10 production contract → protected Production Assistant (heuristic)
```

Parallel TRANSITIONAL path (not deleted):

```
Profile → applyMeasurementProfileToOrder → Order.measurementSnapshot
       → Design Studio identity re-exports (T7) → engines
```

**FACT:** Design Studio still does not call `executeDeterministic*`. T10 C1.

**FACT:** Workflow freeze writes the order snapshot, not T8 MeasurementVersion.

---

## 4. Completeness — FACT

Required engine-consumed keys (T3 `PATTERN_INPUT_FIELDS`, not invented):

| Kind | Required keys |
|---|---|
| bodice | bust, waist, neck, shoulder, backLength, bustSpan, armholeDepth |
| shirt | chest, neck, shoulder, sleeve, backLength |
| trouser | waist, hip, trouserLength, thigh, knee, ankle |
| skirt | waist, hip, skirtLength |
| kaftan | chest, shoulder, backLength, neck |

**FACT:** Protected engine `validateAndRead` fills missing keys from internal defaults / formulas. That is engine-owned, not Phase 13 completeness.

**PROPOSAL:** Phase 13 reports missing required keys and **refuses** to pretends a set is complete by applying 90/96/98/102.

**UNKNOWN:** Whether a tailor considers bustSpan/armholeDepth optional in shop practice. Evidence is the engine field list only.

---

## 5. Version authority — FACT

| Operation | Authority |
|---|---|
| Live edit of profile | AppContext (TRANSITIONAL) |
| Freeze MeasurementVersion | T8 `freezeMeasurementVersion`; T2 create-only |
| Patch frozen version | `refuseFrozenMutation` STOP |
| Order snapshot freeze | Workflow `applyMeasurementProfileToOrder` (TRANSITIONAL) |
| Studio draft | LEGACY key; not T2 |

**PROPOSAL:** Measurement workspace may persist MeasurementVersion through T2 without replacing AppContext.

---

## 6. Validation vs plausibility — FACT

| Layer | What it is | What it is not |
|---|---|---|
| T8 `validateMeasurementValue` | Finite number + known body/garment field | Range / fit quality |
| Engine `MEASUREMENT_RANGES` | AUTHORITATIVE inside `patternEngine.ts` | Domain copy (STOP-P13-C) |
| UI slider min/max | EXPERIENCE; forensic audit notes drift vs engine | Domain authority |
| Engine fallbacks | Applied when keys missing | Completeness |

**PROPOSAL:** Structural validation stays T8. Plausibility vs engine ranges is **observed** by calling the protected engine on a **complete** set and catching `PatternValidationError`. Domain must not copy min/max/default tables.

**UNKNOWN:** Scientific body-proportion plausibility (waist < hip, etc.). Not in repository as a named rule. Do not invent.

---

## 7. T10 integration — FACT

| Piece | Status |
|---|---|
| Canonical input + governed adapter | T10 COMPLETE / CONDITIONAL |
| `measurementVersionId` on contracts | Present |
| Freeze → governed execute in UI | **Not wired** (T8 deferred; T10 C1) |
| Exclusive Studio path | **Not certified** |
| Fingerprint | fnv1a-64, non-crypto |

**PROPOSAL:** Application adapter: frozen version → completeness STOP if missing → `engineInputFromVersion` → `governedPatternFromLoose`. No engine rewrite.

---

## 8. INFERENCE

Without completeness-before-engine, “pattern generated” can mean “engine defaulted hip/bust.” That would silently violate T10 C3 if Phase 13 claimed completeness.

## 9. PROPOSAL (authorized implementation)

1. Taxonomy classifier (existing names only).
2. Completeness from `PATTERN_INPUT_FIELDS` only.
3. Validation vs plausibility split; engine ranges by observation.
4. Version freeze to T2 from Measurement workspace.
5. T10 governed execute from frozen version when complete.
6. No Design Studio rewrite, no new localStorage, no hip reconciliation, no Phase 13 completion tag.
