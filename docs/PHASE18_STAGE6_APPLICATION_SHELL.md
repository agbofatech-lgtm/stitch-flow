# Phase 18 — Stage 6: Application Shell & Navigation Implementation
**Baseline:** Stage 5 `81329d5` → Stage 6 final (see log) · **Branch:** `arena/01a04eef-stitch-flow`
**Evidence classes:** VERIFIED (repo-proven) · IMPLEMENTED (Stage 6 change) · INFERRED · PROPOSED · UNRESOLVED.

## A. Executive summary
IMPLEMENTED the Workspace application shell from Stage 5 primitives: business-intent navigation model (`src/shell/navigation.ts`), desktop shell (sidebar + header + account menu), mobile shell (bottom navigation ≤5 destinations + DS-Drawer "More" sheet), honest offline indicator, platform/developer boundary entries, and shell-level a11y (landmarks, `aria-current`, skip link, focus management). The existing 12-view switcher and every screen are UNCHANGED — the shell wraps them (`AuthenticatedApp` swap). Validated by 13 new shell tests (**197/197 total**), tsc 0, build 6.44 MB (+1 chunk), and live browser passes at 1440/834/390 with **0px overflow, 0 console errors**, working navigation, More sheet and account-menu Escape behavior.

## B. Baseline
`81329d5` on `arena/01a04eef-stitch-flow`, clean tree, tags fetched, HEAD = expected Stage 5 commit (§7 protocol executed).

## C. Current shell forensics (before)
VERIFIED: `App.tsx` route gate (public/auth/developer/platform path families, Phase 8/9/10/12 contracts); `AuthenticatedApp` = view-state switcher (dashboard, customers, orders, production-board, invoices, design-studio, materials, reports, settings, developer, platform) inside `Layout.tsx`; Layout = fixed 288px sidebar with 10 items (+Control Center inserted for platform-role claims), tier badge, account dropdown holding DEMO controls (Switch Role owner/assistant, Simulate Tier BASIC/PRO/STUDIO); mobile = hamburger + slide-in sidebar; `featureAccess` (tierEnforcement) exposes NO developer field; developer APIs gated server-side by `DEVELOPER_API` flag + staff JWT (`requireFeatureFlag`, VERIFIED); sign-out exists in AccountPanel (`logout()` clears tokens only); no shell-level online/offline or sync store exists.

## D. Target shell architecture (IMPLEMENTED)
`WorkspaceShell` (`src/shell/WorkspaceShell.tsx`): header (banner: workspace identity + view title + offline pill + account menu) · desktop sidebar (complementary, ≥lg: logo/identity, PRIMARY nav, divider, SECONDARY+CONDITIONAL) · `main` (unchanged `PageTransition` content, skip-link target) · mobile bottom nav (<lg: Home/Customers/Orders/Production/More, 56px targets, safe-area) · More sheet (DS `Drawer` → bottom sheet: secondary destinations + conditional entries). `Layout.tsx` retained on disk unused (removal deferred — §K).

## E. Navigation model
PRIMARY: **Home** (dashboard) · **Customers** · **Orders** · **Production** (production-board) · **Finance** (invoices, D1). SECONDARY: Materials · Reports · **Design Studio** (D2 legacy entry, badged "legacy", kept until Stage 8 contextual entry — replacement-before-removal) · Settings. CONDITIONAL: **Control Center** (platform role claim only) · **Developer** (secondary; see G). Labels are presentation only — view ids unchanged, zero route/view breakage. No intelligence/engine destination exists at nav level (tested SH1).

## F. Application surface boundaries
Public (`/`, landing) · Auth (`/login` family) · Workspace (`/` app + views) · Developer (`/developer` deep-link ↔ view, preserved) · Platform (`/platform` ↔ view, preserved). Gate logic untouched; showcase `/design-system` unchanged. Surfaces remain distinct in one deployment (Stage 1 architecture).

## G. Role & authorization integration
| Destination | Owner | Admin/Assistant | Platform role | Developer |
|---|---|---|---|---|
| Home/Customers/Orders/Production/Finance | VERIFIED visible (no per-view role gate exists today) | VERIFIED visible | VERIFIED visible (+ Control Center entry) | VERIFIED visible |
| Control Center | hidden (role claim absent) | hidden | VERIFIED entry (server authorizes every /platform call — Phase 10) | hidden |
| Developer | visible (as today) | visible | visible | visible — **server-enforced** (`DEVELOPER_API` + staff JWT) |
Visibility ≠ authorization: no route guard weakened, backend enforcement authoritative (§29). UNRESOLVED: client-side entitlement-gated Developer visibility — `featureAccess` exposes no signal; Stage 6 does not invent one (§20). Demo tools (Switch Role / Simulate Tier) preserved in account menu, labelled "Demo tools" (removal = owner decision).

