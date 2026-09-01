# P1 Visual Foundation Forensics

Predecessor PEX P0: `1e1bea04b36094dbb308526773ddef3af02c50aa`. Working tree was clean. Protected hashes match.

## Inventory (FACT)

| Location | Role |
|---|---|
| `experience/tokens` | Semantic tokens — now the constitution |
| `experience/primitives` | Button, forms, overlays, table, StatusBadge |
| `components/*` except DesignStudio | Migrated off `#0F6E8C` / slate-sky (this slice) |
| `DesignStudio.tsx` | **PROTECTED** — 44 hex leftovers remain |
| `jobSheetExport.ts` | Print CSS — not product chrome |
| `Layout.tsx` | Unused by App; still token-migrated |
| Control Center | Already on primitives |

Tokens existed in P0 but most CRUD screens ignored them. P1/P2 migrates those surfaces onto the system.
