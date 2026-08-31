# P19 Entitlement Forensics

**PAYMENT ≠ SUBSCRIPTION ≠ ENTITLEMENT** — none of the three SaaS layers is authoritative.

| Gate | Mechanism | Class |
|---|---|---|
| maxCustomers / assistants | `tierEnforcement` + mock customer list | TRANSITIONAL |
| PDF / pattern / fabric viz | hardcoded `getTierLimits` | TRANSITIONAL |
| FeatureGate features | `config/tiers.ts` FEATURE_MIN_TIER | UI + client logic |
| `simulateTier` | AppContext | **not production entitlement** |
| `checkCanGeneratePattern` | plan check wrapping engine **access** | must not become formula change |
| License maxDevices | authService + env limits | LEGACY parallel model (`free/pro/enterprise`) |

No `EntitlementResolver`. No subscription-backed decision.

**Risk:** `checkCanGeneratePattern` sits next to Pattern Engine callers — future billing must gate **access**, never formulas (STOP-P19-G).
