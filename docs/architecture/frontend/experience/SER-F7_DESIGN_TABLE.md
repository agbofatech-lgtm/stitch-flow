# SER-F7 Design table

The Design table is a canvas-first atelier room. The protected Design Studio is the working heart.

## Composition

| Slot | Implementation |
|---|---|
| Place | Shell: `Design table`. Workroom kicker: `Design table`. |
| Identity | Workroom title is the client, or `Design table` when none. |
| Thread | Shell + compact frame `AtelierThread`. Not a second selector. |
| Journey | `AtelierJourney` current = design. |
| Confidence | Local workspace. Hosted — not rewritten. Finalize remains inside the studio. |
| Next | Shell: Open production floor. |
| Host | `data-design-host` full-bleed overflow. `AtelierWorkroom` `density="canvas"`. |
| Studio | Existing `<DesignStudio />` child. Unchanged. |

## Empty thread

If no client is on the workflow thread:

> No client on this thread. The hosted studio can still use its own order selector. This frame does not invent a client.

The studio remains mounted. It already has an order picker.

## Controls

Frame does **not** add Finalize, fake export, AI assist, or a second save. `Finalize for Production` stays inside `DesignStudio.tsx`. Workflow inspector still offers `Save hosted studio output to order`.

Desktop design hides the duplicate shell toolbar thread (`sm:hidden`) so chrome does not compete with the canvas. Mobile keeps the toolbar so Continue/Open production remains reachable.

## Motion

Workspace transition from Measurement → Design is existing F3 WORKSPACE. Thread uses CONTEXTUAL. No milestone except genuine trusted events inside the studio. Frame does not animate canvas internals.
