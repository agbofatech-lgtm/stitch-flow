# T9 Provenance Report

**Date:** 2026-08-31

T9 provenance is a **wrapper** around existing engine results. Engine payloads are unchanged.

| Field | Pattern contract | Production contract |
|---|---|---|
| `sourceEngine` | `patternEngine` | `productionAssistant` |
| `calculationKind` | `pattern-geometry` | `production-plan` |
| `classification` | `deterministic` | `heuristic` |
| `measurementInputUnit` | `cm` | `cm` |
| `fabricOutputUnit` | n/a | `yards` (or plan unit) |
| `measurementVersionId` | optional T8 id | optional T8 id |

## Not persisted

Provenance is not written onto `Order`, not stored in localStorage, and not added to T2 schemas in this slice.

Inspiration analysis uses `calculationKind: inspiration-analysis`, classification heuristic.

## Dual freeze / dual save

T8 freeze and T7 Studio save paths remain distinct. T9 does not merge them.
