# StitchFlow — Pre-Phase-18 Complete Product UI/UX & User-Journey Forensic Audit

**Date:** 2026-08-30 · **Audit baseline:** reconstructed Phase 17 integration (see §B) · **Mandate:** audit-first; Phase 18 NOT started; no broad repairs applied during this audit.

---

## A. Executive Verdict

**READY WITH REPAIRS — Phase 17 is implementation-complete but NOT integration-complete.** One confirmed runtime defect blocks a shipped Phase 17 surface (AI measurement review rejects the only profile-id format the product actually issues — `400 Invalid uuid`), one reported defect could not be reproduced in a clean environment after six interaction attempts (DesignStudio loop — suspects documented, needs laptop-state reproduction), and two reported defects did not occur with valid sessions and real ids (inspirations 401/500; measurement-profile 400 — both work end-to-end here). The public landing did **not** regress in code (zero diff since `phase-12-complete`; all assets 200; animations active) — the perceived "poorer" experience is that Phase 12 intentionally shipped a text/SVG-narrative landing whose only committed imagery is the logo. The Customer Portal remains a **backend foundation only** (separate auth audience, read-only login/profile/orders/appointments APIs; zero customer UI in web or mobile). Developer Control Center works for a correctly provisioned `users.role='platform_owner'` account; the laptop's "still missing" report is an environment/provisioning issue, not a code defect. **Phase 18 is NOT authorized** until the R3 repair lands and the R1 reproduction is confirmed or cleared on the laptop.

## B. Repository State

| Item | Value |
|---|---|
| Remote | `https://github.com/agbofatech-lgtm/stitch-flow.git` (verified) |
| Expected branch | `stitchflow-phase17-integration` @ `2410ff4` — **NOT present on the remote** (laptop-local only; verified via `git ls-remote` + object lookup) |
| Recovery (documented, not silent) | The described integration = `phase-17-complete` (`c5e127c` = `origin/arena/01a04e01-stitch-flow`, verified) **merged with** the Phase 13–16 reachability repair (`5d25530` = `origin/arena/01a04eef-stitch-flow`). Both parents exist remotely; the merge was reconstructed on the session branch as **`b372aee`** (identical content intent; merge-hash differs because hashes embed identity/time). Zero conflicts. |
| Working tree | Clean at audit time (after reconstruction) |
| Tags | `phase-17-complete` → `c5e127c` untouched; all phase tags intact; nothing moved, no force-push |
| Audit environment | Linux sandbox replica: Node v22.22.3, PostgreSQL 16 :5434 (dbs `stitchflow` + `stitchflow_test`, migrations 001–021 via official runner), backend :5000 (dev), web :5174 (dev) |

> ⚠️ For traceability, the laptop should push `stitchflow-phase17-integration` so `2410ff4` can be diffed against `b372aee`. Content is expected identical.

## C. Product Architecture Map (actual)

```
PUBLIC WEBSITE  /  (Phase 12 landing: hero, narrative, workflow, CTA) + /login /register /forgot-password /reset-password
        ↓ auth gate (access token in localStorage; JWT aud stitchflow-clients)
TAILOR/BUSINESS PLATFORM  (state-driven views; sidebar 11 items)
   Dashboard · Customers(→ Intelligence: Phase 13–16 + AI panels) · Orders · Production Board · Invoices
   · Design Studio · Materials · Reports · Developer (unconditional) · Control Center (platform-role hint) · Settings
CUSTOMER PORTAL  — backend only: POST /portal/login (aud stitchflow-portal) → GET /portal/me|/orders|/appointments|/session
        ✗ NO customer UI anywhere (web router has no /portal; apps/mobile is an empty stub; Capacitor wraps the same web app)
PLATFORM/DEVELOPER — /developer console (API keys, webhooks, deliveries, usage) + /platform Control Center (9 sections)
```

## D. Login Architecture (every pathway, verified live)

