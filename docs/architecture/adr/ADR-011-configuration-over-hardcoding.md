# ADR-011 — Configuration over Hardcoding

| Field | Value |
|---|---|
| ADR ID | ADR-011 |
| Title | Configuration over Hardcoding |
| Status | **Accepted / Active** |
| Date | 2026-08-31 |
| Authority | Principal Architecture Governance |
| Classification | Platform Constitutional Decision |
| Scope | Operationally variable platform behavior |
| Supersession | None |

---

## Decision

Operationally variable platform behavior must be **configuration-driven**, particularly:

- Plans, pricing, usage limits
- Feature flags
- AI policies, provider settings
- Notification policies
- Platform limits, tenant policies

---

## Distinction

**Not everything should become configurable.**

```
DETERMINISTIC DOMAIN TRUTH  →  CODE + TESTS
OPERATIONAL POLICY          →  CONFIGURATION
```

Examples:

- Pattern mathematics → code + deterministic tests (ADR-001)
- Subscription pricing → platform configuration (ADR-006, ADR-007)

Bad architecture: configuration for everything.  
Good architecture: the split above.

---

## Context — T0 FACT

Hardcoded today: LAN CORS origin, port 5000, stub payloads, two price tables, FeatureGate alerts, measurement ranges in both engine and UI.

T1 may move **runtime** config (API port, CORS, DATABASE_URL) into env without implementing Control Center.

Commercial pricing must not gain a third hardcoded table.

---

## Constraints

Configuration without declared authority violates ADR-007 / STOP-ADR-07.

Secrets are never committed. Variable **names** may be documented; values must not appear in ADRs or chat dumps.

---

## Compliance evidence

Configuration audit per phase that introduces flags, plans, or provider settings.

---

## Enforcement

Configuration audit. Complements ADR-006 and ADR-007.
