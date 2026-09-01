# P19.2 + P19.3 Decision Authorization

The P19.1.5 Owner Decision Register checkboxes remain **unticked** (agents must not forge Owner: Agbofa Benjamin).

This file **records** the P19.2+P19.3 master execution prompt (2026-09-01) as implementation authorization for the five decisions — it is not a Phase 19 completion tag and not Owner Acceptance of the stage.

| ID | Authorized decision |
|---|---|
| OD-P19-01 | Tenant is security/commercial isolation boundary. Workspace is operational context inside Tenant. Bootstrap 1:1. Future multi-workspace without `tenantId === workspaceId`. |
| OD-P19-05 | Complete authentication on existing `apps/backend`. No parallel identity backend. |
| OD-P19-02 | PlanCode → entitlement definition → capabilities. Plan names are not authorization. **Not implemented this slice** (interface only / STOP-P19-IDENTITY-L). |
| OD-P19-03 | Multi-currency catalog. Plan ≠ Price. No pricing hardcoding. |
| OD-P19-04 | Provider-neutral. Provider selection deferred. No PSP this slice. |

STOP-P19-IDENTITY-A is **not** treated as a halt: decisions are formally recorded here from the authorized execution command, without ticking the Owner signature boxes.
