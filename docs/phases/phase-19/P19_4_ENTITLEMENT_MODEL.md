# P19.4 Entitlement Model

| Field | This slice |
|---|---|
| capability | CapabilityCode |
| granted | boolean |
| limit | number \| null (customers/seats) |
| source | `SUBSCRIPTION` only |
| status | ACTIVE if subscription ACTIVE else none |
| planCode | packaging reference, not an if |

Sources TRIAL/PROMOTION/ADMIN_GRANT: **extension points, not implemented**.

Derivation is the single path. No parallel `user.isPremium`.