## H. Responsive architecture
Breakpoint: `lg` (1024) is the shell seam (matches legacy Layout). ≥1024: persistent sidebar + header, no bottom nav. <1024: bottom nav + header + More sheet. Validated 1440/834/390: sidebar↔bottom swap correct, **0px page-level overflow**, no clipped nav, 56px mobile targets ≥44px minimum, safe-area padding on bottom nav + More footer.

## I. Accessibility
Landmarks: banner/main/complementary + labelled navs (Primary ×2 surfaces, Secondary, More) · skip-to-content link · `aria-current="page"` on active items in every surface (non-colour active: fill + weight + gold icon + top-bar on mobile) · focus-visible rings via DS contract · account menu: `aria-haspopup/expanded`, focus-in, **Escape closes + focus restore** (browser-verified) · More sheet: DS Drawer focus trap/Escape/restore + `aria-modal` (browser-verified) · reduced motion: DS tiers respected; bottom nav `ds-motion-none`.

## J. Offline behavior
Navigation is pure client state (no network on transitions) — offline-usable by construction. Indicator (IMPLEMENTED): reports **Offline** only from `navigator.onLine === false` ("Offline — work continues locally"); never claims Synced/Syncing — **GAP (documented §25/27): no shell-level sync store exists to consume**; SYNCING/SYNCED states UNRESOLVED until a sync-status source exists. Offline architecture untouched.

## K. Migration record (current → target)
Dashboard→Home (RENAME label) · Production Board→Production (RENAME) · Invoices→Finance (RENAME, D1) · Customers/Orders→KEEP · Materials/Reports/Settings→MOVE to secondary/More · Design Studio→MOVE to secondary, badged legacy (D2; no capability removal) · Developer→MOVE to secondary (behavior preserved) · Control Center→KEEP conditional logic verbatim (Phase 10 contract) · Demo role/tier controls→MOVE into account menu (preserved) · hamburger sidebar→REPLACED by bottom nav + More sheet (mobile pattern per Stage 3 §10) · legacy `Layout.tsx`→UNUSED, deletion deferred to owner-approved cleanup.

## L. Files changed
`apps/web/src/shell/navigation.ts` (new) · `src/shell/WorkspaceShell.tsx` (new) · `src/AuthenticatedApp.tsx` (Layout→WorkspaceShell swap only) · `src/design-system/Overlay.tsx` (documented extension: export `useModalBehaviour` for account menu reuse — §33 path 3) · `tests/offline/phase18-app-shell.test.tsx` (new) · this document. **Zero backend changes; zero protected-asset changes (verified by diff).**

## M. Tests
`phase18-app-shell.test.tsx` SH1–SH9: nav-model intent (5 primaries, no engine names), sidebar hierarchy + aria-current, bottom-nav ≤5 + touch targets + More-active state, More sheet dialog semantics + navigation, account menu (identity/settings/sign-out/demo preservation + Escape/focus-restore), platform conditional visibility, offline honesty (appears only offline; never claims sync), landmarks + skip link, view-title mapping. **Full suite: 197/197** (184 prior + 13 new). tsc 0 errors.

## N. Browser validation (DOM-level, LIMITED — no visual inspection)
Live app, logged-in session shared across passes: **1440** sidebar✓ bottom-nav✗ title "Home"→click→"Production"✓ account menu open/Escape-closed✓ · **834** bottom-nav✓(5 items) More sheet `aria-modal`✓ (Materials/Reports/Design Studio/Settings/Developer/Control Center)→navigate "Materials"✓ sheet closes✓ · **390** same + ✓ · **all: 0px overflow, 0 page errors**. (Control Center visible in passes = platform-role account, conditional entry confirmed live.)

## O. Known limitations
UNRESOLVED: developer client-gating (no entitlement signal); sync-state indicator (no source); splash (1.8s) retained as-is. INFERRED: contrast of active-nav treatments (audit = Stage 13). DOM-level validation only (no vision) — visual art direction pending owner review.

## P. Stage 7 handoff
Stable shell contract (`WorkspaceShell` wraps any view; navigation model single-sourced in `navigation.ts`), view ids stable, screens ready for per-stage rebuild inside the shell (Stage 7 Customer/Workspace experience first), More-sheet pattern for secondary surfaces, account-menu pattern, offline pill to consume a future sync store, teal migration map (Stage 5 §R) for per-screen rebuilds.

## Q. Scope integrity
No Stage 7/8 workflow implementation · no page redesigns (all 12 screens unchanged) · no Order Wizard/Flow A/B · no intelligence work · no Phase 19/20/21 · no backend/database changes · no route migration (families preserved) · no unrelated refactors · protected assets zero-diff (`DesignStudio.tsx`, `patternEngine.ts`, `productionAssistant.ts` — verified) · `Layout.tsx` retained.
