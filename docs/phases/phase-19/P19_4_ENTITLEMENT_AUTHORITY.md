# P19.4 Entitlement Authority

**IMPLEMENTED** (in-memory, tenant-scoped).

```
Subscription → Entitlement derivation → Capability → AccessDecision.can(capability)
```

Forbidden: `if (plan === "Professional")`.

Server: `POST /platform/access/check` `{ capability }` → `{ allowed, entitled, reason, planCode }`.

FeatureGate.tsx remains **TRANSITIONAL UX**, commented as not law.

P17: `AI_TAILORING_ADVISORY` is access to advisory only — not autonomy.
