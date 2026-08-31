# T6 Forensic Map

| Field | Value |
|---|---|
| Date | 2026-08-31 |
| T5 checkpoint | `transformation-t5-studio-shell-complete` → `191cb6ffc9835a60907bb236f6675e23e44a5591` |
| Stage | T6 — Workflow Migration (implementation submitted; not tagged) |

## FACT

- T5 shell hosts six workspaces. Routing remains AppContext `currentView`. No React Router.
- Design Studio remains `apps/web/src/components/DesignStudio.tsx` (PROTECTED). T6 hosts it; it is not rewritten.
- Pattern Engine and Production Assistant remain behind T3 gateways. T6 calls those wrappers.
- Measurement profiles and order snapshots live in AppContext (TRANSITIONAL localStorage). T6 does not add a localStorage key.
- Freeze already exists: `applyMeasurementProfileToOrder` copies a profile onto `order.measurementSnapshot` with `capturedAt`.
- Studio → order already exists: `saveStudioOutputToOrder`.
- Canonical order statuses: `draft | in_progress | ready | delivered | cancelled`.
- Canonical production stages: measurement → cutting → sewing → embroidery → first_fitting → second_fitting → final_press → ready → delivered.
- Two customer populations exist (T0): HTTP `Customers.tsx` via backend API, and AppContext customers that own measurement profiles. T6 workflow selection uses AppContext customers because that is where profiles live.
- Material quantity visible on an order comes from `productionPlan.fabricEstimate` and optional `selectedFabricId`. Advanced fabric intelligence is Phase 16 / locked.
- T2 garment repository already exists. T6 snapshots a `GarmentSpecification` payload into it.

## INFERENCE

- Connecting the existing freeze / T3 pattern / T3 production / studio-save functions through the inspector is sufficient to make the chain operable without a new router or engine.

## PROPOSAL (implemented, awaiting Owner Acceptance)

- Inspector hosts a workflow panel: Customer → Measurement → Design → Garment spec → Pattern → Materials → Order → Production → Delivery.
- Do not invent workflow states beyond existing order status + production stages.
- Do not tag T6 until Owner ACCEPT.
