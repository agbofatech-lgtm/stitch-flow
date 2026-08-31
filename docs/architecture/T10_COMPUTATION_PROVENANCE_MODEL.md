# T10 Computation Provenance Model

**Status:** IMPLEMENTED as runtime metadata. Not persisted on Order (T9 condition 7 remains).  
**Date:** 2026-08-31

## DETERMINISTIC IDENTITY (fingerprint input)

- computation type
- computation version
- input contract version
- engine source identity (T0 SHA-256)
- configuration identity (`engine-internal-defaults`)
- canonical unit (`cm`)
- canonical input (sorted keys, cm)

## OPERATIONAL METADATA (not in fingerprint)

- `generatedAt` (ISO string) — copied from Production Assistant `new Date()` when present
- `measurementVersionId` — T8 freeze id if the caller supplied it
- `executedAt` — **not recorded** in T10.1 (would be another clock)

## Provenance fields

| Field | Pattern | Production |
|---|---|---|
| computationAuthority | `domain/tailoring/deterministic` | same |
| engineIdentifier | `patternEngine` | `productionAssistant` |
| boundaryIdentifier | `executeDeterministicPattern` | `executeDeterministicProductionPlan` |
| computationVersion | `pattern-v1` | `production-plan-v1` |
| inputContractVersion | `measurement-input-v1` | `measurement-input-v1` |
| canonicalUnit | `cm` | `cm` |
| fabricOutputUnit | n/a | plan unit or `yards` |
| configurationIdentity | `engine-internal-defaults` | `engine-internal-defaults` |
| classification | `deterministic` | `heuristic` |
| deterministicStatus | `identity-stable` | `identity-stable-excluding-generatedAt` |

T9 `TailoringProvenance` remains an application wrapper. T10.1 provenance is the domain envelope. They are not merged in this slice.
