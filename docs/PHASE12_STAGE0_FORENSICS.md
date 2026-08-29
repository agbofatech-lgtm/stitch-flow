# Phase 12 — Stage 0 Forensics

**Date:** 2026-08-29
**Certified baseline:** `phase-11-complete` = `ff6a1621c55b53f4958810a14981ce369416dc61` on `arena/01a047e2-stitch-flow`.

## 1. Git reconciliation incident (resolved before implementation)
The sandbox snapshot had **rewound the local repository**: HEAD sat on a grafted
`b576c3e` "Initial Stitch Flow project" (== origin/main) with 360 stale
working-tree entries (intermediate-era migrations, Phase 9 `.env.example` as an
uncommitted change, nested `migrations/migrations/`), and `node_modules`,
`sfv-tools/`, the dev DB and servers were gone. Remote was authoritative:
`refs/heads/arena/01a047e2-stitch-flow` = `ff6a162`, all certification tags
intact. Per §5 the session **stopped and reconciled**: `git fetch origin
arena/01a047e2-stitch-flow` + `git reset --hard FETCH_HEAD` → HEAD `ff6a162`,
working tree clean, zero untracked garbage. No legitimate work existed only in
the corrupted snapshot (every Phase 3–11 artifact lives in remote commits/tags).
Environment then rebuilt: root + workspace `npm install`; `sfv-tools`
recreated (puppeteer-core + Chromium 149 headless shell extracted from
`@sparticuz/chromium` via Node brotli + `al/lib`); persistent embedded
PostgreSQL on :5555 (`stitchflow_dev`, migrations 001–017 applied); backend on
:5000; preview server on :4173; users seeded via the real register endpoint
(owner-a/owner-b/operator, operator granted `platform_owner` in the dev DB).
End-to-end smoke (real Chromium login → Dashboard) PASS.

## 2. Protected IP (post-reconciliation)
`git diff phase-11-complete --` DesignStudio.tsx / patternEngine.ts /
productionAssistant.ts = **0 lines**. Re-verified after every stage.

## 3. Routing audit (current, pre-Phase-12)
- `shared/router.ts`: `currentPath`, `navigate` (History API + popstate),
  predicates: `isLoginPath`, `isRegisterPath`, `isForgotPasswordPath`,
  `isResetPasswordPath`, `isPublicAuthPath`, `isDeveloperPath`, `isPlatformPath`.
- `App.tsx` gate: public auth paths render without session; **unauthenticated
  `/` currently redirects to `/login`** (setNextPath preserved); authenticated
  users on public auth paths redirect to `/`; authenticated `/` = app shell.
- Phase 12 delta (Stage 1): unauthenticated `/` must render the **Landing
  Experience** instead of redirecting; every other guard behavior unchanged.
  Authenticated `/` keeps rendering the app (landing is a public-entry
  experience, not an authenticated view).

## 4. Public/auth shell audit
`auth/AuthPage.tsx` (Phase 11 token styling) shared by Login/Register/Forgot/
Reset; ids `#identifier #password #login-error #fullName #regEmail #regPhone
#regPassword` are test-critical and frozen. Phase 12 may add a public
navigation context (back-to-landing) around the shell — presentation only.

## 5. Phase 11 component inventory (P0 reuse)
`components/ui/`: Button, Field/Input/Select/Textarea, Card/Surface/MetricCard,
Badge/StatusBadge, Loading/Skeleton/ErrorState/EmptyState, Modal,
ToastProvider/useToast; `components/ui/motion.tsx`: PageTransition/Fade/Rise/
Stagger; tokens + keyframes in `src/index.css` (sf-* classes, reduced-motion
global). Public experience reuses all of these; no parallel system.

## 6. Asset inventory (local, approved)
`src/shared/assets/`: stitchflow-logo.png (approved mark), dark logo, logo1,
favicons 16–64, agbofa-logo.png, soft SVG set: scissors / needle /
measuring-tape / sewing-machine / tailoring / symbol. Phase 12 reuses logo +
soft SVGs as workflow illustrations and adds hand-authored SVG technical
illustrations (measure lines, pattern grid, production timeline) + at most a
couple of generated local WebP textures — all bundled/precached, no CDN.

## 7. Baseline gates (recorded post-reconciliation)
- Backend: tsc clean; `jest --runInBand` **25/25 suites, 317/317 tests**.
- Web: tsc clean; vitest **7 files / 50 tests**; `vite build` 7.48s.
- ESLint full-src: **16 pre-existing errors** (11 protected DesignStudio.tsx,
  5 legacy jobSheetExport.ts) — gate = zero new.
- Offline: PWA precache + local fonts (Phase 11); landing must join the
  precache (vite glob already covers js/css/html/png/svg/ico/woff2/woff;
  webp to be added).

## 8. Checkpoint plan
`phase-12-public-foundation` → `phase-12-scroll-experience` →
`phase-12-public-integration` → `phase-12-complete`; each committed, tagged,
pushed, remotely verified; historical tags untouched.
