# SER-F4 navigation grammar

## Primary atelier spaces

| Id | Place | Next action (navigation only) |
|---|---|---|
| command | Floor | Open client room |
| clients | Client room | Continue to measurements |
| measurements | Measurement table | Continue to design |
| design | Design table | Open production floor |
| production | Production floor | Open ledger |
| business | Ledger (+ orders / materials / invoices / reports stations) | Return to floor |

## Operator / workspace overlays

| Id | Place | Next action |
|---|---|---|
| control | Control Center (operator plane) | Return to atelier |
| settings | Workspace settings | Return to floor |

Control Center is the darker operator plane of the same atelier. It is not a second product. F4 changes entry/exit chrome only.

## Rail sections

`NAV_SECTIONS` labels (sentence case, not SaaS uppercase chrome):

- Rooms
- Ledger
- Workspace
- Operator

No invented destinations (Garments, Delivery, fake modules).

## Command palette

Existing `CommandPalette` retitled **Go to a room**. Groups: Rooms / Ledger / Work / Orders / Account / Operator. Ctrl/Cmd+K unchanged. Commands call `goTo` / `selectNav` only.

## Journey motion

F3 `workspacePreset(from, to)` on the canvas (`data-motion-category="workspace"`). MICRO press on rail items (`sf-micro-press`). CONTEXTUAL motion remains on `AtelierThread`. No second animation system.
