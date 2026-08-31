# P13 T10 Integration Verification

## Governed Phase 13 path — FACT

```
MeasurementVersion
  → Canonical / governed input
  → executeDeterministicPattern (T10)
  → Versioned output + provenance + fingerprint
```

`executeGovernedPatternFromVersion` completeness-gates then `governedPatternFromLoose`. Incomplete hip STOPs. Tests match protected engine output.

Phase 13 does not mutate engines, alter engine defaults, or add a hidden second engine.

## Remaining computation callers (non-test)

| Caller | Path | Class |
|---|---|---|
| `application/measurement/t10Integration.ts` | T10 governed | **AUTHORIZED** |
| `application/tailoring/pattern.ts` `runPatternContract` | T10 governed | **AUTHORIZED** |
| `domain/tailoring/deterministic/execute.ts` | T10 wrap of protected engines | **AUTHORIZED** |
| `domain/measurement/plausibility.ts` | `requestPattern` observation only | **AUTHORIZED** (read-only observe) |
| `domain/pattern/gateway.ts` `requestPattern` | T3 wrap | **TRANSITIONAL** |
| `application/design/patternAdapter.ts` identity re-export | T7 | **LEGACY** / T10 C1 |
| `components/DesignStudio.tsx` | T7 `generateStylePattern` / `generateProductionPlan` | **LEGACY** |
| `application/tailoring/production.ts` `runProductionContract` | T7 `generateStudioProductionPlan` (governed adapter imported unused) | **TRANSITIONAL** |
| `context/AppContext.tsx` | T9 re-export `generateProductionPlan` | **LEGACY** |
| `components/Orders.tsx` | T9 re-export `generateProductionPlan` | **LEGACY** |
| `workflow/orchestrate.ts` | T3 `requestPattern` | **TRANSITIONAL** |
| `modules/services/jobSheetExport.ts` | T9 identity `generateStylePattern` | **LEGACY** |
| `*.bak*` copies | unused backups | **UNUSED** |

**FACT:** Live Studio is not exclusive T10 (T10 C1). Phase 13 does not claim otherwise.

**FACT:** Phase 13 production-from-version was not implemented (no invented production required-field list).

Result: **CONDITIONAL** — governed measurement→pattern path PASS; exclusive product execution FAIL by T10 C1 (pre-existing, not a P13 bypass).
