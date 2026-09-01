# P19 Identity Authority Model

Status: **IMPLEMENTED (runtime, transitional persistence)** on `apps/backend`.

Identity answers **who**. It is global. It is not a Tenant.

| Field | Meaning |
|---|---|
| `id` | Stable IdentityId |
| `email` | Unique login identifier |
| `displayName` | Human label |
| `status` | `active` \| `inactive` |
| timestamps | created/updated |

Lifecycle this slice: provision (register) → authenticate → deactivate (test/admin via store). No IdP.

**FACT:** JWT `sub` = IdentityId. No plan/tenant/permissions in the token.

**TRANSITIONAL:** In-memory store. Restarts lose identities.

**Not identity:** AppContext mock `User`, web `authService` license path (LEGACY).
