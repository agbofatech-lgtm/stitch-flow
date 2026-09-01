# P19 Authentication Architecture

Runtime: existing `apps/backend` (`createApp` in `app.ts`). ADR-009.

## Routes

| Method | Path | Auth |
|---|---|---|
| POST | `/auth/register` | public |
| POST | `/auth/login` | public |
| GET | `/auth/me` | Bearer access token |

## Token

Access JWT: `{ sub, typ: "access" }` + iss/exp. **Not** plan, billingStatus, permissions, tenantId.

TTL: `ACCESS_TOKEN_EXPIRES_IN` (default 15m). Secret: `JWT_SECRET` (env name only).

Passwords: bcrypt. Never returned.

## Failures

| Case | HTTP | code |
|---|---|---|
| Missing token | 401 | MISSING_TOKEN |
| Malformed | 401 | MALFORMED_TOKEN |
| Wrong secret | 401 | INVALID_TOKEN |
| Expired | 401 | EXPIRED_TOKEN |
| Bad password | 401 | INVALID_CREDENTIALS |
| Inactive identity | 403 | IDENTITY_INACTIVE |

**Not claimed:** pentest, SOC2, enterprise IAM certification.

**TRANSITIONAL:** no refresh-token rotation in this slice (refresh tables still empty).
