# Phase 7 — CRM & Customer Intelligence Reference

Status: IMPLEMENTED (Phase 7). Test evidence: `tests/phase7-customer.test.ts`, `tests/phase7-intelligence.test.ts` (213/213 battery).

## Data model (migration 013)

| Table | Purpose |
|---|---|
| `customer_notes` | Internal, workspace-scoped staff notes (`pinned`, `note_type`). Never exposed to the customer portal. |
| `customer_preferences` | Explicit preferences + **marketing consent** (`marketing_consent BOOLEAN DEFAULT FALSE`, `marketing_consent_at`). A customer existing is NEVER consent. |
| `customer_timeline_entries` | Business timeline (one of the four event classes; see PHASE7_ARCHITECTURE.md). |
| `referrals` | Referral state machine, tenant-isolated, idempotent, auditable. No financial rewards in Phase 7. |
| `appointments` | Extensible appointment types + staff overlap conflict detection. |
| `fittings` / `fit_observations` | Fitting sessions + **structured business observations** (not "AI predictions"). |

## Segment definitions (DERIVED, never stored)

`GET /crm/segments` computes membership on demand from live business data. Thresholds are **code constants** in `src/routes/crmRoutes.ts`:

| Segment | Rule |
|---|---|
| `new` | customer created ≤ 14 days ago |
| `active` | any activity (order/payment/appointment/timeline) ≤ 30 days ago |
| `repeat` | ≥ 2 orders (lifetime) |
| `high_value` | ≥ GHS 500 total paid (lifetime, successful payments) |
| `vip` | ≥ GHS 1000 total paid (lifetime, successful payments) |
| `at_risk` | no activity for > 45 days (but had activity) |
| `inactive` | no activity for > 90 days |
| `recent_purchase` | payment recorded ≤ 14 days ago |
| `appointment_due` | upcoming live appointment within 7 days |
| `fitting_due` | open (non-terminal) fitting exists |

Changing a threshold is a code change + test update, not a data migration. Segments are recomputed per request — no stale segment tables, no sync burden.

## API surface

- `GET/POST /customers/:id/notes`, `PATCH/DELETE /crm/notes/:id`
- `GET/PUT /crm/customers/:id/preferences` (marketing consent explicit, timestamped, workspace-scoped)
- `GET /crm/customers/:id/timeline` (paginated, actor + entity context)
- `GET /crm/segments` and `GET /crm/customers/:id/segments`
- `GET/POST /crm/consent-report` — report of consented vs non-consented customers (marketing)

## Referral state machine

```
CREATED → INVITED → REGISTERED → CONVERTED → REWARDED
   ↘ CANCELLED (from any non-terminal state)
```

- Attribution is **tenant-isolated** (workspace_id on every row + query).
- Creation is **idempotent** via `clientMutationId` (replays return the original).
- One referral per referred customer per workspace (`uq_referrals_ws_referred`).
- Every transition is auditable (`audit_logs`) and emits a timeline event on CONVERTED.
- **No financial rewards** are implemented in Phase 7 (REWARDED records attribution only).

## Appointment semantics

- Types (CHECK-constrained, extensible via migration): `CONSULTATION, MEASUREMENT, FITTING, PICKUP, DELIVERY, ALTERATION, OTHER`.
- Statuses: `SCHEDULED, CONFIRMED, RESCHEDULED, COMPLETED, CANCELLED, NO_SHOW`.
- Create is idempotent (`clientMutationId`); staff overlap detection via tstzrange `&&` → `409 APPOINTMENT_CONFLICT` (live statuses only).
- Any time change on a live appointment sets status `RESCHEDULED` (regardless of prior state).
- `COMPLETED / CANCELLED / NO_SHOW` are terminal (409 on further transition).

## Fit observations

Structured business data recorded by staff during fittings:

- codes: `tight_chest, loose_waist, short_sleeve, long_sleeve, shoulder_issue, collar_issue, trouser_length, seat_issue, rise_issue, other`
- severity: `minor, moderate, major`

These are measurements of the physical world — a factual record. Any future AI layer CONSUMES them as untrusted input; it never re-labels them as predictions (see PHASE7_ARCHITECTURE.md).
