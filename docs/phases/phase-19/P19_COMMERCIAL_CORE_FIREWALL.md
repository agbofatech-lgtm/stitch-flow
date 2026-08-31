# P19 Commercial / Trusted Core Firewall

Binding for all later P19 slices. Complements ADR-001 and ADR-006.

## Direction

```
Commercial Platform → Authorization / Entitlement → Application access → Trusted Core
```

Never the reverse: billing, plan, or Control Center must not flow into formulas.

## Commercial may know

`tenantId`, `userId`, subscription status, plan id, entitlements, usage counters, billing status, capability keys.

## Trusted tailoring may know

`MeasurementVersion`, `GarmentSpecificationVersion`, `GarmentCompositionVersion`, `ConfigurationVersion`, execution provenance, pattern/production outputs.

## Commercial may

- Deny or allow **invocation** of Design Studio, Trusted Execution, AI Advisory, export
- Record `CommercialUsageEvent { executionId, tenantId, timestamp }` **referencing** an execution
- Suspend a tenant so **new** access fails

## Commercial must not

- Mutate Measurement / Specification / Composition / TrustedTailoringExecution / PatternOutput / ProductionOutput
- Inject plan defaults into engines (including hip 98/100/102)
- Coerce unknown garment types
- Override frozen authorities
- Turn P17 into autonomous authority
- Rewrite historical deterministic output from Control Center

## Tests that must exist before any “commercial complete” claim

1. Entitlement denial returns ACCESS_DENIED and does not call engines.
2. Entitlement grant does not change engine outputs for the same frozen inputs.
3. Protected file hashes unchanged vs T0.
4. No `plan` / `tier` / `subscription` fields on execution output types.

These tests are **not written in P19.1**.
