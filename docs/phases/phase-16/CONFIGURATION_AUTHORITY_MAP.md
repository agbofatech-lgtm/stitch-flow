# Configuration Authority Map

Source of record: `CONFIGURATION_AUTHORITY_REGISTRY` / `DEFAULT_AUTHORITY_INVENTORY` (T10). **FACT.**

| Field | Values | Classification | Applied by T10 core? |
|---|---|---|---|
| hip | 98 / 100 / 102 | ENGINE_INVARIANT vs UI vs production | **NO** — unresolved |
| bust | 90 vs 96 | ENGINE_INVARIANT path-specific | NO |
| chest | 96 | ENGINE_INVARIANT | NO |
| seamAllowanceCm | 1.5 | ENGINE_INVARIANT | NO |
| fabricUnit | yards | ENGINE_INVARIANT | NO |
| CM_PER_INCH | 2.54 | DOMAIN_CONFIGURATION | YES |

`CONFIGURATION_IDENTITY = engine-internal-defaults`.  
`HIP_DEFAULT_CONFLICT.reconciled = false`.

**UNKNOWN:** which hip default is “correct”. Do not reconcile in Phase 16.
