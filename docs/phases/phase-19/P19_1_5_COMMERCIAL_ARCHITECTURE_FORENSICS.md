# P19.1.5 Commercial Architecture Forensics

| Field | Value |
|---|---|
| Mode | FORENSIC DECISION SUPPORT ONLY |
| Implementation | **NONE** |
| Date | 2026-08-31 |
| P18 | `6c838a11911aaa947c0fd2eacd694de1ba5bae5e` |
| P19.1 | `b407ec409159a60597e8d0dc2b960032b247159b` |
| Origin branch (ls-remote) | same SHA as P19.1 |
| Working tree at start | clean |
| Protected hashes | UNCHANGED vs T0 |

Legend: **FACT** / **INFERENCE** / **OPTION** / **RECOMMENDATION** / **OWNER DECISION** / **UNKNOWN**.

## Predecessor checks

| Check | Result |
|---|---|
| P18 annotated tag resolves | PASS |
| P19.0 forensic pack | PASS |
| P19.1 constitution commit | PASS |
| Origin contains P19.1 (`git ls-remote`) | PASS |
| Local `origin/` tracking ref | STALE (points at P15-era SHA); **ls-remote is authority** |
| Branch is P19.1 | PASS |
| Historical tags unmoved | PASS P17 `934ef55…` P18 `6c838a1…` |

STOP-P19-1.5-A not triggered.

## Evidence snapshot used by the five decisions

| Topic | FACT |
|---|---|
| Tenant type / `tenantId` | ABSENT |
| Workspace | Type + mock + `workspaceId` on product records; carries `tier`, `billingStatus`, branding |
| Isolation | Not verified; no RLS; empty `002_create_core_tables.sql` |
| Auth middleware / routes / backend jwt+authService | **0-byte** files |
| Web `authService.ts` | License + `free\|pro\|enterprise` (not mounted as live IAM) |
| `apps/api` jwt | Unpackaged fragment (ADR-009: not a second runtime) |
| Deps | backend `jsonwebtoken`, `bcrypt`, `pg`; **no** Clerk/Auth0/Stripe/Paystack/Flutterwave |
| Plan codes | `TierCode` BASIC/PRO/STUDIO vs license free/pro/enterprise |
| Prices | USD 0/29/79 in mockData + FEATURE_COMPARISON; GHS 0/45/90 in `config/tiers.ts` |
| `CurrencyCode` | `'USD' \| 'GHS' \| 'NGN' \| 'GBP'` already on shop money |
| Mock shop | Accra address, `defaultCurrency: 'GHS'`, Mobile Money **label** on invoices |
| Pattern gate | `checkCanGeneratePattern` is access-shaped, client-side, not engine mutation |

Recommendations are in sibling files. They are **not** implementation authority.