| Pathway | Exists | Works | Evidence |
|---|---|---|---|
| Public → Sign Up | ✅ `/register` → provisioning (license+workspace+trial) | ✅ | registered `admin2@example.com` (201) |
| Public → Login (email/phone identifier) | ✅ `/login` → POST /auth/login | ✅ | 200; JWT {sub,email,role,workspaceId} |
| Tailor → Business dashboard | ✅ same login; workspace from first membership | ✅ | sidebar + dashboard APIs 200 |
| Customer portal login | ✅ backend `POST /portal/login` (portal audience, 12h) | ✅ API (suite-covered) | **no UI** — see §H |
| Platform/Developer | ✅ role from `users.role` in JWT claim | ✅ for `platform_owner` | CC sections + `/platform/*` 200 |
| Logout | ✅ revokes refresh, clears both tokens | ✅ | keys gone, redirect `/login` |

Role model (re-verified in current code): platform roles are `users.role` values (`platform_owner|platform_admin|platform_support|platform_analyst` + legacy `admin`); `requirePlatformRole` reads the verified JWT claim; frontend `isPlatformRole(getAuthRole())` is a hint. **`platform_roles` table still does not exist anywhere** — any grant made through a hand-created table remains a no-op (carried finding from prior audit; unchanged).

## E. Navigation Audit (sidebar, measured live at 1366×768)

`Dashboard, Customers, Orders, Production Board, Invoices, Design Studio, Materials, Reports, Developer, Control Center(platform-role), Settings` — 11 items for platform_owner, 10 otherwise. **Below-fold items** (require nav scroll at 768px): Reports(y=676) borderline, Developer(y=738), Control Center(y=800), Settings(y=862). Intended locations: Measurements/Design/Pattern/Fabric-Production intelligence = inside **Customers → Intelligence** (contextual, correct); AI panels embedded in those sections + Design Studio; Developer console = `/developer`; CC = `/platform`.

## F. Public Landing Audit (visual regression forensics)

| Question | Finding | Evidence |
|---|---|---|
| Historical landing? | Phase 12 (`b0b2ab9`, `acd24bb`) created current public experience | `git log --follow` |
| Code regression since? | **NONE — zero diff** `phase-12-complete..HEAD` on `public/*`, `index.css`, motion | `git diff --stat` empty |
| Images removed? | **No deletions ever** — only 4 brand-logo files were ever committed (`--name-status` all `A`) | git history |
| Assets loading? | All 200 (logo 128/256 webp+png, 3 variable-font woff2); **0 broken images** | live network capture |
| Motion present? | Yes — 8 `sf-*` animated elements on load, 9 active after scroll; scroll narrative + in-view hooks | computed styles, live |
| Why "visually poorer"? | Phase 12's design is **typographic/SVG-narrative by construction** — no photography exists in the repo to lose; earlier "richer" impressions match the Phase-11-era in-app mock UI (mockData-driven screens), not the public landing | code + history |
| Verdict | **No regression confirmed.** Cinematic scope is minimal-but-intentional; any upgrade is new design work, not a repair | — |

## G. Tailor Platform Audit (runtime)

Login ✅ → Dashboard ✅ (`/dashboard/summary` 200) → Customers ✅ (API list) → **Intelligence ✅** (all four sections render; measurement-definitions ×5 garment families 200; profiles 200; design-specifications 200 + 201 write; inspirations 200) → Orders ✅ (API; empty fresh workspace) → Production Board ✅ (API-backed stages) → Invoices ✅ → Design Studio ✅ opens, renders, autosaves, no errors → Materials ✅ (local-first) → Reports/Settings ✅. Cascade dependencies verified (spec → pattern → production guidance messages).

## H. Customer Portal Audit

