# Commercial checklist

Shop invoice ≠ SaaS billing ≠ subscription ≠ entitlement.

| Concept | Where | Status |
|---|---|---|
| Plan comparison table | Settings | UX_ONLY `FEATURE_COMPARISON` |
| `simulateTier` | Settings | UX_ONLY — labelled Simulate |
| FeatureGate | Reports etc. | UX presentation, not commercial SoT |
| Entitlements API | `GET /platform/entitlements` | implemented, tenant JWT |
| Access check | `POST /platform/access/check` | implemented |
| Checkout | `POST /platform/billing/checkout` | adapter port — live PSP **DEFERRED** |
| Subscription read | `GET /platform/billing/subscription` | file/memory store TRANSITIONAL |
| Webhook | `POST /platform/billing/webhooks/:adapter` | HMAC test adapter, not Paystack/Stripe live |
| Provider | `GET /control/billing/provider` | `{ status: "DEFERRED" }` |

Owner must **not** see UI that implies card charging.

Postgres entitlements: **NOT VERIFIED**.
