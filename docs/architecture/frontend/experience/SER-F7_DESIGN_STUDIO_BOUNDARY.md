# SER-F7 Design Studio boundary

```
PROTECTED INTERNALS                         SAFE EXPERIENCE FRAMING
─────────────────                           ──────────────────────
DesignStudio.tsx canvas / Path A            DesignStudioFrame (canvas density)
patternEngine formulas                      AtelierWorkroom density="canvas"
productionAssistant heuristics              StudioShell host + thread
measurement vocabulary                      AtelierThread / AtelierJourney
trusted finalization semantics              Confidence: hosted, not rewritten
SAC-1 finalize contract                     Finalize button stays inside studio
```

`DesignStudio.tsx` is not modified. The frame hosts it.

| Concern | Authority | SER-F7 |
|---|---|---|
| Client identity | workflow + AppContext | consume |
| Selected order | workflow + `selectedOrderId` | consume |
| Garment type on order | AppContext order | consume if present |
| Measurements | F6 table / studio internals | do not duplicate |
| Pattern generation | Pattern Engine | never replace |
| Design canvas | `DesignStudio.tsx` | never replace |
| Trusted save / finalize | SAC-1 inside studio | preserve; do not add a second Finalize |
| Save studio output to order | `workflow.saveStudioToOrder` / studio Save | preserve in inspector/studio |
| Studio framing | `DesignStudioFrame` | redesigned |
| Next action | `ATELIER_PLACES.design.next` → Production | shell |

Internal studio still contains a teal hero, KPI tiles, and some hardcoded preview sizes (`h-[500px] w-[620px]`). Those are protected internals. SER-F7 does not restyle them.