| Capability | Backend | UI | Runtime | Classification |
|---|---|---|---|---|
| Customer registration | ❌ (portal accounts provisioned by operators; `platformCustomerService`) | ❌ | — | PLANNED (operator-provisioned by design) |
| Customer login | ✅ `POST /portal/login` (audience-isolated) | ❌ | API ✅ | BACKEND FOUNDATION EXISTS — CUSTOMER EXPERIENCE NOT IMPLEMENTED |
| Profile/me | ✅ `GET /portal/me` (+consent) | ❌ | API ✅ | same |
| View orders | ✅ `GET /portal/orders` (own-customer scope) | ❌ | API ✅ | same |
| Appointments (view) | ✅ `GET /portal/appointments` | ❌ | API ✅ | same |
| Appointment booking | tailor-side `/appointments` APIs exist; no booking flow | ❌ | — | same |
| Payments / payment history | ❌ portal scope | ❌ | — | NOT IMPLEMENTED |
| Order progress tracking | implicit via orders | ❌ | — | same |
| Design interaction / notifications | ❌ | ❌ | — | NOT IMPLEMENTED |

Structural isolation re-verified: portal tokens (aud `stitchflow-portal`) are rejected by staff middleware and vice versa. `apps/mobile` is an empty package stub; Capacitor config wraps the same web app — **no mobile customer app exists**.

## I. Phase 13–16 Intelligence Matrix (on integration HEAD)

| Module | Code | Mounted | Reachable | API | Runtime | Notes |
|---|---|---|---|---|---|---|
| P13 profiles/definitions/validation/suggestions/history | ✅ | ✅ CustomerDetail | ✅ via Customers→Intelligence | ✅ 200s | ✅ | repair verified live |
| P14 inspiration | ✅ | ✅ | ✅ | ✅ 200 | ✅ (R2 not reproduced) | |
| P14 fabric profile | ✅ | ✅ | ✅ | ✅ 200 | ✅ | |
| P14 design specification | ✅ | ✅ | ✅ | ✅ 200/201 | ✅ | created via UI |
| P15 pattern pieces/validation/readiness | ✅ | ✅ | ✅ (after spec) | ✅ | ✅ | cascade message verified |
| P15 cutting layout/instructions/metrics | ✅ | ✅ | ✅ (after derivation) | ✅ | ✅ | |
| P16 fabric consumption/purchasing/workflow/QC/readiness | ✅ | ✅ | ✅ (after spec+pattern) | ✅ | ✅ | |
| Design Studio hand-off ("Load into Studio", spec adapter) | ✅ | ✅ | ✅ | ✅ | ✅ | protected IP untouched |

## J. Phase 17 AI Audit

- **Architecture intact:** `modules/ai/{gateway→providerRegistry→providers(Deterministic|Http),tailoringAdvisor,contextBuilders,deterministicPrecedence}`; `/ai` mounted behind staff auth + workspace; **no second gateway, no provider-contract duplication**; AI is advisory-only (deterministic validation stays authoritative — comment + behavior verified).
- **Runtime:** `GET /ai/status` → `{configured:false,enabled:false,provider:null,reason:'NO_PROVIDER'}`; design-review & explain return **degraded deterministic advisories with explanations, evidence, source:"deterministic", honest limitations** — graceful no-key behavior CONFIRMED.
- **AI UI reachable:** `MeasurementAIPanel` (guarded: renders only with a selected profile), `ProductionAIPanel`, `AIAdvisoryPanel` embedded in intelligence sections; never fires on mount.
- **CONFIRMED DEFECT (R3):** `POST /ai/measurement-review/:profileId` schema requires `z.string().uuid()` but Phase 13 profile ids are `mp-<uuid>` (and customer ids are epoch strings). Real UI path → **400 VALIDATION_ERROR "Invalid uuid"** (reproduced with the actual issued id `mp-0544be93-…`). Phase 17's own test (`P17-API6`) only sends `not-a-uuid` and dummy uuids — **the suite never exercises a real issued id**, so tests are green while the product path fails. Fabric/production review accept `min(1)` ids (no such bug).
- Optional external providers correctly inert (OPENAI/GEMINI/CLAUDE flags off; no keys).

## K. Developer Control Center Audit (chain, live)

