# P19.1.5 Trusted Core Non-Contamination Audit

```
┌──────────────────────────────────┐
│ COMMERCIAL / ACCESS PLATFORM     │
│ Identity · Tenant · Entitlements │
│ Subscription · Billing           │
└───────────────┬──────────────────┘
                │ ACCESS GATE ONLY
                ▼
┌──────────────────────────────────┐
│ TRUSTED TAILORING CORE           │
│ P13 → P14 → P15 → P16 → P17      │
│ Commercially unaware             │
└──────────────────────────────────┘
```

Commercial MAY: CAN ACCESS / CAN EXECUTE / USAGE LIMIT / FEATURE AVAILABLE.  
Commercial MUST NOT: MEASUREMENT VALUE / PATTERN FORMULA / GARMENT IDENTITY / COMPOSITION LAW / DETERMINISTIC OUTPUT / AI AUTONOMY.

| Decision | Alters P13–P17 computation? | Notes |
|---|---|---|
| OD-P19-01 Tenant model B | **NONE** | Isolation key only |
| OD-P19-01 Option A | **NONE** if access-only; **risk** if Workspace.tier keeps driving engines |
| OD-P19-05 Auth A | **NONE** | Who ≠ hip |
| OD-P19-02 Hybrid codes | **NONE** if `can(capability)` wraps access. **FAIL** if `if (plan===PRO) hip=100` |
| OD-P19-03 Multi-currency catalog | **NONE** | Amounts not selected |
| OD-P19-04 Defer provider | **NONE** | No SDK |

Existing **risk (FACT):** `checkCanGeneratePattern` sits on the access path to pattern generation. That is the correct *shape* (deny access) and the wrong *authority* (client FeatureGate). P19 must not move that `if` into `patternEngine.ts`.

Protected assets must remain unmodified. This package is documentation only → **PASS** for non-contamination of this stage.

**STOP-P19-1.5-G not triggered.**
