# P19 Risk Register

| ID | Risk | Class | Mitigation |
|---|---|---|---|
| P19-R1 | Promote FeatureGate to billing law | ADR-006 | Keep TRANSITIONAL |
| P19-R2 | USD vs GHS price tables | FACT conflict | Do not pick a winner in Stage 0 |
| P19-R3 | BASIC/PRO/STUDIO vs free/pro/enterprise | FACT conflict | One vocabulary later |
| P19-R4 | Shop Payment = SaaS Payment | STOP-P19-H | Separate domains |
| P19-R5 | Entitlement changes pattern formulas | STOP-P19-G | Access only |
| P19-R6 | Cross-tenant SQL without filter | STOP-P19-E | Do not mount unfiltered routes as tenancy |
| P19-R7 | Empty auth middleware treated as IAM | — | PARTIAL only |
| P19-R8 | Control Center as Settings rewrite | STOP-P19-M | ADR-007 |
| P19-R9 | Erase P18 unknown isolation | P18-C-016 | Inherit |
| P19-R10 | Secrets in client for future PSP | STOP-P19-K | Ports on server |
