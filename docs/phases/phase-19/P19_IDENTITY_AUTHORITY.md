# P19 Identity Authority (model)

Status: **PAPER** — P19.2 implementation **LOCKED** (OD-P19-05).

## Target chain

```
Identity Provider?  → Authentication → Session/Token → User → (then membership)
```

## Rules (binding when implemented)

- Frontend authentication state is **not** the security authority.
- Backend verifies authentication on protected routes.
- Credentials and signing secrets stay server-side / env names only.
- Logout / revocation must be defined before calling the system “authenticated”.
- Do not treat empty `apps/backend/src/middleware/auth.ts` as IAM.
- Do not add a second API server (ADR-009).

## FACT now

User type, WorkspaceMember, JWT helpers, `authService` license/device-limit path, empty auth routes, AppContext mock session.

## Must not invent in P19.1

IdP product, password policy, JWT TTLs, OAuth scopes, magic-link vs password. Those are OD-P19-05 + later design.
