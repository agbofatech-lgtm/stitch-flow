# P19.1.5 Risk Register

| ID | Risk | Mitigation |
|---|---|---|
| R15-01 | Treat recommendation as implementation authority | Gate: P19.2 locked |
| R15-02 | Collapse Tenant into Workspace because types are easier | OD-P19-01 B |
| R15-03 | JWT carries entitlements as law | Auth rec: `sub` only |
| R15-04 | Custom JWT operated unsafely | Owner may pick managed IdP (option B) |
| R15-05 | Seed BASIC/PRO/STUDIO becomes eternal marketing ifs | Hybrid + `can(capability)` |
| R15-06 | Picking 29/79 or 45/90 | No amounts in this package |
| R15-07 | Naming Paystack without merchant evidence | DEFER provider |
| R15-08 | `checkCanGeneratePattern` moves into patternEngine | Firewall audit |
| R15-09 | Stale local `origin/` ref vs ls-remote | Verify with `git ls-remote` |
| R15-10 | Starting P19.2 before ticks | STOP this gate |