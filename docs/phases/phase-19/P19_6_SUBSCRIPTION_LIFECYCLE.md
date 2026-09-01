# P19.6 Subscription Lifecycle

| State | Access | Policy class |
|---|---|---|
| ACTIVE | entitlements from plan | implemented |
| PAST_DUE | none | TRANSITIONAL_DEFAULT `pastDueAccess=NONE` — no grace invented |
| CANCELLED | none immediately | TRANSITIONAL_DEFAULT `cancelledAccess=IMMEDIATE` — period-end **UNKNOWN** until Owner sets it |
| EXPIRED | none | implemented |
| TRIALING / PAUSED | not implemented | extension |

Offline entitlement policy: **UNKNOWN**. Commercial outage must not corrupt trusted records.
