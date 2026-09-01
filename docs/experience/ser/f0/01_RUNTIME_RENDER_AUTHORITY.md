# Runtime render authority

SOURCE-EVIDENCED unless marked otherwise.

## Entry

```
npm run dev:web
  → Vite :5173 (or next free port)
  → apps/web/index.html
  → /src/main.tsx
```

`main.tsx`:

1. Side-effect: `startDataAuthorityRuntime()` then `projectLegacyShopFromStorage()` (T2 mirror, SAC-2; default sync transport still blocked).
2. `createRoot(#root).render(<StrictMode><App /></StrictMode>)`.

Second HTML entry exists and is **not** the product:

```
experience-preview.html → /src/experience/preview/main.tsx → ExperienceFoundationPreview
```

RUNTIME-EVIDENCED: both HTML documents serve. Product title is atelier-branded; preview title is “Experience Foundation”.

## Product tree (actual)

```
main.tsx
├── T2 runtime (side effect, not a React provider)
└── App
    └── AppProvider          AppContext + localStorage (UI SoT)
         └── AppContent
              ├── SplashScreen          until onComplete (min 700ms / max 1600ms)
              └── WorkflowProvider
                   └── StudioShell      NO URL ROUTER
                        └── AtelierShell
                             ├── AtelierNavigation
                             ├── WorkspaceHeader
                             ├── ContextBar (business only)
                             ├── WorkspaceCanvas
                             │    AnimatePresence key = workspace+business+overlays
                             │    ├── command      → AtelierHome
                             │    ├── clients      → Customers.tsx
                             │    ├── measurements → MeasurementWorkspace
                             │    ├── design       → DesignStudioFrame → DesignStudio
                             │    ├── production   → ProductionBoard.tsx
                             │    ├── business     → Orders | Materials | Invoices | Reports
                             │    ├── settingsOpen → Settings
                             │    └── controlOpen  → ControlCenter
                             ├── InspectorPanel (xl default open)
                             │    ├── WorkflowPanel
                             │    └── WorkspaceInspector
                             ├── StatusBar (member · T2 connectivity · queue count)
                             ├── mobile nav (6 workspaces)
                             ├── CommandPalette (Ctrl/Cmd+K)
                             └── ToastRegion
```

Navigation authority: **state**, not URLs.

- `StudioShell` local `workspace` / `business` / overlay flags.
- `AppContext.currentView` kept in sync for legacy views (`dashboard`, `customers`, …).
- Measurements has **no** `AppView` (`viewForWorkspace('measurements')` returns null).

## What does not run

| Artifact | Status |
|---|---|
| `components/Layout.tsx` | SOURCE: unused by product `App.tsx`. Nested `stitch-flow/` still uses it. **Dead in product.** |
| `components/Dashboard.tsx` | Unused by product App. Atelier Home replaced it. **Dead in product.** |
| React Router | None in product. |
| `MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES` CRUD | Unmounted by default; Customers / Production / Invoices still **call** those URLs. |

## Shell verdict

`StudioShell` **does** dominate product runtime. Old Layout/Dashboard are not mounted. PEX chrome (nav, header, inspector, status, command palette) is the structural frame. Interior workrooms are mixed: some PEX-native, some HTTP error walls, some legacy tables/modals inside Workroom wrappers.
