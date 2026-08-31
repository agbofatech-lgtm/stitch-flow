# Architecture Decision Records

**Status:** Active  
**Date adopted:** 2026-08-31  
**Master pack:** [`docs/transformation/STITCHFLOW_ADR_MASTER_PACK.md`](../../transformation/STITCHFLOW_ADR_MASTER_PACK.md)

| ID | Title | Status | File |
|---|---|---|---|
| ADR-001 | Protected Domain Intelligence | Accepted / Active | [ADR-001-protected-domain-intelligence.md](./ADR-001-protected-domain-intelligence.md) |
| ADR-002 | Offline-First Authority Model | Accepted / Active | [ADR-002-offline-first-authority.md](./ADR-002-offline-first-authority.md) |
| ADR-003 | Canonical Domain Vocabulary | Accepted / Active | [ADR-003-canonical-domain-vocabulary.md](./ADR-003-canonical-domain-vocabulary.md) |
| ADR-004 | AI Advisory Boundary | Accepted / Active | [ADR-004-ai-advisory-boundary.md](./ADR-004-ai-advisory-boundary.md) |
| ADR-005 | 3D Dependency Boundary | Accepted / Active | [ADR-005-3d-dependency-boundary.md](./ADR-005-3d-dependency-boundary.md) |
| ADR-006 | Commercial Platform Governance | Accepted / Active | [ADR-006-commercial-platform-governance.md](./ADR-006-commercial-platform-governance.md) |
| ADR-007 | AGBOFA Platform Control Center Authority | Accepted / Active | [ADR-007-agbofa-control-center-authority.md](./ADR-007-agbofa-control-center-authority.md) |
| ADR-008 | Experience System as Architectural Requirement | Accepted / Active | [ADR-008-experience-system-requirement.md](./ADR-008-experience-system-requirement.md) |
| ADR-009 | One Authoritative Backend Runtime | Accepted / Active | [ADR-009-authoritative-backend-runtime.md](./ADR-009-authoritative-backend-runtime.md) |
| ADR-010 | Contract-First Integration | Accepted / Active | [ADR-010-contract-first-integration.md](./ADR-010-contract-first-integration.md) |
| ADR-011 | Configuration over Hardcoding | Accepted / Active | [ADR-011-configuration-over-hardcoding.md](./ADR-011-configuration-over-hardcoding.md) |

**T0 compliance note (FACT, not a weakening of ADRs):** the current repository **violates** ADR-002, ADR-009, and ADR-010 in its running state. That is why T1–T2 exist. ADRs govern *implementation from this point*. They do not rewrite git history. Silent “compliance” by deleting protected files is itself a violation of ADR-001.
