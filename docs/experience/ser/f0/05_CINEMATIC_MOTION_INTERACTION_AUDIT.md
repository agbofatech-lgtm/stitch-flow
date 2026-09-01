# Cinematic / motion / interaction audit

No visual scores. SOURCE-EVIDENCED. HTML boot only.

## A. Application arrival

```
Open :5173
 → Splash (isReady=true immediately; min 700ms, max 1600ms)
    logo spin keyframes, brand name enter, sewing copy
 → StudioShell Atelier Home (command)
```

Continuity: splash then hard replace (no shared spatial persist). Branding is the strongest cinematic beat in the product. Blank flash: possible before first paint — NOT VERIFIED. Reduced motion skips spin.

Classification of splash: **FUNCTIONAL / briefly EXPERIENTIAL**.

## B. Room transitions

`AnimatePresence mode="wait"` + `motionOrInstant(motionPresets.panel)`: opacity + 8px Y, 220ms.

Instant replacement with a short fade. No shared-element continuity. Context: AppContext + WorkflowPanel if inspector open; rooms do not morph into each other.

Classification: **BASIC / FUNCTIONAL**.

## C. Object transitions

Client → measurement → garment → design → production is **not** a staged cinematic path.

`WorkflowPanel` lists steps as badges and can hold a selected customer id. It does not choreograph room changes or object persistence across canvases.

Classification: **NONE as journey; BASIC as inspector text**.

## D. Meaningful moments

| Moment | What happens | Feel (source) |
|---|---|---|
| Save (AppContext) | localStorage write | no ceremony |
| Pattern generation | DesignStudio live useMemo (Path A) | continuous, not an event |
| Trusted finalization | button → Dialog (SAC-1) | **exists**, easy to miss among Studio chrome |
| Production transition | HTTP board or local order stages | error wall if HTTP |
| Sync | StatusBar `T2 sync queue N`; default transport blocked | not a sync ceremony |
| Completion | StatusBadge on orders | BASIC |

## E. Micro-interaction

| Control | Class |
|---|---|
| Token Button/IconButton | FUNCTIONAL |
| Nav current state | FUNCTIONAL |
| Command palette | FUNCTIONAL |
| Shared Dialog (Customers) | FUNCTIONAL (Escape + focus trap in overlays.tsx) |
| Local Order/Material/Invoice modals | BASIC / inconsistent |
| Splash keyframes | DECORATIVE→EXPERIENTIAL |
| Workspace fade | BASIC |
| Hover on lucide icons | BASIC |

Cinematic ≠ present as a system. Motion communicates *room swap*, not craft causality.
