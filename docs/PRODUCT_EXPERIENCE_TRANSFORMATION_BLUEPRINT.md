# StitchFlow — Product Experience Transformation Blueprint
## Stage 0 (Product/UI Forensics) + Stage 1 (Information Architecture)

**Program:** Product Experience Transformation (post-Phase-17 certified baseline `ef6465f`, tag `phase-17-integration-validated`)
**Status of this document:** BLUEPRINT FOR APPROVAL — **no UI code has been changed.** Implementation (Stages 2–14) begins only after owner sign-off.
**Core principle:** *Complexity belongs inside the system. Simplicity belongs in the user's hands.* The user understands **Customer → Order → Design → Make → Deliver**; engineering-phase names never appear as navigation concepts.

---

# PART 1 — STAGE 0 FORENSICS (current state, evidence-based)

## 1.1 Experience inventory — what actually exists today

| Surface | Exists | Implementation | Discoverability today |
|---|---|---|---|
| Public landing | ✅ | `src/public/*` (Phase 12), typographic/SVG, logo-only imagery | `/` when signed out |
| Auth pages | ✅ | Login/Register/Forgot/Reset | public routes |
| Workspace app | ✅ | `AuthenticatedApp` + `Layout.tsx` (one shell) | sidebar, 11 items |
| Developer console | ✅ | `DeveloperDashboard.tsx` (`/developer`) | **unconditional sidebar entry** (all roles see it) |
| Platform Control Center | ✅ | `platform/ControlCenter.tsx` (`/platform`) | sidebar entry gated by platform-role hint; **below fold** at 768 px |
| Customer portal | ❌ UI (backend only, separate audience) | `/portal/*` APIs | none |

**Finding A1 — single-shell problem:** all three audiences share one sidebar; separation today is conditional list items, not separate application shells. `Developer` is visible to every signed-in user (its APIs are flag-gated, but the nav concept leaks platform infrastructure to tailors).

## 1.2 Current navigation (measured live, 1366×768)

`Dashboard · Customers · Orders · Production Board · Invoices · Design Studio · Materials · Reports · Developer · Control Center (platform-role only) · Settings`
— Reports/Developer/Control Center/Settings sit **below the fold** in the scrollable nav (y=676…862).

**Finding A2 — demo affordances shipped in production UI:** the account dropdown exposes **Switch Role** (owner/assistant — a client-side simulation, no backend effect) and **Simulate Tier** (BASIC/PRO/STUDIO). These are Phase-1/3-era demo controls that undermine the professional role model and must move to a developer-only debug surface in the transformation.

**Finding A3 — URL model:** only three in-app route families exist (`/developer`, `/platform`, everything else = `/`). Business views are state-driven (`AppContext.currentView`) — no deep links, no per-customer/per-order URLs. The transformation's route map (Part 2) must introduce real URLs without breaking the offline-first store.

## 1.3 Real role architecture (verified in code — the blueprint builds on it, invents nothing)

| Layer | Mechanism | Enforcement |
|---|---|---|
| Platform roles | `users.role` ∈ `platform_owner\|platform_admin\|platform_support\|platform_analyst` (+ legacy `admin`) → JWT claim | `requirePlatformRole` on every `/platform/*` route (server-authoritative) |
| Workspace roles | `workspace_users.role` ∈ `owner\|admin\|assistant` | `requireWorkspace` → `requireWorkspaceRole` on business routes |
| Developer surfaces | staff JWT + workspace + `DEVELOPER_API`/`WEBHOOK_MANAGEMENT` flags | `requireFeatureFlag` + auth (fail-closed) |
| Frontend | `getAuthRole()`/`isPlatformRole()` = **UX hint only** | every privileged call re-authorized server-side |

**Business Admin ≠ Platform Admin is already structurally enforced** (workspace roles grant zero platform privileges). Preserved unchanged. **Gap:** the frontend currently renders zero role-differentiated navigation — owner, assistant and (simulated) staff see identical menus.

## 1.4 Screen-by-screen inventory & data-source split (critical for the workflow layer)

