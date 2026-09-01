# P19 Risk Register

| ID | Risk | Class | Mitigation |
|---|---|---|---|
| P19-R1 | Promote FeatureGate to billing law | ADR-006 | Keep TRANSITIONAL |
| P19-R2 | USD vs GHS price tables | OD-P19-03 / STOP-P19-E | Owner ticks register; no third table |
| P19-R3 | BASIC/PRO/STUDIO vs free/pro/enterprise | OD-P19-02 / STOP-P19-E | Owner ticks register |
| P19-R4 | Shop Payment = SaaS Payment | STOP-P19-F | Separate domains (firewall) |
| P19-R5 | Entitlement changes pattern formulas | STOP-P19-H | Access only; firewall tests later |
| P19-R6 | Cross-tenant SQL without filter | STOP-P19-D | Isolation not claimed; OD-P19-01 |
| P19-R7 | Empty auth middleware treated as IAM | STOP-P19-B | OD-P19-05 |
| P19-R8 | Control Center as Settings rewrite | STOP-P19-I | ADR-007 paper architecture |
| P19-R9 | Erase P18 unknown isolation | P18-C-016 | Inherit |
| P19-R10 | Secrets in client for future PSP | STOP-P19-K | Ports on server |
| P19-R11 | Implement Stripe before constitution | STOP-P19-G | P19.6 locked |
| P19-R12 | Treat glossary Tenant as live isolation | STOP-P19-C | Runtime Tenant ABSENT |
| P19-R13 | File JSON mistaken for Postgres | P19.10 | Classified NOT VERIFIED |
| P19-R14 | FeatureGate treated as server law | ADR-006 | UX_ONLY; server access/check is law |
| P19-R15 | Test webhook as PSP certification | P19.5/P19.10 | LIVE PSP DEFERRED |
| P19-R16 | CORS origin:true in production | CONDITIONAL | Owner/ops must tighten |
| P19-R17 | No logout/refresh denylist | UNKNOWN | Not invented |
| P19-R18 | Derived entitlements vs stored rows | FACT | Recover via subscription+plan |
