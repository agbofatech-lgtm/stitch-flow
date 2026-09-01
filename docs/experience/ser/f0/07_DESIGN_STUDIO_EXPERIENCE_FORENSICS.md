# Design Studio experience forensics

**Protected internals not modified. Not rewritten. Not visually scored.**

## Arrival

Nav → workspace `design` → `DesignStudioFrame` → `<DesignStudio />`.

Frame SOURCE: kicker “Pattern table”, title “Design Studio”, badges “Protected engine hosted — not rewritten”. This is honest engineering chrome, not an immersive atelier door.

No customer/order object is required to enter. Workflow inspector *may* show context if previously selected.

## Protected vs frame

| Layer | What it is |
|---|---|
| Protected | `patternEngine`, canvas geometry, Path A `useMemo` generation, productionAssistant calls, mixed measurements |
| Frame | ~20-line wrapper + StudioShell header/inspector |
| SAC-1 seam | Finalize button + Dialog inside DesignStudio (`trustedDialogOpen`) |

The canvas will dominate any PEX header. Owner experience of Design is still the monolith.

## Generation as event

Path A is live generation (continuous). It does not feel like a ceremony. Path C trusted finalization is opt-in Dialog — SOURCE present; visual dominance NOT VERIFIED. Likely **B/C**: exists, buried in Studio chrome.

## Improvements possible without touching protected internals (recommendations only)

- Arrival: bind Studio to workflow customer/order before canvas.
- Frame: give the canvas a true workroom stage (full-bleed, quieter chrome) without editing geometry.
- Finalization: surface readiness in StudioShell inspector, not only an interior button.
- Do not restyle the canvas itself in SER-F0–F4 without a later protected-boundary programme.

SER-F5/F9 may frame Studio. They must not rewrite formulas.
