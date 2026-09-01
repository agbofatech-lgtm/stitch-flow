# P19.6 Operational Architecture

Runtime: `apps/backend` `createApp` (ADR-009).

Persistence **port**: memory adapter **TRANSITIONAL**. Schema `migrations/006_platform_commercial.sql` **NOT APPLIED**.

```
Identity → Tenant → Workspace → Membership → Role
Plan → Subscription → Entitlement → can(capability) → product access
```

Shop CRUD remains unmounted by default. SaaS money ≠ shop money.
