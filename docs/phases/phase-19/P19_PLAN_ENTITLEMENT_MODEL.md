# P19 Plan & Entitlement Model (paper)

Status: **PAPER** — P19.5 **LOCKED** (OD-P19-02, OD-P19-03 / STOP-P19-E).

## Plan vs entitlement

- **Plan** — commercial package (catalog version, price reference).
- **Entitlement** — explicit capability or limit grant, tenant-scoped, time-aware, auditable, **server-authoritative**.

Application asks `can(tenant, "AI_ADVISORY")`, not `plan === "PRO"`.

## LEGACY — not law

| Source | Codes | Money |
|---|---|---|
| `TierCode` / FeatureGate | BASIC, PRO, STUDIO | USD 0 / 29 / 79 |
| `config/tiers.ts` | BASIC, PRO, STUDIO | GHS 0 / 45 / 90 |
| `authService` | free, pro, enterprise | device limits from env |

P19.1 does **not** choose a catalog. New screens must not add a fourth table (ADR-006).

## Entitlement properties (when built)

Explicit, deterministic, auditable, versionable, tenant-scoped, time-aware if required, server-authoritative. Must not mutate Trusted Core.
