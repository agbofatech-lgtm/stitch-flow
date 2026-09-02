# SER-F8 Production floor

The Production floor is an atelier workroom. A garment is made here. It is not a Kanban dashboard.

## Composition

| Slot | Implementation |
|---|---|
| Place | Production floor |
| Identity | Client name, or `Select an order` |
| Thread | Workflow/AppContext order. Journey includes Production. |
| Confidence | Local workspace. Same orders as the Floor. Stage engine is not remounted. |
| Primary action | Order present → Open ledger. Else → Open client room. |
| Queue | AppContext orders. Selecting calls `workflow.selectOrder`. |
| Canvas | Current work, recorded stages, production plan if present, alerts, notes. |
| Empty | No order on this thread. Does not borrow the first order. |

## Stages

Canonical codes from `domain/production/stages.ts`. Status text is the order record (`Current`, `Recorded complete`, `Not on this order`). Missing stages are not filled as pending work.

## Plan

If `productionPlan` exists, counts and fabric estimate from that object are shown as **on this order**, not as live stock or QC approval.