| Screen | Data source | Notes |
|---|---|---|
| Dashboard | **API** (`/dashboard/summary`, payments-analytics) | stats-first, not operational |
| Customers | **API** (`/customers`) → card grid → `CustomerOrdersModal`; **Intelligence** action (Phase 13–16 hub, repaired & certified) | two detail surfaces coexist (modal vs `CustomerDetail`) — duplication to resolve in Stage 8 |
| Orders | **offline store** (AppContext) + OrderForm (844 lines, readiness checks for measurements/design/fabric already implemented) | API-created orders invisible here (documented certified-baseline observation) |
| Production Board | **API** (orders + stage transitions) | kanban lifecycle |
| Invoices | **API** | payments recorded via API |
| Design Studio | protected IP; offline draft persistence | reachable from Intelligence ("Load into Studio") |
| Materials | **offline store** | |
| Reports | **offline store** | |
| Settings | API (AccountPanel: auth/sync/entitlements) | |

**Finding A4 — the split-brain store:** some screens read the live API, others the offline-first store. The transformation's workflow layer (Stage 8) must treat this as a first-class constraint: order-wizard steps consuming Phase 13–16 APIs already do (Intelligence hub proved the pattern); Orders/Materials/Reports remain store-driven until a separate sync-unification decision.

## 1.5 Dead / duplicate / transitional UI inventory

- **9 `.bak` files** in `src` (App, DesignStudio ×2, Invoices, Settings, jobSheetExport ×3, invoicePdf) + `sfv-evidence/` screenshots committed at repo root → cleanup candidate (repo hygiene, no behavior change).
- **Transitional:** `Customers → Intelligence` entry (the certified Phase 13–16 reachability repair). Per direction §9 it is preserved **until** the Order-wizard + Customer-tabs replacements are live, then retired.
- **Modal duality:** `CustomerOrdersModal` vs `CustomerDetail` (the intelligence hub) — Stage 8 merges into one customer workspace.

## 1.6 Visual asset & motion inventory

- **Assets: 9 public files total** — 4 logo variants (128/256, png+webp), 3 PWA icons, manifest, `.gitkeep`. **Zero photography, zero garment imagery, zero fabric imagery, zero illustrations, text-only empty states.** (Confirms the "visually poorer" perception: there is nothing to lose and everything to build — an acquisition gap, not a regression.)
- **Motion:** CSS token system (`sf-*` keyframes/transitions), no animation library; `prefers-reduced-motion` honored globally in `index.css` + `SplashScreen`. Good foundation for purposeful motion.
- **Mobile:** off-canvas drawer behind a hamburger at `<lg`; **no bottom navigation**; evidence screenshots exist in `sfv-evidence/`.

## 1.7 Where the intelligence lives today (input to Stage 9 mapping)

All Phase 13–17 surfaces are reachable and runtime-healthy (certified): Measurement/Design/Pattern/Fabric-Production intelligence inside `CustomerDetail`; AI panels embedded contextually (measurement review, design/fabric/production reviews, explain); Design Studio deep-links from profiles and specs. **Nothing needs re-implementing — everything needs re-positioning.**

---

# PART 2 — STAGE 1 TARGET INFORMATION ARCHITECTURE (proposed)

## 2.1 Three applications, separate shells (one deployment)

```
STITCHFLOW
  ├── PUBLIC (PublicLayout)          /            landing · story · signup
  ├── AUTH (AuthLayout)              /login /register /recover
  ├── WORKSPACE (WorkspaceLayout)    /app/*       tailors · staff · owners
  ├── DEVELOPER (DeveloperLayout)    /developer/* explicitly entitled staff
  └── PLATFORM (PlatformLayout)      /platform/*  platform roles only
```

Guards: **frontend route guard + backend authorization + tenant isolation** (all already exist server-side; shells only stop rendering privileged chrome — they never substitute for the 403s that remain the boundary).

## 2.2 Workspace navigation (7 destinations + settings)

```
STITCHFLOW
Overview · Customers · Orders · Production · Materials · Finance · Reports
────────
Settings
```
Mapping from today: Dashboard→**Overview** (operational, "what should I do today"), Production Board→**Production**, Invoices(+Payments)→**Finance**, Design Studio leaves the sidebar (entered from Order step 3 / customer Designs tab — protected IP untouched, only entry points change), Developer/Control Center leave the sidebar (§2.3/§2.4).

## 2.3 Developer Console (separate shell, no workspace presence)

`Overview · API Keys · Webhooks · API Activity · Usage · Documentation · ← Return to Workspace`
Access: staff JWT + workspace + `DEVELOPER_API` flag (backend unchanged); nav entry rendered **only** for entitled users; guessed URLs still 403/flag-gated. Workspace users: no entry, no account-menu item, no hint.

