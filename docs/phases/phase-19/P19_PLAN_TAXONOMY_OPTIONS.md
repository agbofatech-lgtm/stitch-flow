# OD-P19-02 — Plan Taxonomy Options

**QUESTION:** What is the canonical **internal** plan taxonomy?

Do not select prices. Do not implement plans. Display names ≠ domain authority.

## FACT

| Vocab | Where |
|---|---|
| BASIC / PRO / STUDIO | `TierCode`, mock `tiers`, FeatureGate, `config/tiers.ts` |
| free / pro / enterprise | web `authService` + env device limits — unused live IAM |
| `if (tier.code === 'PRO')` | `tierEnforcement.ts` (LEGACY) |

ADR-011: configuration over hardcoding. ADR-006: no third price table; FeatureGate is not law.

## Required split

```
PlanCode          immutable identifier
PlanDefinition    display name, description, commercial metadata
Price catalog     separate (OD-P19-03) — PLAN ≠ PRICE
Entitlements      grants/limits — not `plan === "Pro"`
```

Forbidden later: `if (plan === "Professional 2026")`.

## OPTIONS

### A — Fixed enum in application code (keep BASIC/PRO/STUDIO)

Fast; already typed. Spreads commercial ifs. Hard to version a plan.

### B — Database/Control Center catalog (opaque PlanCode)

Versionable. Needs Control Center (ABSENT). Overkill if catalog is empty.

### C — Hybrid (recommended)

- Internal `PlanCode` as stable opaque codes (not marketing sentences).
- `PlanDefinition` + entitlement map as **configuration** (file or table later).
- Product asks `can(tenant, capability)`.
- **Seed codes:** treat existing BASIC/PRO/STUDIO as **legacy seed identifiers**, not as proof they are the commercial offer.
- Do **not** promote free/pro/enterprise (stub license path).

### D — Defer catalog; no new codes in product

Safest until OD-P19-02 is ticked. FeatureGate remains TRANSITIONAL.

## RECOMMENDATION

**C (hybrid)** for target architecture; **D** until the Owner ticks this register (no new catalog in code). Prefer BASIC/PRO/STUDIO as legacy *seed codes* over free/pro/enterprise because they are the only product-facing `TierCode`. Owner may replace seeds.

**Confidence:** Medium (packaging is a commercial choice).

**OWNER DECISION REQUIRED:** YES
