# StitchFlow Architecture Constitution — Index

**Status:** Active pointer  
**Date:** 2026-08-31  

This file does **not** invent constitutional law beyond owner-issued artifacts.

## Level 1 — Constitution (philosophy)

Owner-issued Transformation Constitution (external to this index until a full text is deposited).

Operational copies already in-repo:

- [`docs/transformation/MASTER_TRANSFORMATION_PHASE_MATRIX.md`](../../transformation/MASTER_TRANSFORMATION_PHASE_MATRIX.md) — pointer/stub, not the full owner-issued matrix text

`docs/transformation/STITCHFLOW_MASTER_PHASE_MATRIX.md` is **not present**. This index does not invent that file.

## Level 2 — ADRs (decisions)

[`docs/transformation/STITCHFLOW_ADR_MASTER_PACK.md`](../../transformation/STITCHFLOW_ADR_MASTER_PACK.md)

Individual records: [`docs/architecture/adr/`](../adr/)

## Level 3 — Phase execution

T0 pack: [`docs/transformation/T0_ARCHITECTURE_GATE.md`](../../transformation/T0_ARCHITECTURE_GATE.md)

## Conflict hierarchy (binding)

1. Owner-approved constitutional rules  
2. Accepted ADRs  
3. Master Transformation Phase Matrix  
4. Individual phase master prompts  
5. Implementation convenience  

Implementation convenience shall never override architecture governance.

## Conflict priority when two ADRs appear to collide

1. Domain truth (ADR-001)  
2. Data integrity (ADR-002)  
3. Security and governance (ADR-006, ADR-007)  
4. Architectural boundaries (ADR-009, ADR-010)  
5. Product experience (ADR-008)  
6. Delivery speed  

## Agent constitutional instructions

1. Read applicable ADRs before modifying architecture.  
2. If implementation conflicts with an ADR: STOP.  
3. Do not modify protected domain intelligence without regression evidence.  
4. Do not introduce a persistence path outside ADR-002.  
5. Do not create duplicate domain terminology (ADR-003).  
6. Do not allow AI output to silently mutate deterministic truth (ADR-004).  
7. Do not begin Level 3 3D fitting before ADR-005 gates.  
8. Do not hardcode commercial policy (ADR-006, ADR-011).  
9. Do not bypass AGBOFA Control Center authority (ADR-007).  
10. If a decision does not exist: observe → document → propose ADR → wait.
