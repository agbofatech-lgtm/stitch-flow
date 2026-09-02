# SER-F4 client / order thread

## Authority

Unchanged: `selectedOrderId` in AppContext, resolved against `orders` and `customers`.

F4 does **not** create a parallel client store, does not invent production rows, and does not move shop data into the shell.

## Display

`AtelierThread` in:

1. Persistent shell context strip (all rooms, including mobile)
2. Desktop header (large screens)
3. Floor page header (existing F2 primitive)

Copy:

- With selection: `{room} · Client {name} · {orderNumber}`
- Without: `{room} · No client selected`

## Honesty fix

Floor previously fell back to `recentCustomers[0]` when no order was selected, which presented a nearby name as the active thread. F4 removed that fallback. Recent clients remain a list of people you *can* open, not the active thread.

## Design table host

`DesignStudioFrame` may show the same client/order strings. Empty: “No active client”. Badge: “Hosted — not rewritten”. Geometry stays inside `DesignStudio.tsx`.
