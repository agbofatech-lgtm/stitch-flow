# P5 — Workspace UX Audit

## Coherent pieces (FACT)

StudioShell: aside nav, sticky header, canvas, inspector (xl), footer connectivity, mobile 6-col nav, command menu, settings overlay, framer-motion wait.

## Competing patterns

| Pattern | Where |
|---|---|
| Token shell | StudioShell |
| Unused Layout.tsx | slate sidebar + tier simulation |
| Nested min-h-screen gradient | DesignStudio, Dashboard, etc. |
| FeatureGate compact vs full | FeatureGate.tsx |
| EmptyState indigo | `components/ui/EmptyState.tsx` vs `ExperienceEmptyState` |

No React Router (`studio.test.ts`). View state in AppContext.

Inspector hidden below xl; Sheet on smaller screens — easy to miss WHO/WHAT.

Business surfaces are pills in header (md+) — Orders/Materials/Invoices/Reports.

Breadcrumbs primitive exists (`experience/primitives/navigation.tsx`); StudioShell does not use it.