## 2.4 Platform Control Center (separate shell, account-menu access)

`Platform Overview · Workspaces · Operators · Feature Flags · Usage & Limits · System Health · Governance · Configuration · ← Workspace`
Access: `platform_owner` (+ explicitly authorized platform roles) — **unchanged** `requirePlatformRole` enforcement; the workspace sidebar never shows it; discovery via the account menu (per direction §16). Non-platform users never see it rendered; `/platform/*` remains 403.

## 2.5 Role access matrix (navigation × role)

| Destination | assistant (staff) | tailor/user | workspace admin | business owner | developer-entitled staff | platform_owner |
|---|---|---|---|---|---|---|
| Overview | ✅ | ✅ | ✅ | ✅ | ✅ (workspace) | ✅ (workspace) |
| Customers | ✅ | ✅ | ✅ | ✅ | — | ✅ (workspace) |
| Orders | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| Production | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| Materials / Finance / Reports | own-work ✅ (finance: role-gated by `requireWorkspaceRole` — exact split = **Decision D3**) | ✅ | ✅ | ✅ | — | ✅ |
| Settings | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| Developer Console | ❌ no UI | ❌ | ❌ | ❌ | ✅ via shell | ❌ (unless also entitled) |
| Platform Control Center | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ via account menu |
| Team management (owner) | ❌ | ❌ | ✅ | ✅ | — | ✅ (workspace team) |

(Workspace roles map: business owner→`owner`, manager/workspace admin→`admin`, tailor/staff→`assistant`. **No new roles are invented**; enforcement uses existing `requireWorkspaceRole`.)

## 2.6 Route map (proposed URLs + redirects)

| New route | Shell | Maps from |
|---|---|---|
| `/` | Public (signed out) / redirect `/app` (signed in) | unchanged |
| `/app` `/app/customers` `/app/customers/:id` `/app/orders` `/app/orders/:id` `/app/orders/new` `/app/production` `/app/materials` `/app/finance` `/app/reports` `/app/settings` | Workspace | current state-driven views |
| `/developer/*` | Developer | existing family (kept) |
| `/platform/*` | Platform | existing family (kept) |
| Legacy `/login` etc. | Auth | unchanged |

Old deep links (`/developer`, `/platform`) keep working; view-state navigation gains URLs incrementally (no breaking change to the offline store).

## 2.7 The tailor workflow (Stage 8/9 target) — where every phase lands

```
CUSTOMER → CREATE ORDER → MEASUREMENTS → DESIGN → FABRIC → REVIEW → START PRODUCTION → QC → PAYMENT → DELIVERY
```

| Workflow step | Surface | Powered by (invisible) |
|---|---|---|
| Take/choose measurements | Order step 2: profile picker or guided capture + "AI Review" chip | **Phase 13** measurement intelligence (definitions/validation/versioning) + **Phase 17** measurement advisory |
| Choose design | Order step 3: garment categories → popular styles → customize (collar/sleeve/fit/length) + ✨ suggestion chip | **Phase 14** design specification/inspiration/fabric profile + **Phase 17** design advisory + Design Studio hand-off for advanced users |
| Pattern preparation | Order step 4: readiness checklist + `[Generate Cutting Plan]` + progressive-disclosure "View Pattern Details" | **Phase 15** pattern derivation/pieces/layout/instructions |
| Materials required | Order step 5: recommended yardage per fabric, waste estimate, `[Confirm Materials]` | **Phase 16** fabric consumption/purchasing + **Phase 17** fabric advisory |
| Make / QC / deliver | Production lifecycle board + order tracking | **Phase 16** workflow/QC/readiness |
| Customer hub | Customer workspace tabs: Overview · Orders · Measurements · Designs · Production · Payments · Activity | all of the above, contextual |

**Transition rule (direction §9):** the certified `Customers → Intelligence` entry stays live until the Order wizard + customer tabs are verified, then is retired in the same release that replaces it.

## 2.8 Mobile (first-class)

Bottom navigation, 5 destinations max: `Home · Customers · Orders · Production · More` (More = Materials/Finance/Reports/Settings per authorization). Existing off-canvas drawer retired on mobile; shells shared, chrome adaptive.

