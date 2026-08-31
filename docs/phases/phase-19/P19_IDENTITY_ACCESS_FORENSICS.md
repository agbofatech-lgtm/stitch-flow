# P19 Identity & Access Forensics

```
Identity Provider?  UNKNOWN / ABSENT (no IdP)
        ▼
Authentication      PARTIAL — JWT sign/verify helpers; backend authRoutes EMPTY
        ▼
Session / Token     PARTIAL — refresh token repository referenced
        ▼
User                PARTIAL — type + mock; T2 entity 'user'
        ▼
Membership          PARTIAL — WorkspaceMember owner|assistant
        ▼
Role                PARTIAL — UserRole; checkRolePermission
        ▼
Permission          PARTIAL — AppPermissionAction flags on member
        ▼
Capability          MIXED with plan FeatureGate
```

| Authority | Status |
|---|---|
| Identity | PARTIAL / mock |
| Authentication | STUB / empty middleware |
| Authorization | PARTIAL client `canPerform` |
| Role | PARTIAL two roles |
| Permission | PARTIAL booleans |

**FACT:** `requireRole.ts` is an empty file. Live login matrix was not certified in P18.

T2 `user` and `workspace` entities exist as persistence buckets, not a completed IAM product.
