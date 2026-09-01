# P19.2 + P19.3 — Identity & Tenancy Forensics

| Field | Value |
|---|---|
| Date | 2026-09-01 |
| Implementation before this map | **NONE** |
| P18 | `6c838a11911aaa947c0fd2eacd694de1ba5bae5e` |
| P19.1 | `b407ec409159a60597e8d0dc2b960032b247159b` |
| P19.1.5 | `aa4da7decc7985fa9a7e911b45fea8a2c46626c7` |
| Decision authorization | P19.2+P19.3 master execution prompt (see `P19_2_3_DECISION_AUTHORIZATION.md`) |

## Mandatory questions

| Q | Answer | Evidence |
|---|---|---|
| Q1 Identity | **PARTIAL** | `User` type + mock users. No runtime identity store. |
| Q2 Authentication | **NO runtime** | `auth.ts`, `authRoutes.ts`, `authService.ts`, `jwt.ts`, `password.ts` **0-byte**. Deps `jsonwebtoken`/`bcrypt` present. Web `authService` is license stub, not live. |
| Q3 workspaceId | **TRANSITIONAL** mock UI context + data partition + **tenant substitute** | AppContext / localStorage / types. Not security. |
| Q4 Tenant | **ABSENT** | No `tenantId`. Glossary: Tenant ≠ Workspace. |
| Q5 Authorization | **PARTIAL client** | `canPerform` / FeatureGate. Empty `requireRole.ts`. Unauthenticated business routes **unmounted by default**. |
| Q6 Data ownership | Product entities have `workspaceId`, **not** `tenantId`. Frozen P13–P16 records must **not** gain commercial mutation. | types + T2 buckets |
| Q7 Trusted Core mutation | **NO** | Access wrap only. |

## Classification

| Artifact | Class |
|---|---|
| `Workspace` + `workspaceId` | TRANSITIONAL operational; must not remain isolation law |
| `User` type / mock | LEGACY / seed |
| FeatureGate / tierEnforcement | TRANSITIONAL commercial UI |
| Empty auth files | STUB to complete (OD-P19-05) |
| `env.ts` DATABASE_URL required | LEGACY unused by `createApp` |
| `initDb` shop tables | Shop domain; **no tenant column** — do not reuse as IAM |
| `002_create_core_tables.sql` empty | NOT schema authority |
| AppContext localStorage | TRANSITIONAL SoT (T10 C1) — **do not migrate destructively this slice** |
| Protected engines / `shared/types` | AUTHORITATIVE tailoring — **do not modify** |

## Persistence choice for this slice (PROPOSAL → implement as TRANSITIONAL)

Postgres is **not-verified** (`/ready`). Wiring IAM to empty migrations would invent DB authority.

**Platform IAM SoT this slice:** in-process store on the existing `apps/backend` runtime (ADR-009), resettable in tests. Class: **TRANSITIONAL platform authority**, not a second product AppContext, not Postgres-until-verified.

Shop customers/orders remain AppContext/T2. Isolation tests use **platform-owned tenant records**, not a rewritten Customer table (avoids second Customer SoT).
