# T6 Contract Map

| Step | Existing contract | T6 consumption |
|---|---|---|
| Customer | AppContext `customers` | Workflow select. HTTP Customers screen remains a separate population. |
| Measurement | `CustomerMeasurementProfile` + T3 `separateLegacyMeasurementBlob` | Inspector + Measurement workspace. Body / garment / pattern derived. |
| Freeze | `applyMeasurementProfileToOrder` | Writes `measurementSnapshot.capturedAt`. Live profile edits do not silently rewrite history. |
| Design | Hosted `DesignStudio` | Unedited. `saveStudioOutputToOrder` from inspector. |
| Garment spec | Order + profile fields | `buildGarmentSpecification` — handoff artifact, not a new engine. |
| Pattern | T3 `requestPattern` | Wrapper only. Engine file unedited. |
| Materials | `productionPlan.fabricEstimate` + `selectedFabricId` | Visibility only. No Phase 16 fabric intelligence claim. |
| Order | `Order.status` | Labels mapped from existing statuses only. |
| Production | T3 `requestProductionPlan` + `PRODUCTION_STAGE_SEQUENCE` | Plan attached via `updateOrder`. Stages not reinvented. |
| QC | `first_fitting` / `second_fitting` | Existing stage codes. |
| Delivery | `status: delivered` and/or stage `delivered` | Existing codes. |
| Spec persist | T2 `repositories.garment` | Optional snapshot. No new localStorage. |

## Non-contracts (STOP)

- No new order state machine
- No Pattern Engine / Production Assistant / Design Studio rewrite
- No React Router
- No unauthenticated CRUD
- No silent conflict merge
- No T7 extraction
- No Control Center / billing / AI / 3D
