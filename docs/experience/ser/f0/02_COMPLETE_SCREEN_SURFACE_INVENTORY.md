# Complete screen surface inventory

Mounted? = in product `StudioShell` / `App` tree.  
Runtime Verified? = HTML boot only unless noted. Interior states are SOURCE-EVIDENCED.

| ID | Surface | File | Mounted? | Runtime Verified? | Legacy | PEX | Condition |
|---|---|---|---|---|---|---|---|
| E0 | HTML shell | `index.html` | yes | 200 title Atelier | fonts/manifest | tokens via CSS | Google Fonts network |
| E1 | Splash | `SplashScreen.tsx` | yes | boot only | custom keyframes | duration tuned | always first |
| E2 | Experience preview | `experience-preview.html` | **separate entry** | 200 title Foundation | n/a | **full primitive showcase** | not in product nav |
| N1 | Atelier Home | `atelier/AtelierHome.tsx` | yes | not visually | AppContext data | Workroom/Panel | populated from local SoT |
| N2 | Client Studio | `components/Customers.tsx` | yes | not visually | HTTP `/customers` | Workroom + Dialog | **likely ErrorState** if backend default |
| N3 | Measurements | `studio/MeasurementWorkspace.tsx` | yes | not visually | AppContext profiles | Workroom/DataTable | body/garment split in table |
| N4 | Design frame | `atelier/DesignStudioFrame.tsx` | yes | not visually | n/a | thin chrome | badges, not immersive |
| N5 | Design Studio | `components/DesignStudio.tsx` | yes | not visually | **protected monolith** | Dialog for SAC-1 only | canvas dominates |
| N6 | Production | `components/ProductionBoard.tsx` | yes | not visually | HTTP `/orders` | PageHeader + leftover gradient | **likely ErrorState** |
| N7 | Orders | `components/Orders.tsx` | yes | not visually | AppContext + local modals | Workroom/PageHeader | local SoT works |
| N8 | Materials | `components/Materials.tsx` | yes | not visually | AppContext + FeatureGate | Workroom + local MaterialModal | inventory UX |
| N9 | Invoices | `components/Invoices.tsx` | yes | not visually | HTTP invoices/payments | Workroom | **likely ErrorState** |
| N10 | Reports | `components/Reports.tsx` | yes | not visually | AppContext metrics + dense cards | PageHeader/Workroom | dashboard-like interior |
| N11 | Settings | `components/Settings.tsx` | overlay | not visually | large form surface | Workroom wrap | mixed token/legacy classes |
| N12 | Control Center | `control/ControlCenter.tsx` | overlay, `data-theme=dark` | needs backend | JSON payloads | Workroom/login | operator plane |
| S1 | Command palette | experience CommandPalette | yes | not visually | n/a | PEX | Ctrl/Cmd+K |
| S2 | Inspector | WorkflowPanel + WorkspaceInspector | default ≥1280 | not visually | workflow context | InspectorPanel | hidden on small |
| S3 | Status bar | StudioShell | yes | not visually | T2 badge | StatusBar | sync not a ceremony |
| S4 | FeatureGate | `FeatureGate.tsx` | used in materials/reports | not visually | UX_ONLY | lock pattern | not server entitlement |
| S5 | Toasts | connectivity toasts | yes | not visually | n/a | ToastRegion | connectivity only |
| D1 | Layout | `Layout.tsx` | **no** | n/a | yes | no | dead |
| D2 | Dashboard | `Dashboard.tsx` | **no** | n/a | yes | no | dead |

## System states (source)

| Surface | loading | empty | error | retry | modal |
|---|---|---|---|---|---|
| Customers | LoadingState | ExperienceEmptyState | ErrorState | yes | shared Dialog |
| Production | WorkspaceSkeleton | (after load) | ErrorState + inline red box | yes | none primary |
| Invoices | LoadingState | ExperienceEmptyState | ErrorState | yes | local InvoiceModal/PaymentModal |
| Orders | n/a (sync local) | ExperienceEmptyState | form errors | n/a | **local OrderFormModal** |
| Materials | n/a | ExperienceEmptyState | FeatureGate | n/a | local MaterialModal |
| Splash | progress copy | n/a | n/a | n/a | n/a |
| Offline | StatusBar badge | T2 queue count | no global offline wall | n/a | n/a |

Do not call HTTP workrooms “redesigned” because they import `Workroom`.
