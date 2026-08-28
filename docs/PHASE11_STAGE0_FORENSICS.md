# Phase 11 — Stage 0 Forensics & Component Inventory

**Baseline:** `phase-10-control-center-certified` = `845285a` (local HEAD and `origin/arena/01a047e2-stitch-flow` identical; verified via `git ls-remote` on 2026-08-28). Working tree clean at start. No detach/rewind — no reconciliation needed.

## 1. Git state
- Branch `arena/01a047e2-stitch-flow`, HEAD `845285a`, tag `phase-10-control-center-certified` locally and remotely (peeled `845285a8790e7ce7c865885eaf19beb75b333f42`).
- All historical tags present and untouched (`phase-9-auth-certified` → `9add731`, etc.).

## 2. Protected IP (zero-diff at baseline)
| File | Blob SHA | diff vs tag |
|---|---|---|
| `components/DesignStudio.tsx` | `1e9fc9d776e736c23a2ef9e09342fa6a202bb3b6` | 0 lines |
| `modules/services/patternEngine.ts` | `777a075235bac0b886f1b6f068f68c8b1b8776be` | 0 lines |
| `modules/services/productionAssistant.ts` | `40266af633f54e0804433ee042732b0e1c0b927f` | 0 lines |

## 3. Baseline gates (recorded before any Phase 11 change)
- Backend: `jest --runInBand` **25/25 suites, 317/317 tests**; backend tsc clean.
- Frontend: tsc clean; vitest **7 files / 50 tests**; `vite build` green (7.9s).
- ESLint: **16 pre-existing errors, all inside `DesignStudio.tsx` (11, PROTECTED — must remain) and `modules/services/jobSheetExport.ts` (5, pre-existing)**. Gate for Phase 11 = zero NEW errors; protected file lint debt is immutable by rule §4.

## 4. Routing architecture (preserve)
`shared/router.ts` (85 lines): thin History-API helpers (`currentPath`, `navigate`, path-family predicates incl. `/platform`). App remains state-driven (`currentView` in `App.tsx`). **No router library.** Motion must hook into `navigate`/`popstate` + view switching in `App.tsx`, not replace them.

## 5. Styling system today
- Tailwind **v3** active (`@tailwind base/components/utilities` in `src/index.css`, `tailwind.config.js` with **empty theme.extend**). `@tailwindcss/vite@4` is in package.json but NOT wired in vite.config → inert; leave it.
- `src/index.css` = **3 lines total**: zero tokens, zero keyframes, zero focus policy, zero reduced-motion support. Everything is inline utilities.
- Radii inconsistent: 248× `rounded-xl`, 193× `rounded-2xl`, 97× `rounded-full`, 16× `rounded-lg`. Shadows scattered (`shadow-sm` 68, `shadow-xl` 22, `shadow-2xl` 10…). Badge palette ad-hoc (`bg-slate-50` 106, `bg-amber-50` 44, `bg-red-50` 35, `bg-emerald-50` 11…).
- Motion ad-hoc and tiny: 7× `transition-colors`, 6× `animate-spin` (loaders), 5× `ease-in-out`, 1× `animate-pulse`. No motion system.

## 6. Typography & fonts today (OFFLINE VIOLATION)
- **No local font files.** `index.html` loads **Inter from fonts.googleapis.com at runtime** (+ preconnect) — violates §21 offline rule and §12 (Inter not an approved system). Must be removed and replaced by bundled local fonts.
- `DesignStudio.tsx` (protected) canvas export uses Arial inline — untouched, acceptable (export artifact, not app chrome).

## 7. Offline architecture (preserve)
- `vite-plugin-pwa` (Workbox) precache `**/*.{js,css,html,png,svg,ico}` + `navigateFallback /index.html`, `registerType: autoUpdate`, no API runtime caching. **Local fonts emitted into dist/assets (woff2) must be precached** → add `woff2`/`woff` to globPatterns when introducing bundled fonts. `manifest:false` keeps `public/manifest.json`.
- `main.tsx` registers SW. IndexedDB/sync untouched by Phase 11.

