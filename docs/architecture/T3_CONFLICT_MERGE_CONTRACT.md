# T3 Conflict Merge Contract

T2 deferred Measurement / Order / Production merge. T3 defines the rules.

Policy in `ENTITY_CONFLICT_POLICY`: `domain-merge` for `measurement`, `order`, `production`.

Silent overwrite remains forbidden.

## Measurement

- Separate into body vs garment first. Pattern is recomputed, never merged as authority.
- Missing field on one side: take the other.
- Both present and within 0.05 cm: treat as same.
- Both present and different: **conflict**; keep local.

## Order

- Identity (`id`, `customerId`, `orderNumber`, `workspaceId`): conflict if different.
- Status: linear advance `draft < in_progress < ready < delivered`. `cancelled` vs other = conflict.
- Money (`totalAmount`, `subtotal`, `taxTotal`, `discountTotal`): conflict if different. Canonical money field: **totalAmount**.
- Nested garmentMeasurements: measurement merge.
- productionPlan: derived; disagreement is conflict, local kept.

## Production stages

Canonical codes only (from productionStageService templates):

`measurement → cutting → sewing → embroidery → first_fitting → second_fitting → final_press → ready → delivered`

- Advance completed over pending/active.
- `skipped` vs `completed` = conflict.
- Unknown codes are not invented.

## Remote

T1 business CRUD remains unmounted. Merge runs only when a transport supplies `remotePayload`. Without it, version conflict stays detect-only (not overwritten).
