# P1 — Digital Atelier Audit

Live shell workspaces (`apps/web/src/studio/workspaces.ts`): Command Center, Client Studio, Measurements, Design, Production, Business.

## Journey vs UI

| Stage | Surface | Continuity |
|---|---|---|
| WHO / customer | Client Studio → `Customers.tsx` | CRUD list; not atelier identity |
| Measurements | `MeasurementWorkspace` (T2/T5 language) | Stronger authority UX than CRUD |
| Garment spec | Workflow inspector + Studio | Split; user must know two panels |
| Composition | Domain exists; no dedicated cinematic room | GAP |
| Design Studio | Hosted in Design workspace | Protected; slate/sky nested inside token shell |
| Pattern | Canvas in DesignStudio | Technical, not fashion-runway |
| Production | ProductionBoard kanban | Generic SaaS board |
| AI advisory | Studio “AI Suggestion” + FeatureGate | Heuristic; UX_ONLY gate |
| Delivery | Order status / stages in workflow panel | Textual, not ceremonial |
| Settings | Overlay in shell | Competes with Control Center (none) |

## Context awareness

WorkflowPanel lists Customer → Measurement → Design → Spec → Pattern → Materials → Order → Production → Delivery as **badges**, not a spatial journey.

User can lose: which customer, which garment, trusted vs advisory — unless inspector is open (`xl` only).

**Atelier score driver:** naming is atelier; rooms are still SaaS pages.
