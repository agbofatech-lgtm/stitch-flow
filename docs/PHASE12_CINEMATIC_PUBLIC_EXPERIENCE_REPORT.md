# Phase 12 — Cinematic Public Experience — Certification Report

Date: 2026-08-29 · Branch: `arena/01a047e2-stitch-flow` · Baseline: `phase-11-complete` (`ff6a162`)

## Executive summary

StitchFlow now opens with a cinematic, native-scroll public experience at `/`
for unauthenticated visitors — hero («Precision tailoring. Simplified.»), the
Measure → Design → Pattern → Produce → Manage sequential narrative with
hand-authored technical illustrations, and public login/register integration —
while every authenticated behavior, the frozen auth intelligence, and the
protected IP remain byte-identical. Built exclusively on Phase 11 tokens,
typography, motion and component primitives; zero new dependencies; zero
external network references; fully PWA-offline.

**Final certification: PASS-ENGINEERING-COMPLETE-EXTERNAL-GATES-PENDING**
(all engineering + browser gates pass in-sandbox with measured performance;
real-device/throttled-network validation remains an external gate).

## Git state & checkpoints

| Checkpoint | Commit | Tag pushed & remote-verified |
|---|---|---|
| Stage 1–2 public foundation | `b0b2ab9` | `phase-12-public-foundation` |
| Stage 3 scroll experience | `acd24bb` | `phase-12-scroll-experience` |
| Stage 4 auth integration | `fd3e4d8` | `phase-12-public-integration` |
| Stage 5–9 assets/perf/offline/responsive/a11y | `a0f41f8`, `300081c` | (intermediate) |
| Final | this commit | `phase-12-complete` |

Historical tags `phase-7/8/9/10/11-*` untouched (verified via `git ls-remote`).
No force-push, no history rewrite.

## Architecture

- `src/public/` — `LandingPage` (default export, `React.lazy`), `PublicHeader`,
  `PublicFooter`, `sections/{Hero,NarrativeIntro,WorkflowSection,FinalCTA}`,
  `components/{WorkflowProgress,StageIllustrations}`, `hooks/useInView`,
  `workflow.ts` (copy states only real capabilities).
- `src/shared/router.ts` — single predicate added (`isLandingPath`).
- `src/App.tsx` — gate extended: unauthenticated `/` renders the landing;
  authenticated `/` renders the app; guards/deep-links/nextPath untouched.
- `src/AuthenticatedApp.tsx` — entire authenticated tree lazy-loaded; entry
  chunk 1191 KB → 335 KB raw (login/register/forgot/reset also lazy).
- No React Router, no scroll/animation libraries, no new packages.
- Motion: Phase 11 system only (`sf-rise-enter`, `sf-logo-reveal`, token
  easings); reveals via one-shot IntersectionObserver; native scrolling.

## Visual design

Ivory/charcoal with gold accent (<10% surface area), display headings in the
existing Hanken Grotesk stack, technical monospace annotations, charcoal
narrative bands, gold connecting spine. Screenshots:
`sfv-evidence/p12-landing-desktop.png`, `p12-landing-mobile.png`,
`p12-resp-*.png`, `p12-offline-landing.png`.

## Auth integration

Frozen intelligence untouched (ids `#identifier/#password/#fullName/#regEmail/
#regPhone/#regPassword`, validation, errors, redirects, rate limiting all
regression-tested). Presentation context added: «StitchFlow home» back-link on
auth pages; login support line «Your craft, digitally refined…». Verified:
wrong password → inline error; correct → Dashboard; guard → intended-route
return (`/platform` round trip, E23/E24).

## Asset governance

`docs/PHASE12_ASSET_MANIFEST.md` — all assets local; WebP/PNG logo derivatives
(2–49 KB) generated from the unchanged original; original 1200×1200 PNG no
longer shipped to the public path; fonts local woff2 precached; illustrations
inline SVG.

## Performance (measured, methodology documented)

Tool: Chromium 149.0.7827.0 headless-shell via puppeteer-core; viewport
1280×900 (and 1440×900); `Network.setCacheDisabled=true` (cold); LAN-local
preview server; no CPU throttle; 2026-08-29.

| Metric | Result | Target |
|---|---|---|
| LCP | 192 ms | < 2500 ms |
| CLS | 0.000 | < 0.1 |
| Longtask total (TBT proxy) | 0 ms | < 300 ms |
| Entry chunk (raw) | 335 KB | split from 1191 KB |
| Request hosts (cold landing) | origin only | no CDN/fonts |

External gate pending: real laptop hardware + throttled 4G validation.

## Accessibility

One `h1`, strict H1→H2 hierarchy; landmarks header/nav×3/main/8 sections/
footer; skip-to-content first in tab order; 100% alt text; gold focus outline
`#C9A96E` verified computed; tap targets ≥44 px; `prefers-reduced-motion`
collapses all durations to ~0 while content stays visible; keyboard-only
traversal verified.

## Offline

Service worker activated; with network fully disabled both `/` and `/login`
render from precache; zero Google Fonts/CDN references at any point.

## Protected IP — zero diff

Blob-identical to `phase-11-complete`:
`DesignStudio.tsx 1e9fc9d7…`, `patternEngine.ts 777a0752…`,
`productionAssistant.ts 40266af6…` (paths under `modules/services/`).

## Regression battery (this turn)

- web `tsc --noEmit`: clean · backend `tsc --noEmit`: clean
- vitest: 7 files / 50 tests passed · jest: 25 suites / 317 tests passed
- vite build: ✓ 7.4–8.2 s · ESLint: exactly 16 pre-existing errors (0 new)
- Browser cert: 44/44 (E1–E43 mapping; evidence
  `sfv-evidence/p12-browser-run.json`)
- Secret scan: clean · working tree clean at commit time

## Laptop validation section

| Field | Value |
|---|---|
| Environment | E2B sandbox (Linux), preview served LAN-local at :4173 |
| Browser | Chromium 149.0.7827.0 (chrome-headless-shell, real engine) |
| Viewports | 1920×1080, 1440×900, 1024×768, 768×1024, 390×844, 375×812 |
| Result | zero overflow/clipping/offscreen at all six; interactions verified |
| Issues found & resolved | (1) login 429s during testing = intended rate limiter — harnesses adjusted, not the app; (2) entry chunk 1.2 MB → lazy-split; (3) <44 px tap targets → header CTAs size lg, footer padding |
| Outstanding | real-hardware + throttled-network pass (external gate) |
