# Dual-Read Architecture

**UI screens still read AppContext.** That is the documented precedence (`SHOP_DATA_PRECEDENCE.uiSourceOfTruth`).

Adapter `dualReadById(entity, id, legacyItems)`:

1. If T2 runtime has a non-tombstone record → `source: t2`  
2. Else find id in legacy array → `source: legacy`  
3. Else `missing`

T2-first is for the adapter/tests, **not** a silent rewrite of Customers/Invoices screens.