## 8. Existing logo (absolute protection)
Approved assets exist in `src/shared/assets/`: `stitchflow-logo.png`, `stitchflow-dark-logo.png`, `stitchflow-logo1.png`, favicons 16–64, `agbofa-logo.png`, plus soft SVG illustrations (`scissors-soft.svg`, `needle-soft.svg`, `measuring-tape-soft.svg`, `sewing-machine-soft.svg`, `tailoring-soft.svg`, `symbol-soft.svg`) — ideal local empty-state/auth art. **No new logo.** Used by `Layout.tsx`, `SplashScreen.tsx`, auth screens.

## 9. Component inventory (39 tsx files)
| Component | Location | Consumers | Current API | Visual role | Status | Priority |
|---|---|---|---|---|---|---|
| App shell (sidebar/header/drawer) | `components/Layout.tsx` | 1 (App) | props: view/currentUser/… | shell | extend | P0 |
| Auth shell | `components/auth/AuthPage.tsx` | 4 (Login/Register/Forgot/Reset) | children+title layout | shell | extend | P0 |
| Splash | `components/SplashScreen.tsx` | 1 | none | logo reveal | extend (motion) | P1 |
| EmptyState | `components/ui/EmptyState.tsx` | **0 (dead)** | icon/title/body | feedback | replace with ui system | P1 |
| Platform primitives (Card/Loading/ErrorState/EmptyState/ConfirmAction/Stat…) | `components/platform/ui.tsx` | 10 platform sections | local exports | cards/feedback | promote to shared ui | P0 |
| Dashboard | `components/Dashboard.tsx` (940L) | 1 | — | metrics | refine | P2 |
| DashboardSummaryCard | `components/DashboardSummaryCard.tsx` | 1 | props | metric card | refine | P1 |
| Customers/CustomerDetail | components/ | App | — | tables/detail | refine | P2 |
| Orders/OrderCard/OrderForm | components/ | App | — | cards/forms | refine | P2 |
| Invoices/Materials/Reports/Settings/ProductionBoard | components/ | App | — | tables/lists | refine | P2 |
| DeveloperDashboard | components/ | 1 | — | dev console | refine | P2 |
| DesignStudio | PROTECTED | App | — | canvas | **do not modify** | — |
| Control Center (10 sections) | `components/platform/*` | ControlCenter | — | console | refine | P2 |
| Dialogs | only `DeveloperDashboard.tsx` uses `role="dialog"` | — | — | overlay | standardize Modal | P0 |
| Toasts | none system-wide (ad-hoc aria-live in platform ui + splash) | — | — | feedback | build Toast base | P0 |
| Tables | 10 files use `<table` | — | — | data | shared table styles | P1 |

## 10. Findings → Stage plan checkpoints
1. Foundation: tokens (color/space/radius/elevation/z/motion/type) via CSS vars + Tailwind theme extend; remove Google Fonts; bundle local fonts (open-licensed: display grotesque + body + mono) and precache woff2; global focus-visible gold; reduced-motion policy; keyframes library. → `phase-11-design-foundation`
2. Component system: promote platform/ui + new primitives into `components/ui/` (Button/Input/Card/Badge/Skeleton/EmptyState/Modal/Toast) with ONE variant-based API; migrate consumers; delete dead `ui/EmptyState` only after replacement. → `phase-11-component-system`
3. Motion: PageTransition wired to existing router/view switch; Fade/Slide/Scale/Collapse/Stagger CSS-first primitives; MotionButton hover/press per §25. → `phase-11-motion-system`
4. Application migration P1/P2 + shell + overlays + tailoring surrounds. → `phase-11-application-migration`
5. Responsive/a11y/perf/full regression + D1–D33 Chromium cert. → `phase-11-complete`

**Rules carried into every stage:** protected files never edited; router preserved; zero backend/DB/API changes; no new runtime network; tests+tsc+eslint(no-new)+build green per stage; protected-IP re-verified per stage.
