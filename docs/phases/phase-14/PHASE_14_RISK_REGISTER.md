# Phase 14 Risk Register

| ID | Risk | Class | Mitigation |
|---|---|---|---|
| P14-R1 | Multiple garment-type vocabularies (GarmentType vs profileType vs DesignCategory vs PatternType) | FACT / CONFLICT | Do not pick a silent canonical in implementation without owner authority |
| P14-R2 | Studio UI defaults look like captured intent | FACT | Classify Category B; never promote sliders’ min to specification |
| P14-R3 | Dress/gown mapped to bodice only | FACT | Keep as map FACT; do not invent dual-block compilation |
| P14-R4 | T6 GarmentSpecification mistaken for frozen version | INFERENCE | Document DTO vs version; reuse T2 create-only if freeze is later authorized |
| P14-R5 | Dual order-save paths diverge snapshots | FACT (T7) | Do not merge silently |
| P14-R6 | Protected engines used as specification completeness | FACT | Completeness ≠ engine defaults |
| P14-R7 | Visual silhouette treated as geometry | FACT / T10 C4 | STOP-P14-H |
| P14-R8 | Heuristic inspiration labelled AI | FACT | Not ML; not authority |
| P14-R9 | Pulling pattern compilation into P14 | PROPOSAL risk | STOP-P14-J |
| P14-R10 | Second SoT if new localStorage key added | — | Forbidden |
