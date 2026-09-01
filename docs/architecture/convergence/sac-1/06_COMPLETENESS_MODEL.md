# Completeness Model

Blocking (from existing law):

- `PATTERN_INPUT_FIELDS` for mapped pattern kind (P13). Missing hip for skirt/trouser is blocking. Not filled with 98/100/102.
- Absent `garmentType` (P14 identification).

Advisory only (not invented requirements):

- Optional spec fields (sleeveStyle, fabricType, …)
- Empty P15 required-component registry
- Hip default reconciliation still undecided

Unknown garment type is **not** coerced to bodice. Finalization may still execute; production may skip (`HEURISTIC_OUTPUT` skipped / partial). No silent defaults.
