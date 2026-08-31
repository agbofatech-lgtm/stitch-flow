# P19 Operations & Audit Model (paper)

Status: **PAPER** — P19.8 **LOCKED**.

Audit records are **governed operational evidence**, not `console.log`.

## Questions an audit row must answer

Who, when, under what authority, previous state, new state, which tenant, human vs automated.

## Event classes (catalog PROPOSAL — not a schema)

Tenant created/suspended/activated; plan changed; subscription activated/cancelled; entitlement changed; administrator action; support access; billing webhook processed; security-sensitive configuration changed.

**FACT:** `auditLogService` is referenced from `authService`; runtime authority UNKNOWN. `eventRoutes.ts` is empty.
