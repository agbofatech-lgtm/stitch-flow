# OD-P19-05 — Authentication Runtime Options

**QUESTION:** What should be StitchFlow’s authoritative authentication runtime?

Authentication answers **WHO ARE YOU?** It must not silently answer tenant, role, or entitlements.

## FACT

| Item | State |
|---|---|
| `apps/backend` `auth.ts`, `authRoutes.ts`, `requireRole.ts`, `services/authService.ts`, `utils/jwt.ts` | **empty files** |
| Env contract | `JWT_SECRET`, refresh secret, bcrypt rounds, device limits |
| Deps | `jsonwebtoken`, `bcrypt` on backend |
| `apps/web` `authService.ts` | Register/login/license `free\|pro\|enterprise` — **not** live IAM |
| `apps/api` jwt helper | Unpackaged; ADR-009 forbids a second runtime |
| Frontend session | AppContext mock + localStorage workspace id |
| PWA plugin | **ABSENT** (`vite-plugin-pwa` not in web package.json) |
| Offline-first | ADR-002 **target**, not current (localStorage TRANSITIONAL) |

**UNKNOWN:** password policy, token rotation in production, IdP preference, whether custom JWT can be operated securely by the team.

## OPTIONS

### A — Complete custom authentication on existing `apps/backend` (ADR-009)

Use the env/deps already declared. JWT proves **user id** (`sub`). Tenant/role/entitlement resolved **after** auth via membership services.

| Dimension | Assessment |
|---|---|
| Security | Can be sufficient if completed correctly; empty files mean it is **not** sufficient today |
| Tenant compatibility | Good if JWT does **not** carry entitlements as law |
| Offline / PWA | Session tokens can be stored; refresh still needs network. Better than redirect IdP for shop-floor |
| Backend integration | Aligns with one runtime |
| Complexity / cost / lock-in | Higher security burden; low vendor cost; no IdP lock-in |
| Migration | Fill empty routes; do not promote web `authService` license model |

### B — Managed IdP (Clerk / Auth0 / Cognito / similar)

**UNKNOWN** which vendor. Not in repo.

| Dimension | Assessment |
|---|---|
| Security | Often stronger ops defaults |
| Offline / PWA | Usually worse (hosted login, network) |
| Tenant | Still custom mapping |
| Cost / lock-in | Recurring + vendor |
| ADR-009 | Allowed only as **adapter** into the one backend, not a second app |

### C — Defer; keep mock AppContext session

Blocks commercial trust. Acceptable only if Owner pauses P19.2.

## RECOMMENDATION

**A** — complete authentication on **existing** `apps/backend`. Do not invent a second server. Do not treat frontend JWT helpers as authority.

Preserve: Identity ≠ Tenant ≠ Role ≠ Entitlement. Tokens must not be the entitlement store.

**Confidence:** High for *where* (backend runtime); Medium for *custom JWT vs managed* (ops risk of custom auth).

**OWNER DECISION REQUIRED:** YES. STOP-P19-B if implementation guesses an IdP.
