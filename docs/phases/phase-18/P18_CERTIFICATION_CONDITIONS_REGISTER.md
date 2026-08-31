# P18 Certification Conditions Register

Inherited conditions are **not erased**.

| ID | Condition | Origin | Severity | Certification impact | Resolution |
|---|---|---|---|---|---|
| P18-C-001 | Live Studio / AppContext / drafts transitional | T10 C1 / P14 | High | Conditional | Deferred exclusive path |
| P18-C-002 | Hip 98 / 100 / 102 unresolved | T10 C3 / P16 | High | Conditional | Do not reconcile |
| P18-C-003 | Canvas px ≠ physical unit | T10 C4 | Med | Conditional | Deferred |
| P18-C-004 | PDF visual equivalence unknown | T10 | Med | Conditional | Deferred |
| P18-C-005 | Historical inch snapshots unknown | T10 | Med | Conditional | Deferred |
| P18-C-006 | fnv1a-64 not cryptographic | T10 / P16 | Med | Conditional | Documented |
| P18-C-007 | Composition required-component graph empty | P15 | High | Conditional | Evidence required |
| P18-C-008 | jobSheetExport legacy engine path | P16 | Med | Conditional | Migration not authorized |
| P18-C-009 | Engine-internal defaults still apply when keys missing | P16 | High | Conditional | Observable, not governed fill |
| P18-C-010 | Production output heuristic | P16 | Med | Conditional | Not tailoring law |
| P18-C-011 | Real AI provider live certification absent | P17 | Med | Conditional | Operational item |
| P18-C-012 | local-governed is not an LLM | P17 | Med | Conditional | Naming honesty |
| P18-C-013 | Studio “AI Suggestion” is keyword heuristic | ADR-004 | Med | Conditional | Not Phase 17 |
| P18-C-014 | Pre-existing tsc failures | historical | Low | Non-blocking of product tests | Not repaired |
| P18-C-015 | Browser performance targets not measured | P18 | High | Unknown / not testable | Need device lab |
| P18-C-016 | Tenant isolation not live-tested | P18 | High | Unknown | Need security scenario |
| P18-C-017 | Full offline browser matrix not run | P18 | Med | Conditional | T2 unit evidence only |
| P18-C-018 | Dual T6 vs P14 specification path | P14 | High | Conditional | Not exclusive |
| P18-C-019 | T10 C2–C7 remainder | T10 | Med | Conditional | Permanent |
| P18-C-020 | Business CRUD unmounted by default | T1 | Med | Conditional (security positive; product API limited) | Intentional |

**BLOCKING for CERTIFIED (unconditional):** none that failed domain golden path.  
**BLOCKING for claiming exclusive product-ready UX/perf/security lab certification:** C-015, C-016, C-017, C-001.

Outcome: **CONDITIONALLY CERTIFIED** — core governed chain works; product-wide lab certification incomplete.
