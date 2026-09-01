# P19 Membership Model

Membership = Identity ↔ Tenant.

| Field | Values this slice |
|---|---|
| role | `TENANT_OWNER` (bootstrap) \| `STAFF` |
| status | `active` \| `suspended` \| `removed` |

One identity may hold multiple memberships later; 1:1 is bootstrap only.

Role ≠ entitlement. `TENANT_OWNER` ≠ paid plan.

RBAC is **minimal**. Permissions catalog is **not** fully implemented (avoid overbuild). Isolation uses membership + tenant, not FeatureGate.