## 2.9 Visual system & asset pipeline (Stages 3–4 spec basis)

- Asset library `apps/web/public/assets/{brand,landing,garments,fabrics,production,illustrations,empty-states}` with AVIF+WebP, responsive sizes, lazy loading; **`docs/VISUAL_ASSET_MANIFEST.md`** (filename · source · license basis · where used · format) — no remote hotlinking, no placeholder-fake completion.
- Motion principles: purposeful (hero reveal, card entry, fabric parallax, scroll-driven production timeline), `prefers-reduced-motion` respected (already global), fast first paint, no interaction delay, mobile GPU discipline.
- Landing (Stage 11): cinematic hero + 4 visual story sections (measure→design→fabric→deliver), replacing gradient-only narrative.

## 2.10 Protected & preserved (hard guardrails)

- **Protected IP untouched:** `DesignStudio.tsx`, `patternEngine.ts`, `productionAssistant.ts` (ZERO DIFF maintained; entry-point changes only).
- **Preserved:** all Phase 13–17 domain/API contracts, AI gateway/provider registry (advisory-only, deterministic authority), tenant isolation, auth, offline-first store + sync, migrations.
- **Allowed to change:** layouts/navigation/page composition/cards/typography/spacing/color/responsive/empty states/entry points/wizard flows/progressive disclosure/asset library/motion tokens/component organization.

## 2.11 Stage roadmap (gated)

| Stage | Deliverable | Gate |
|---|---|---|
| 2 | Workflow architecture spec (Flows A–D signed off) | owner approval |
| 3 | Visual direction spec (tokens/type/color/photo/illustration/motion) | owner approval |
| 4 | Asset acquisition + manifest (licensed, optimized, mapped) | manifest review — no fake completion |
| 5 | Design system primitives (incl. Workflow Stepper, Empty State, Mobile Bottom Nav) | storybook-style review |
| 6 | **Shell separation** (Workspace/Developer/Platform/Public/Auth layouts; Control Center & Developer leave sidebar; account-menu access; demo Switch-Role/Tier controls removed or hidden behind dev flag) | role-matrix journey tests |
| 7 | Overview dashboard (Today's Priorities / Active Orders / Quick Actions) | browser certification |
| 8 | Customer workspace + Order wizard (heart; retires Intelligence entry only after parity) | Journey A–B certification |
| 9 | Intelligence contextualization (§2.7 mapping) | per-step API verification |
| 10 | Production lifecycle visual workflow | browser certification |
| 11 | Public landing (cinematic, image-rich) | asset manifest + perf budget |
| 12 | Mobile experience (bottom nav, responsive wizard) | mobile journeys |
| 13 | Accessibility & performance (keyboard/contrast/SR/reduced-motion/low-bandwidth) | audit pass |
| 14 | Full browser certification (all roles × all shells × all flows) | **transformation certification** |

## 2.12 Definition of success (testable, per direction §21)

New tailor unaided: create customer → create order → measurements (with AI review chip) → visual design selection → see required fabric → start production → track → deliver. Platform owner: workspace → account menu → Control Center → back, never polluting the tailor UI. Normal user: cannot discover Platform/Developer exist (UI absent; direct URL/API → 403).

## 2.13 OPEN DECISIONS requiring owner approval before Stage 2

- **D1** Finance scope: merge Invoices+Payments into one Finance destination (proposed) vs keep separate?
- **D2** Design Studio sidebar removal: enter only via Order step 3 / customer Designs tab (proposed) — confirm.
- **D3** Role-gating granularity inside Finance/Reports for `assistant` (e.g., payments write = `admin`+ via existing `requireWorkspaceRole`)?
- **D4** Developer entitlement model: keep "staff + DEVELOPER_API flag" (proposed) vs add explicit per-workspace developer grant?
- **D5** Workspace base path `/app/*` (proposed) vs root paths with layout guards?
- **D6** Orders screen data source: remain offline-store (proposed for now; wizard writes via API like Intelligence does) vs prioritize store/API unification?
- **D7** Asset budget: licensed photography purchase vs AI-generated brand imagery vs mixed (affects Stage 4 licensing basis)?
- **D8** Retirement timing of `Customers → Intelligence` entry (proposed: same release as Stage 8 parity).

---
**This blueprint changes no code. Stages 2+ begin only on approval of this document and decisions D1–D8.**
