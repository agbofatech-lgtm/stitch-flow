# 08 — Frontend Experience Continuity

**Date:** 2026-09-01  
**Programme:** Premium Experience (PEX) P0–P10  
**Status:** CONDITIONALLY CERTIFIED · owner pending · next PEX stage LOCKED  
**Do not assign invented 90+ scores.** Honest overall estimate in `PEX_CERTIFICATION_REPORT.md`: **58 / 90**.

PEX redesigned chrome **around** Design Studio. Studio internals were intentionally not rewritten.

---

## Implemented experience (FACT)

### Tokens

Source: `apps/web/src/experience/tokens/tokens.css` (T4 spec + PEX warm-paper evolution).

- Brand action `#0f6e8c` (unchanged from `BRAND.colors`)
- Display: Space Grotesk · Body: Inter · Numeric: IBM Plex Mono
- PEX canvas described as warm paper `#f3efe6` in `PEX_DESIGN_SYSTEM.md`
- Dark tokens exist on `[data-theme='dark']`. **Product App does not switch theme.** Foundation preview does.
- Lucide remains the icon set. No second icon library.

### Shell / atelier grammar

`StudioShell` hosts workspaces: Atelier Home, Client Studio, Measurements, Design, Production, Business (orders / materials / invoices / reports), Settings overlay, Control Center.

Primitives (T4 + PEX): Button, Field, Panel, PageHeader, Workroom, AtelierCanvas, DataTable, Command Palette, Toast, Confirmation dialog, Inspector.

Design Studio is **framed** (`DesignStudioFrame`) not replaced.

Control Center is a separate visual plane (operator login → JSON-backed ops views). Not a SaaS-dashboard rewrite of the atelier.

Commercial UX: FeatureGate remains a visible lock/upgrade pattern and is **UX_ONLY**.

### Motion / responsive / a11y

- Motion presets exist; reduced-motion path exists (`motionOrInstant`).
- Splash no longer independently hard-waits 1800ms; min 700ms / max 1600ms (`App.tsx`).
- Breakpoints: Tailwind defaults + `workspace` 1440px.
- Accessibility work is documented as CONDITIONAL (P5–P10). Not a lab-certified a11y programme.

No background video. No 3D.

---

## Implemented vs desired

| Area | Implemented | Desired / not claimed |
|---|---|---|
| Digital atelier chrome | StudioShell + tokens + workrooms | 90-score “cinematic atelier” |
| Control Center | Login + planes over live `/control` | Designed ops UI beyond JSON payloads |
| Design Studio | Hosted in frame | Internal canvas/UX rebuild |
| Commercial | Simulation + FeatureGate | Server-consumed entitlements in atelier |
| Visual regression | Documented NOT TESTABLE (no screenshot lab) | Pixel lab |
| Performance | Bundle **measured**; runtime **NOT MEASURED** | Runtime budget |
| PWA | `manifest.json` present | Real offline PWA |

---

## Remaining residue (FACT)

- Design Studio internals intentionally untouched (~4047 lines, mixed canvas/measurements).
- Main bundle last measured ~**1016.24 kB** / gzip **294.04 kB** (laptop readiness report). Design Studio not code-split this pass.
- Runtime performance NOT MEASURED.
- Screenshot / visual regression lab NOT TESTABLE in this environment.
- Orders / Materials still use some local modals.
- Reports card-count residue recorded in P9/P10 cert.
- Unused `Dashboard.tsx` / `Layout.tsx` remain (documented, not deleted).
- Card density not universally “premium”.
- PWA manifest still branded **TailorPro**. **No service worker** in product (built `dist/sw.js` is a prior build artifact, not an architectural PWA).
- Google Fonts network dependency CONDITIONAL (PEX-R6).
- `types.ts` corruption inherited; web `tsc` FAIL inherited (`materials.ts`, `reports.ts`, `types.ts`).
- Customers / Invoices / Production Board still depend on unmounted HTTP.

---

## Routing / state (unchanged by PEX)

No URL router. AppContext view enum + StudioShell workspace state. Product SoT for shop data remains AppContext localStorage.
