# ADR-010 — Contract-First Integration

| Field | Value |
|---|---|
| ADR ID | ADR-010 |
| Title | Contract-First Integration |
| Status | **Accepted / Active** |
| Date | 2026-08-31 |
| Authority | Principal Architecture Governance |
| Classification | Foundational |
| Scope | Cross-layer communication |
| Supersession | None |

---

## Decision

Cross-layer communication must be **contract-governed**.

```
DOMAIN MODEL
      ▼
CONTRACT
  ├── DTO
  ├── Validation Schema
  ├── API Definition
  └── Shared Types
      ├── BACKEND IMPLEMENTATION
      └── FRONTEND IMPLEMENTATION
```

Constitutional rule:

- Frontend assumptions must not define backend truth.
- Backend implementation details must not leak directly into frontend domain models.
- **Contracts are the boundary.**

---

## Context — T0 FACT (current violations)

- `VITE_API_BASE_URL` vs `VITE_API_URL`
- `/orders/:id/stages` vs `/orders/:id/production-stages`
- `/invoices/:id/payments` vs `/payments`
- Dashboard summary and payments-analytics DTO mismatch vs live stub
- `ApiOrder` type matches stub; UI reads a different shape
- `docs/api.md` `/api/v1` is not mounted
- No shared contract package

T1 deliverable `API_CONTRACT_BASELINE.md` is the first compliance artifact. T0 forensic matrix is evidence of drift, not a contract.

---

## Constraints

Do not generate “temporary” fetch helpers with new paths. Do not type frontend models as `SELECT *` row shapes.

Version APIs when breaking. Prefer additive change.

Anti-corruption layers are required when legacy names persist (ADR-003).

---

## Compliance evidence

DTO + schema + route table + consumer tests. Gate D.

---

## Enforcement

Contract validation. New endpoints without a documented contract are STOP-ADR-09.
