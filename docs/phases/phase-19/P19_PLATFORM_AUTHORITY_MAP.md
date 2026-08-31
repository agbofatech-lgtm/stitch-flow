# P19 Platform Authority Map

| Domain | Current authority | Evidence | Status | Target (PROPOSAL) |
|---|---|---|---|---|
| Identity | Mock User + empty auth routes | types, AppContext, empty auth.ts | PARTIAL | Platform identity service |
| Tenant | Workspace field/mock | workspaceId, default-workspace | PARTIAL | Explicit tenant authority |
| Membership | WorkspaceMember mock | types, mockData | PARTIAL | Membership service |
| Authorization | Client canPerform / role flags | AppContext, tierEnforcement | PARTIAL | Server authorization |
| Commercial products | Dual hardcoded catalogs | tiers.ts vs FEATURE_COMPARISON | CONFLICT | Single catalog |
| Plans | BASIC/PRO/STUDIO vs free/pro/enterprise | types vs authService | CONFLICT | One plan vocabulary |
| Subscription | Workspace.billingStatus type | no persistence of SaaS sub | ABSENT | Subscription authority |
| Billing | Shop invoices only | Invoice/Payment | WRONG LAYER for SaaS | Separate SaaS billing |
| Payments | Shop payments; no PSP | paymentRoutes unmounted | ABSENT SaaS | Payment port |
| Entitlements | FeatureGate simulation | FeatureGate, tierEnforcement | TRANSITIONAL | Entitlement resolver |
| Usage | none | — | ABSENT | Metering |
| Configuration | env names + Settings UI | .env.example | PARTIAL | Audited settings |
| Operations | /health stub | app.ts | PARTIAL | Ops plane |
| Audit | referenced service | authService | UNKNOWN | Audit authority |
| Analytics | dashboard mock | AppContext | UI | Analytics truth ≠ tailoring |

No implementation until Owner authorizes slices after this map.