| Layer | Expected | Actual (as `platform_owner`) | Pass/Fail |
|---|---|---|---|
| DB `users.role` | platform role | `platform_owner` (set via SQL; sanctioned UI path = CC→Operators `POST /platform/operators`) | PASS |
| Login mints JWT role | claim present | `role: platform_owner` in payload | PASS |
| Frontend role | `getAuthRole()` decodes | platform_owner | PASS |
| `isPlatformRole()` | true | true → Control Center nav item present | PASS |
| Route | `/platform` renders | all 9 sections | PASS |
| API authz | 200s | `/platform/overview`, `/platform/workspaces` 200 | PASS |
| Feature flags | developer+usage ON | verified ON in DB (this env) | PASS |

"Control Center still missing" on the laptop = the account's `users.role` there is not a platform role (or nav not scrolled). **Code chain fully healthy** — same operational conclusion as prior audit. Developer console verified working (keys/scopes/webhooks/deliveries/usage 200s).

## L. Runtime Defects (reproduced evidence only)

| ID | Report | Reproduction result | Root cause / classification |
|---|---|---|---|
| R1 | DesignStudio infinite update loop (~L1168) | **NOT REPRODUCED** in clean env across 6 paths: open; garment select; 12s idle autosave (timestamp stable, no churn); order-selected entry; "Refresh Draft + Production Plan"; AI-suggestion path. Zero console/page errors. L1168 is a pure function. Suspects (documented, unfixed): draft-restore effect (L1873: `setMeasurements` always returns a new object) ↔ autosave effect (L1905: `setLastDraftSavedAt` in timeout) can oscillate **if** a restore-effect dep becomes identity-unstable (`selectDesignInspiration`/legacy draft state, e.g. a draft saved by an older app version in persistent localStorage). Needs laptop-state repro (export `stitchflow:studio:*` + `stitchflow:studio:session` before any fix). Protected IP therefore untouched. | UNCONFIRMED — HIGH investigation |
| R2 | `GET /customers/:id/inspirations` 401 then 500 | **NOT REPRODUCED**: 200 `{inspirations:[]}` via API **and** in-UI with valid session + real customer id. Route correctly mounted (auth + workspace + mergeParams). 401 class = missing/expired token at request time (15-min access TTL; refresh-retry exists) — e.g. request fired while logged out/offline; 500 not observed. | UNREPRODUCED — environmental; add requestId correlation if it recurs on laptop |
| R3 | `POST /ai/measurement-review/:profileId` 400 | **CONFIRMED**: 400 `VALIDATION_ERROR "Invalid uuid"` with the real issued profile id (`mp-…`). Schema `z.string().uuid()` vs Phase 13 id format `mp-<uuid>`; test blind spot (P17-API6 uses `not-a-uuid`/dummy uuids only). | **CONFIRMED Phase 17 integration defect — blocks Phase 18** |
| R4 | `GET /customers/:id/measurement-profiles/:profileId` 400 | **NOT REPRODUCED**: 200 with real ids (`mp-…` / epoch customer id). Route order correct (`/compare` first); schema min(1) non-uuid; missing record → 404 distinct from 400. Likely caused on the laptop by a non-issued id (e.g. `undefined`/local draft id) — same *class* of frontend-supplied-id issue as R3. | UNREPRODUCED — needs laptop payload sample |

## M. Automated Tests (fresh, this audit — no historical substitution)

| Suite | Historical | Fresh result |
|---|---|---|
| Frontend (web, vitest) | 156/156 | **156/156 PASS** (12 files, incl. phase17-ai.test.tsx) |
| Backend phase17-ai-api + ai-intelligence | — | **65/65 PASS** |
| Backend phase8+10+13+14+15+16 (focused) | — | **213/213 PASS** |
| TypeScript web / backend | pass | **0 errors / 0 errors** |
| Production build (web) | pass | **PASS** (PWA precache 48 entries) |
| Backend full 467-test suite | 467 (22 timeouts) | not re-run (heavy; not gating UI exposure — focused suites cover all audited surfaces) |

## N. Protected IP

`git diff phase-15-complete -- DesignStudio.tsx patternEngine.ts productionAssistant.ts` → **ZERO DIFF** at integration HEAD (before and after audit; no repairs were applied to protected files during this audit). No surgical exception was needed: R1 is unconfirmed.

