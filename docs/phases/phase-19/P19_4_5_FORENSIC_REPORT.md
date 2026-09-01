# P19.4 + P19.5 Forensic Report

Predecessor: P19.2/P19.3 `1d07d3ad62e55578a918f99453d6a7cb45b8526c`. Tree was clean. Protected hashes UNCHANGED at start.

| Finding | Class |
|---|---|
| FeatureGate + `tierEnforcement` + `TIER_META` | **FACT** UI / TRANSITIONAL |
| USD 0/29/79 and GHS 0/45/90 | **FACT** simulation — **not** price law |
| BASIC/PRO/STUDIO vs free/pro/enterprise | **FACT** vocab conflict; seed uses BASIC/PRO/STUDIO as PlanCode only |
| Shop Invoice/Payment | **FACT** operational job money |
| Stripe/Paystack/Flutterwave SDK | **ABSENT** |
| Webhook / checkout / SaaS subscription | **ABSENT** before this slice |
| `entitlementPort` empty | **FACT** at P19.2 |
| Tenant ≠ Workspace runtime | **FACT** P19.2 |
| FeatureGate is commercial authority | **INFERENCE** (forbidden); treated as UX |
| Replace FeatureGate with `can(capability)` | **PROPOSAL** implemented server-side |
| Production PSP | **UNKNOWN / DEFERRED** |
