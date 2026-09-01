# 09 — Contract Drift Matrix

**Do not fix types.**

## Corrupted barrel (FACT)

`apps/web/src/types.ts` is a copy of `main.tsx` (10 lines). Many UI files `import type` from `../types`. Canonical types: `apps/web/src/shared/types/index.ts`. Vite type-erasure lets runtime proceed; `tsc` FAIL inherited.

## Drift matrix

| Concept | UI type | Domain type | API type | DB schema | Drift |
|---|---|---|---|---|---|
| Customer | `Customer` workspaceId, profiles | none beyond types | `ApiCustomer` | `customers` (initDb / unmounted) | **HIGH** split |
| Measurement | `GarmentMeasurements` blob | T3 separate + MeasurementVersion | none | none | live vs frozen |
| Order | AppContext `Order` rich JSON | T6 spec projection | SQL order row | `orders` | **HIGH** |
| Pattern | canvas `StylePatternResult` | T10 `DeterministicComputationResult` | none | none | Path A vs C |
| ProductionPlan | on Order | T10 heuristic identity | JSON column | intended | `generatedAt` |
| Invoice | HTTP screen | none | invoice DTO | invoices | vs AppContext seed |
| Tenant | Control Center JSON | platform `Tenant` | `/platform/context` | `006` not applied | vs atelier workspaceId |
| Membership | none in atelier | `Membership` | context.membership | `006` | — |
| Subscription | FeatureGate tier | commercial Subscription | `/platform/billing` | `006` | FeatureGate UX_ONLY |
| Entitlement | `tierEnforcement` | `decideAccess` | `/platform/access/check` | derived | **HIGH** dual |

## Other drifts

- Payments path `/invoices/:id/payments` vs `/payments`
- Production `/stages` vs `/production-stages`
- `docs/api.md` `/api/v1` vs live unprefixed
- Zod `orderStudio.schema.ts` unwired
- `VITE_API_BASE_URL` vs `VITE_API_URL`
