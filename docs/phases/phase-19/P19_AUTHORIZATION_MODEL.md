# P19 Authorization Model (paper)

Status: **PAPER** — P19.4 **LOCKED**.

## Separated questions

| Question | Authority |
|---|---|
| Who is this? | Identity |
| Which tenant? | Tenancy |
| Does the user belong? | Membership |
| What may they attempt? | Role → Permission |
| Is the tenant commercially allowed? | Entitlement |
| Combined? | Access decision = permission ∧ entitlement ∧ tenant active |

A user may have permission and lack entitlement. A tenant may have entitlement and the user lack permission. **Both** deny.

## FACT now

`UserRole` owner|assistant, `AppPermissionAction` flags, `canPerform` client-side, empty `requireRole.ts`. Capability mixed with FeatureGate.

## PROPOSAL

Server evaluates permission and entitlement separately, then AND. Do not collapse into one boolean on the client.
