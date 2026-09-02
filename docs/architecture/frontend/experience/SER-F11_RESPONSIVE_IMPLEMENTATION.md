# SER-F11 responsive implementation

Minimal grouped fixes. No new design language. No room redesign. No protected rewrites.

## Defects

| ID | Surface | Viewport | Sev | Observed | Cause | Resolution |
|---|---|---|---|---|---|---|
| F11-D1 | Shell header | 768 | P1 | “Client…” ellipsis | `h1.truncate` + crowded actions | Title wraps; description/state chips `lg` only |
| F11-D2 | Shell header | 768 | P1 | Operator plane + hamburger + next action | `md:inline-flex` on Operator plane | Operator plane `lg:inline-flex` |
| F11-D3 | Dialog / sheet | 390 | P1 | No visible close | Overlay + Escape only | Visible Close control, 44px target |
| F11-D4 | Command palette | 390 | P2 | Result list vs viewport | `max-h-72` | `max-h-[min(18rem,45vh)]` |
| F11-D5 | Design frame | 390 | P1 | Nested 70vh scroller | `min-h-[70vh] overflow-auto` | Host `min-h-0 overflow-x-auto` |
| F11-D6 | Design toolbar | 390 | P1 | Extra thread strip on canvas | toolbar `sm:hidden` still showed at 390 | toolbar `hidden` on design |
| F11-D7 | Control Center | 390 | P2 | UUID split across “id” | `flex justify-between` | stack + `break-all` |
| F11-D8 | Canvas workroom | 390 | P2 | Sticky header padding | `py-3` | `py-2` on small |
| F11-D9 | All rooms | 390 | P2 | Duplicate thread + next action | F4 shell + workroom both show next | Documented. Not a second nav. |
| F11-D10 | Design Studio | all | — | 620×500 preview | Protected internals | **Not rewritten.** Host contains overflow. |
| F11-D11 | Settings | 390 | P3 | `min-w-[720px]` plan table | existing; inside `overflow-x-auto` | Contained. Left. |
| F11-D12 | Visual lab | — | — | Floor/room wait after 390 | automation | Matrix, `goFloor` reload, per-room catch |

## Files changed (why)

| File | Why |
|---|---|
| `experience/shell/WorkspaceChrome.tsx` | D1 title wrap; state chips lg |
| `studio/StudioShell.tsx` | D2 Operator plane lg; D6 hide design toolbar |
| `experience/primitives/overlays.tsx` | D3 visible Close; dialog body max-height |
| `experience/shell/CommandPalette.tsx` | D4 palette list vs vh |
| `experience/atelier/atelier.tsx` | D8 canvas header padding |
| `atelier/DesignStudioFrame.tsx` | D5 host overflow, no 70vh |
| `control/ControlCenter.tsx` | D7 identity stacking |
| `studio/studio.test.ts` | shell class assertions |
| `experience/experience.test.ts` | header/dialog assertions |
| `scripts/visual-lab.mjs` | f11 aliases, overflow audit, resilient hops |

## Explicitly not changed

`patternEngine.ts`, `productionAssistant.ts`, `shared/types/index.ts`, `productionStageService.ts`, `DesignStudio.tsx`.