## O. Product Gap Matrix

| Feature | Intended | Code | UI | Reachable | Runtime | Status |
|---|---|---|---|---|---|---|
| Public landing + assets + motion | ✅ | ✅ | ✅ | ✅ | ✅ | WORKING (minimal-by-design; no regression) |
| Auth (identifier, recovery, register) | ✅ | ✅ | ✅ | ✅ | ✅ | WORKING |
| Tailor dashboard/customers/orders/production/invoices/materials | ✅ | ✅ | ✅ | ✅ | ✅ | WORKING |
| Phase 13–16 intelligence | ✅ | ✅ | ✅ | ✅ | ✅ | WORKING (post-repair, verified) |
| Design Studio | ✅ | ✅ | ✅ | ✅ | ✅ (R1 unconfirmed) | WORKING in clean env |
| AI design/fabric/production/explain advisories | ✅ | ✅ | ✅ | ✅ | ✅ degraded-deterministic | WORKING |
| AI measurement review | ✅ | ✅ | ✅ | ✅ | **❌ 400** | **BROKEN (R3)** |
| Developer console + Control Center | ✅ | ✅ | ✅ | ✅ (role) | ✅ | WORKING (ops provisioning required) |
| Customer portal UI (login/orders/appointments) | ✅ (vision) | backend ✅ | **❌** | ❌ | — | BACKEND FOUNDATION EXISTS — CX NOT IMPLEMENTED |
| Customer booking / payments / tracking UI | ✅ (vision) | partial | ❌ | ❌ | — | NOT IMPLEMENTED |
| Mobile app | ✅ (vision) | stub | ❌ | ❌ | — | NOT IMPLEMENTED |
| Platform roles via `platform_roles` table | — | **does not exist by design** | — | — | — | N/A (users.role is the mechanism) |

## P. Recommendations

| Priority | Item |
|---|---|
| **CRITICAL (blocks Phase 18)** | R3: relax `/ai/measurement-review/:profileId` schema from `uuid()` to the issued-id contract (e.g. `min(1)` + regex `^mp-…$` or shared id validator), add a regression test using an **issued** `mp-…` id; keep 400 for malformed, 404 for unknown. |
| **HIGH** | R1: laptop-side reproduction with the user's real localStorage (`stitchflow:studio:*`) before any surgical stabilization (candidate: bail-out in draft-restore effect when measurements unchanged). No code change until reproduced. |
| **HIGH (ops)** | Laptop: set `users.role='platform_owner'` for the test account (or CC→Operators grant), keep developer+usage flags ON, and scroll/heighten the sidebar — then re-verify Control Center. |
| **MEDIUM** | R2/R4: capture exact request payloads + requestIds from the laptop if they recur; consider adding the issued-id validator to all `:profileId`/`:customerId` routes for uniform 400/404 semantics. |
| **MEDIUM** | Push `stitchflow-phase17-integration` to remote so `2410ff4` is auditable/diffable. |
| **LOW** | Landing visual upgrade (photography/imagery) is new design work, explicitly not a repair; sidebar IA (fold) could be revisited in a UX pass. |
| **PLANNED** | Customer portal UI, booking flow, customer payments/tracking, mobile app — intentionally not yet implemented; must not be claimed as complete. |

## Phase-17 acceptance checklist (current state)

Repository ✅ (clean, tags intact) · Protected IP ✅ (zero diff) · Public ✅ loads/assets/motion verified, no regression · Tailor ✅ login→intelligence · Design Studio ✅ no loop reproduced (unconfirmed on laptop) · P13–16 ✅ · AI ⚠️ reachable, advisory, graceful — **measurement-review broken (R3)** · Developer/CC ✅ (ops provisioning) · Customer ✅ accurately classified (backend-only) · Validation ✅ fresh suites/tsc/build — **`phase-17-integration-validated` must NOT be created until R3 is fixed and re-verified (plus laptop confirmation of R1/CC).**

**Phase 18: NOT AUTHORIZED at this time.**
