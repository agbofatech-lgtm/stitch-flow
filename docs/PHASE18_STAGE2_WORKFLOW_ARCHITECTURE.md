# Phase 18 — Stage 2: Workflow Architecture
**Program:** PHASE 18 — PRODUCT EXPERIENCE TRANSFORMATION (per roadmap amendment; stages 0–14 execute inside Phase 18)
**Baseline:** certified `phase-17-integration-validated` (`ef6465f`) + approved Stage 1 blueprint (`d4b1802`)
**Status:** SPECIFICATION FOR APPROVAL — **no UI implementation in this stage** (stop rule honored). Phases 19–21 are architectural context only: **no 3D, no billing/subscription, no customer-portal code, no speculative infrastructure for them.**

---

## 0. Decisions adopted for this stage

Per the amendment's reference to approved D1–D8, the Stage 1 **proposed defaults are adopted**: D1 Finance merged · D2 Design Studio entered contextually (no sidebar) · D3 assistant = own-work scope, finance writes gated by `requireWorkspaceRole('owner','admin')` · D4 developer = staff + `DEVELOPER_API` flag · D5 workspace base path `/app/*` · D6 Orders stays offline-store for now (wizard writes via API, Intelligence-hub pattern) · D7 asset strategy = mixed licensed + AI-generated, decided per-category at Stage 4 · D8 `Intelligence` entry retired in the same release as Stage 8 parity. New decisions surfaced by this stage: **D9–D14 (§9)**.

---

## 1. Canonical data boundary map (the contracts every flow consumes)

Phase 18 flows are **consumers, never owners**, of these contracts. Phase 19 (3D) and Phase 21 (Customer App) will consume the same ones — this map is the extension boundary (prepare boundaries, build nothing speculative).

| Contract | Owning phase | Canonical API | Id format |
|---|---|---|---|
| Customer | core | `POST/GET /customers` | epoch string |
| Measurement profile (versioned, validated) | 13 | `/customers/:id/measurement-profiles` (+`/:pid`, `/validate`, `/activate`, `/compare`) | `mp-<uuid>` (canonical regex enforced) |
| Measurement definitions | 13 | `/measurement-definitions?garmentType=…` | codes |
| Inspiration reference | 14 | `/customers/:id/inspirations` | uuid |
| Fabric profile | 14 | `/fabric-profiles` | uuid |
| Design specification | 14 | `/customers/:id/design-specifications` (+`/:id`) | `ds-<uuid>` |
| Pattern model / pieces / validation | 15 | `/customers/:id/pattern-models` | `pm-…` |
| Cutting layout / instructions / metrics | 15 | `/customers/:id/cutting-layouts` | uuid |
| Production plan / operations / QC / readiness / consumption / purchasing | 16 | `/production-plans` (+`/:id/operations`, QC transitions, readiness) | plan ids |
| Order + production stages | core/16 | `/orders`, `POST /orders/:id/production-stages/:stageCode/transition` | epoch string; stage codes below |
| Invoice / payment | core | `/invoices`, `/payments` | uuid |
| AI advisories (advisory-only, gateway) | 17 | `/ai/measurement-review/:pid`, `/ai/design-review`, `/ai/fabric-review/:planId`, `/ai/production-review/:planId`, `/ai/explain`, `/ai/status` | — |
| Design Studio artifacts (protected IP) | 1–15 | offline drafts/pattern library | **untouched; entry points only** |

