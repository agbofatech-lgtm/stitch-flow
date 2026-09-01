# Conflict and tombstone policy

| Entity | Policy |
|---|---|
| Customer | version-aware; mismatch 409 CONFLICT |
| Order | version-aware |
| Measurement snapshot | whole-document replace on version match; **no numeric merge** |
| Production | `stageMachine` only; invalid transition 409 STAGE_GUARD; no regression overwrite |
| Trusted artifact | append-only; update/delete 405 |

Customer/order delete in sync is a `deleted_at` tombstone. Trusted artifacts are never tombstoned.

T2 shop-sync conflict policy is `detect-only` (not `domain-merge`).
