# SER-F6 Client room

The Client room is a relationship and history workspace, not an HTTP directory.

## Purpose

The person you are dressing. Selecting a client starts the object thread that Measurement, Design, and Production inherit.

## Data

| Surface | Source | Honesty |
|---|---|---|
| People list | AppContext `customers` | Same population as Floor |
| Dossier | AppContext customer | Local workspace |
| Live profiles | AppContext `measurementProfiles` | Transitional; not shop snapshots |
| Garment history | AppContext `orders` via `getCustomerOrders` | Not a remote shop ledger |

Does **not** call `customerApi` / unmounted `/customers`. Does **not** mount `/shop`. Dual HTTP vs AppContext populations are no longer presented as the Client room.

## Composition

| Slot | Implementation |
|---|---|
| Place | `Client room` |
| Purpose | The person you are dressing. Relationship and history live here. |
| Thread | Workflow client + order (`selectCustomer` clears a stale order) |
| Confidence | Local workspace. Not shop authority. |
| Primary action | Selected → Continue to measurements. Else → Receive client. |
| Canvas | Dossier (identity, notes, preferences) |
| Tools | Search + people list (rail on `xl`, stacks below/aside on smaller) |
| History | Orders for this person |
| Empty | No client selected / no clients yet / no garments on record |

Receive and edit use the shared `Dialog` + `Field` primitives. Persistence is `addCustomer` / `updateCustomer` on AppContext.

## Object thread

- Floor people row calls `workflow.selectCustomer` then opens this room.
- Command palette Work entries do the same.
- List selection is MICRO. Dossier enter is CONTEXTUAL.
- Continue to measurements carries the named client.

## Vocabulary

Client, dossier, receive, fitting notes, garment history. Not CRM, records, or users.
