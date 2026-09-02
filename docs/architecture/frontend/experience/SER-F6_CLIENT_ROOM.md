# SER-F6 Client room

The Client room is a relationship workspace. Selecting a person starts the object thread that Measurement and Design inherit.

## Purpose

The person you are dressing.

## Data

See [`SER-F6_FORENSIC_DATA_BOUNDARY.md`](./SER-F6_FORENSIC_DATA_BOUNDARY.md).

Does **not** call `customerApi` / unmounted `/customers`. Does **not** mount `/shop`. Does **not** invent an active client.

## Composition

| Slot | Implementation |
|---|---|
| Place | Shell: `Client room`. Workroom title is the person, or `Select a client`. |
| Purpose | Relationship and history for this fitting. |
| Thread | Shell `AtelierThread` from `workflow.customerId` then order customer. Workroom does not repeat it. |
| Journey | `AtelierJourney` Client → Measurements → Design (orientation, not a meter). |
| Confidence | Local workspace. Same people as the Floor. Not shop authority. |
| Primary action | No client: Receive client. Client selected: Continue to measurements (shell + dossier). |
| Canvas | Dossier (identity, notes, preferences) |
| Tools | People index (search + list). Rail on `xl`; dossier primary below. |
| History | Orders for this person; selecting an order continues the thread. |
| Live profiles | Opening a profile continues to the measurement table. |
| Empty | No client selected / no clients yet / no garments on record / no live profile |

Receive and edit use shared `Dialog` + `Field`. Persistence is `addCustomer` / `updateCustomer`.

## Object thread

- Floor people row calls `workflow.selectCustomer` then opens this room.
- Floor continue uses `workflow.selectOrder` when a garment is already on the Floor.
- Command palette Work entries do the same.
- List selection is MICRO. Dossier enter is CONTEXTUAL.
- Shell next action is withheld until a client is selected.

## Vocabulary

Client, dossier, receive, fitting notes, garment history. Not CRM, records, or users.