**Canonical order lifecycle (already the DB contract — the workflow's spine):**
`measurement → cutting → sewing → embroidery → first_fitting → second_fitting → final_press → ready → delivered` (+ `draft/in_progress/ready/cancelled` order statuses). The Stage 10 production UI renders this lifecycle; it invents no states.

**Authorization invariant (Phase 20 forward-compatibility):** workspace *role* (`owner|admin|assistant`) answers "may this person act?" — it never encodes plan/tier. Commercial entitlement remains a separate future dimension; Phase 18 introduces zero plan-name checks into navigation or workflow logic (removing the last client-side tier-simulation affordances from prod UI per Stage 6).

---

## 2. FLOW A — New Customer → New Order → Measurements → Design → Fabric → Confirm

**Route:** `/app/customers/new` → `/app/orders/new?customer=:id` (5-step wizard, resumable draft per order)

| Step | User experience | Hidden capability (invisible) | Contracts consumed | Guards |
|---|---|---|---|---|
| A0 Customer | name/phone/email minimal form (phone-first, Ghana-aware) | provisioning, dedupe | `POST /customers` | workspace member |
| A1 Order intent | garment category picker (Dresses/Shirts/Suits/Traditional/Jackets/…) + due date + notes | — | category taxonomy from design contracts | — |
| A2 Measurements | `[Select existing profile]` or `[Take new measurements]`; guided fields per garment type; ✓ "Measurements complete"; **💡 AI Review chip** (one tap, advisory-only, deterministic authority always shown first) | **Phase 13** definitions/validation/versioning/suggestions; **Phase 17** measurement advisory | measurement-profiles + definitions + `/ai/measurement-review/:pid` | profile must belong to this customer+workspace (server-enforced 404) |
| A3 Design | Popular-styles gallery (garment imagery — Stage 4 assets) → Customize (collar/sleeve/fit/length selects fed by **canonical** option sets) → optional inspiration photo attach; **✨ suggestion chip**; "Advanced: open Design Studio" progressive disclosure | **Phase 14** design specification + inspiration + measurement adapter; **Phase 17** design advisory; Design Studio hand-off (protected IP, unchanged) | design-specifications, inspirations, `/ai/design-review` | — |
| A4 Fabric | fabric picker (profile library + new fabric profile); live yardage card "Main fabric ≈ 4.5 yd · Lining ≈ 2.0 yd · est. waste 8%"; `[Confirm Materials]` | **Phase 16** fabric consumption engine; fabric profile contracts; **Phase 17** fabric advisory (on generated plan) | fabric-profiles, production-plans, `/ai/fabric-review/:planId` | — |
| A5 Review & confirm | one-screen summary (customer · measurements ✓ · design ✓ · materials ✓ · price) → `[Start Production]` → writes order + design spec linkage + first stage | readiness rules (OrderForm's existing checks, generalized) | `POST /orders`, order↔spec↔profile linkage fields | role for price/discount edits (`owner|admin`) |

**Edge states:** resume draft (offline-first store) · validation failures surfaced as guidance, never engine jargon · AI unavailable → chip shows deterministic-only notice, never blocks · offline → full wizard works locally, sync on reconnect (store contracts unchanged).

**Retirement rule (D8):** the certified `Customers → Intelligence` entry remains live until A2–A4 parity is browser-certified; removed in the same release.

## 3. FLOW B — Order → Make → QC → Payment → Delivery

**Route:** `/app/production` (lifecycle board) + `/app/orders/:id` (order workspace)

`Order (in_progress) → Pattern Preparation → Cutting → Sewing (+embroidery, fittings as configured) → Final press → QC → Ready → Payment → Delivered`

- **Pattern Preparation card:** checklist "✓ Measurements validated ✓ Design specification ready" → `[Generate Cutting Plan]`; **"View Pattern Details"** progressive disclosure (pieces/layout/instructions on demand). Hidden: **Phase 15** derivation + validation; **Phase 17** explain for plain-language pattern rationale.
- **Stage progression:** stage transitions via the canonical transition API (one tap per stage; notes + events); Production board = columns of the canonical lifecycle, filtered to Today's Priorities.
- **QC gate:** Phase 16 quality checkpoints (pass/fail + notes) required before `ready`; **💡 production advisory chip** available at cutting/sewing (e.g., directional-fabric hint).
- **Payment:** invoice generation + payment recording (Finance contracts); outstanding balance surfaces on the order card and customer hub.
- **Delivery:** `delivered` transition closes the loop; order card shows full timeline (stage events = audit trail already recorded).
- Guards: transitions role-checked (`assistant` may advance own-work stages; financial steps `owner|admin`); every write workspace-scoped (existing isolation).

## 4. FLOW C — Platform Owner → Control Center

Account menu (`/app` shell) → **Platform Control** → `/platform` (PlatformLayout). Sections per Stage 1 §2.4 (Overview · Workspaces · Operators · Feature Flags · Usage & Limits · System Health · Governance · Configuration) → **← Workspace** returns. Normal users: no menu item, no route access (server 403 unchanged), no discoverability. Business admin ≠ platform admin preserved (workspace roles never grant platform privileges).

## 5. FLOW D — Developer → Developer Console

Entitled staff (workspace + `DEVELOPER_API` flag) → account menu **Developer Console** → `/developer` (DeveloperLayout): Overview · API Keys · Webhooks · API Activity · Usage · Documentation · ← Return to Workspace. No sidebar presence in Workspace; flagged-off → console shows the honest feature-flag notice (existing behavior); all endpoints remain flag+auth gated (fail closed).

## 6. Supporting flows

- **Sign-in → shell routing:** `/login` → token → role/entitlement resolution → `/app` (workspace) with account-menu-only access to C/D surfaces.
- **Customer workspace (Stage 8 surface):** `/app/customers/:id` tabs Overview · Orders · Measurements · Designs · Production · Payments · Activity — one merged surface replacing `CustomerOrdersModal`/`CustomerDetail` duality; intelligence powers tabs invisibly (today's Intelligence hub becomes the Measurements+Designs tabs' engine).
- **Mobile:** Flows A/B adapt to stepper + bottom nav (5 destinations); C/D surfaces desktop-first, reachable via account sheet on mobile for entitled users.

## 7. Flow × role matrix

| Flow | assistant | workspace admin | owner | developer-entitled | platform_owner |
|---|---|---|---|---|---|
| A (create customer/order/measure/design/fabric) | ✅ | ✅ | ✅ | workspace only | ✅ |
| A5 price/discount edits | ❌ | ✅ | ✅ | — | ✅ |
| B stage transitions | ✅ own work | ✅ | ✅ | — | ✅ |
| B payment/invoice steps | ❌ | ✅ | ✅ | — | ✅ |
| C Control Center | ❌ | ❌ | ❌ | ❌ | ✅ |
| D Developer Console | ❌ | ❌ | ❌ | ✅ | only if separately entitled |

## 8. Future-phase boundary register (context only — nothing built)

- **Phase 19 (3D):** A3's design step is the future mount point; it consumes the **same** `ds-` spec + measurement profile + fabric profile contracts, so visualization slots in without a new garment universe. Phase 18 adds **no** 3D abstraction, no mesh/parametric decisions (Phase 19 Stage 0 owns those).
- **Phase 20 (billing):** role ≠ entitlement kept conceptually and practically separate (§1 invariant); no plan names in UI/authz logic today.
- **Phase 21 (Customer App):** Flow A/B produce the canonical records (orders, stage events, specs, invoices) a customer surface will later read; portal audience isolation already exists.

## 9. New open decisions (with proposed defaults)

- **D9** Wizard write-path: create order at A5 only (draft persisted locally until confirm) — *proposed*.
- **D10** Fitting stages shown conditionally (only when order type includes fittings) — *proposed*.
- **D11** Pattern Preparation placement: inside order workspace vs also a Production column — *proposed: both, single source*.
- **D12** AI chips default state: collapsed one-tap with "Advisory only" label — *proposed (matches certified UI copy)*.
- **D13** Customer merge/dedupe tooling in A0 — *defer to Stage 8 decision*.
- **D14** Stage-gate strictness: QC pass required before `ready` — *proposed: required, admin override allowed*.

---

**APPROVAL GATE — Stage 2 ends here.** On approval (with D9–D14 defaults or amendments), Stage 3 (Visual Direction spec) begins, followed by Stage 4 (asset acquisition). No UI code is written until Stages 2–3 are approved per the stage gates.
