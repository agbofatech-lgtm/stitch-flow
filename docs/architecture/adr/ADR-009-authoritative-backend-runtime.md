# ADR-009 — One Authoritative Backend Runtime

| Field | Value |
|---|---|
| ADR ID | ADR-009 |
| Title | One Authoritative Backend Runtime |
| Status | **Accepted / Active** |
| Date | 2026-08-31 |
| Authority | Principal Architecture Governance |
| Classification | Foundational |
| Scope | Backend infrastructure |
| Supersession | None |

---

## Decision

StitchFlow shall have **one clearly identifiable authoritative application runtime**.

Conceptual structure:

```
server.ts
    ▼
createApp()
    ▼
Application Middleware
    ▼
API Routes
    ▼
Controllers
    ▼
Application Services
    ▼
Domain Services
    ▼
Repositories
    ▼
Infrastructure
```

Folder names may differ. The principle may not.

---

## Prohibited state (must not re-emerge)

- Multiple backend folders as competing authorities
- Multiple server entrypoints
- Stub APIs presented as platform truth
- Unused API servers that look implemented
- Frontend calling different API assumptions
- Unclear deployment target

---

## Context — T0 FACT (violation of this ADR today)

| Process | Role |
|---|---|
| `apps/backend/src/server.ts` | **What npm starts** — stub JSON :5000 |
| `apps/backend/src/app.ts` | Real CRUD — **not started** |
| `apps/api` | Auth/sync fragments — unpackaged |
| `proxy-server.js` | Unused by workspace scripts |

This ADR makes T1 **mandatory**. T0 documented the violation; T1 removes it.

T1 must produce an answer to: “Which backend is running?” without ambiguity.

---

## Constraints

T1 shall not rewrite tailoring mathematics, redesign workspaces, implement AI/3D, or introduce commercial plans (Phase Matrix T1 forbidden work).

Do not “fix” ADR-009 by deleting `app.ts` routes in favor of the stub.

Do not expose unauthenticated CRUD on a public host (T0 R4) as the means of establishing authority.

---

## Compliance evidence

Runtime architecture verification: one `dev`/`start` composition root; health/ready; documented port; migrations attached to that process.

---

## Enforcement

T1 Gate T1-A. STOP if a second entrypoint is added “temporarily” without documentation (STOP-ADR-09).
