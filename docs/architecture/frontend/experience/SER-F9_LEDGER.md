# SER-F9 Ledger

The Ledger is the commercial record room of the garment thread.

## Stations

| Station | Reconstruction |
|---|---|
| Orders (default) | Thread-first commercial record. Invoices and payments from AppContext. |
| Invoices | Same store, scoped to the thread when an order is selected. |
| Materials | AtelierWorkroom framing. Fabric records remain local inventory UI. |
| Reports | AtelierWorkroom framing. Derived reports remain; not the dominant Ledger identity. |

## Orders station

WHO = client. WHICH THREAD = order/garment. WHAT = stored invoice/payment records. STATE = local workspace. NEXT = Return to floor / Open production / Open client.

No invoice → “No invoice record exists for this order.”  
No payment → “No payment record is available” (not “unpaid”).  
Order status is not a payment status.

## Journey

`Client → Measurements → Design → Production → Ledger`
