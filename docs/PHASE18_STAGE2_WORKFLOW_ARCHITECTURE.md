# Phase 18 — Stage 2: Workflow Architecture
**Program:** PHASE 18 — PRODUCT EXPERIENCE TRANSFORMATION (stages 0–14 execute inside Phase 18)
**Baseline:** certified `phase-17-integration-validated` (`ef6465f`) + Stage 1 blueprint (`d4b1802`)
**Document version:** 1.1 — amended in place after the Master-Mandate Conformance Audit (changelog §17). This file remains the single authoritative Stage 2 artifact.
**Status:** SPECIFICATION FOR APPROVAL — no UI implementation in this stage. Phases 19–21 are architectural context only.

---

## 0. Conventions, decisions, executive summary

### 0.1 Evidence-classification convention (applies to every statement in this document)
- **VERIFIED** — read from repository/runtime this session (file/line or live-call evidence).
- **INFERRED** — follows from verified code but not directly observed.
- **PROPOSED** — Phase 18 design intent, not yet existing behavior.
- **UNRESOLVED** — requires investigation or product-owner input; no default assumed as fact.

### 0.2 Executive summary *(mandate §A)*
StitchFlow's intelligence stack (Phases 13–17) is complete, reachable and runtime-certified, but is experienced as engineering phases rather than as one tailoring job. Stage 2 specifies the workflow architecture that makes the product feel like **Customer → Order → Design → Make → Deliver** while consuming — never re-owning — the canonical domain contracts. Twelve flows (A–L) cover the full tailoring lifecycle; eight workflow states are specified against the **existing canonical enums** (no database state model is changed); each intelligence phase is mapped to a contextual, progressive-disclosure position; AI is advisory-only with five explicit verbs and a hard prohibition on silent modification; offline/recovery behavior is classified by evidence, not assumption; data ownership and role authorization are mapped with verified-vs-proposed separation; and migration follows replacement-before-removal. Phases 19–21 consume the same canonical boundaries later — nothing speculative is built now.

### 0.3 Workflow principles *(mandate §B)*
1. **The job is the unit, not the module** — screens follow the tailoring job, never the engineering phase.
2. **Canonical contracts are single-source truth** — flows consume Phase 13–17 APIs; no duplicate domain models (Phase 19/21 will consume the same).
3. **Capability hidden, outcome exposed** — "Materials required: 4.5 yd", never "Fabric Consumption Engine".
4. **Progressive disclosure** — simple by default, "View Pattern Details" for experts.
5. **Advisory-only intelligence** — deterministic engines are authoritative; AI informs, never modifies.
6. **Role ≠ entitlement** — workspace roles authorize actions; commercial entitlement is a future Phase 20 dimension.
7. **Offline-first continuity** — interruption at any point loses nothing; sync reconciles later.
8. **Replacement before removal** — no existing capability is retired before its successor is browser-certified.

---

## 1. Canonical data boundary map (the contracts every flow consumes) — all rows **VERIFIED**

| Contract | Owning phase | Canonical API | Id format |
|---|---|---|---|
| Customer | core | `POST/GET /customers` | epoch string |
| Measurement profile (versioned, validated) | 13 | `/customers/:id/measurement-profiles` (+`/:pid`, `/validate`, `/activate`, `/compare`) | `mp-<uuid>` |
| Measurement definitions | 13 | `/measurement-definitions?garmentType=…` | codes |
| Inspiration reference | 14 | `/customers/:id/inspirations` | uuid |
| Fabric profile | 14 | `/fabric-profiles` | uuid |
| Design specification (+versions, status, history, measurement-context) | 14 | `/customers/:id/design-specifications` (+`/:id`, PATCH, `/history`, `/measurement-context`) | `ds-<uuid>` |
| Pattern model (pieces, derivation context, readiness) | 15 | `/customers/:id/pattern-models` (+`/readiness/:specId`) | `pm-…` |
| Cutting layout / instructions / metrics | 15 | `/customers/:id/cutting-layouts` | uuid |
| Production plan / operations / QC / readiness / consumption / purchasing | 16 | `/production-plans` | plan ids |
| Order + production stages (sequence 1–9) | core/16 | `/orders`, `POST /orders/:id/production-stages/:stageCode/transition` | epoch string |
| Invoice / payment (financial state) | core | `/invoices`, `/payments` | uuid |
| AI advisories (gateway, advisory-only) | 17 | `/ai/measurement-review/:pid`, `/ai/design-review`, `/ai/fabric-review/:planId`, `/ai/production-review/:planId`, `/ai/explain`, `/ai/status` | — |
| Design Studio artifacts (protected IP) | 1–15 | offline drafts / pattern library | untouched; entry points only |

---

## 2. Complete primary tailoring lifecycle *(mandate §C)* — **Diagram 1**

```
CUSTOMER ─→ ORDER ─→ MEASUREMENTS ─→ DESIGN ─→ FABRIC/MATERIALS ─→ PATTERN/CUTTING PREP
                                                                                                 │
        PAYMENT ◄──────────────── DELIVERY ◄──────── QC ◄──────── PRODUCTION ◄──────────────────┘
            │                        │
            └──── financial close ───┘  (independent of production close — see §4.G)
```

**Diagram 1a — Canonical state mapping (human presentation vs canonical domain state). No database state model is changed.**

| Human workflow presentation *(PROPOSED labels)* | Canonical domain state *(VERIFIED: `productionStageService` sequence 1–9 + order status enums)* |
|---|---|
| Getting started | order `draft` + stage `measurement` (seq 1) |
| Cutting prep | stage `cutting` (seq 2) — gated by pattern readiness |
| Making | stages `sewing` (3), `embroidery` (4) |
| Fittings | `first_fitting` (5), `second_fitting` (6) — shown conditionally (D10) |
| Finishing | `final_press` (7) — presentation may group with fittings; **no canonical stage is deleted, merged or renamed** |
| Ready for pickup | `ready` (8) + order `ready` |
| Delivered | `delivered` (9) + order `delivered` |
| Cancelled | order `cancelled` (stage board hides columns per state — presentation only) |

> **Rule:** grouping/labeling is presentation-layer only. Every canonical stage remains individually addressable, transitionable and audited. Removing/hiding a stage for a given order type is configuration, never schema change.

---

## 3. Detailed workflow specifications *(mandate §D — Flows A–L)*

### FLOW A — Customer creation → order confirmation *(orchestrating wizard; supersedes nothing until D8 parity)*
**Route:** `/app/customers/new` → `/app/orders/new?customer=:id` — 5 steps, resumable local draft.

| Step | User experience | Hidden capability | Contracts | Guards |
|---|---|---|---|---|
| A0 Customer | minimal phone-first form (Ghana-aware) | provisioning/dedupe (dedupe tooling = D13) | `POST /customers` | workspace member |
| A1 Order intent | garment category picker + due date + notes | — | category taxonomy from design contracts | — |
| A2 Measurements | `[Select existing profile]` / `[Take new]`; guided fields per garment; ✓ complete; 💡 AI Review chip | Phase 13 + 17 | profiles + definitions + `/ai/measurement-review/:pid` | profile belongs to customer+workspace (server 404) |
| A3 Design | styles gallery → customize (canonical option sets) → optional inspiration; ✨ chip; "open Design Studio" disclosure | Phase 14 + 17 + Studio hand-off | specs, inspirations, `/ai/design-review` | — |
| A4 Fabric | fabric picker; live yardage/waste card; `[Confirm Materials]` | Phase 16 + 17 | fabric-profiles, production-plans, `/ai/fabric-review/:planId` | — |
| A5 Review & confirm | summary → `[Start Production]` writes order + linkages + first stage | readiness rules (generalized OrderForm checks — **VERIFIED** existing implementation) | `POST /orders` | price/discount edits `owner|admin` (**PROPOSED**) |

### FLOW B — Measurement lifecycle *(mandate §6 deep check)*
- **Reuse rules:** profiles are per-customer, versioned (`parentProfileId`/`supersedesProfileId`/`version` — **VERIFIED**); wizard offers existing profiles first, newest-active highlighted. New capture after an order exists creates a **new version**, never mutates history.
- **Historical profiles vs orders:** orders persist `measurement_snapshot` (**VERIFIED** schema) — later measurement changes never alter past orders. *(VERIFIED structural; UI presentation PROPOSED.)*
- **Order snapshots:** A2 writes the snapshot + `selectedMeasurementProfileId/Label/Type` linkages (**VERIFIED** order-create fields).
- **Incomplete measurements:** Phase 13 completeness/validation governs; wizard blocks A5 only on blocking findings, warns otherwise (**VERIFIED** validation levels exist; blocking policy = D14-adjacent, default proposed).
- **Units:** canonical cm at 4 dp; display-unit toggling is derived, never lossy (**VERIFIED** `units.ts`); yard display where fabric is sold in yards (**PROPOSED** presentation).
- **Offline capture:** local-store capture with sync (**VERIFIED** offline architecture; measurement sync path classification §6).
- **AI advisory:** one-tap review chip; deterministic validation always rendered first (**VERIFIED** certified behavior).
- **Manual override:** every value carries `source ('manual','historical_copy','imported','derived','estimated',…)` and `override_reason` (**VERIFIED** migration 018) — override with rationale is a first-class domain concept; UI surfaces it.
- **Evidence vs policy:** reuse/snapshot/override = VERIFIED; "which profile is default per garment type" = **UNRESOLVED** (product nuance, Stage 8).

### FLOW C — Design selection & customization
- **Draft behavior:** Design Studio drafts persist locally per order (**VERIFIED** draft store); wizard A3 holds a local draft until spec creation (**PROPOSED**, mirrors verified pattern).
- **Entry/exit from protected Studio:** entered via A3 "Advanced" or customer Designs tab; exit returns to the wizard step with artifacts linked (**PROPOSED** entry-point change only — Studio internals untouched).
- **Reuse:** specs are per-customer; prior specs offered as starting points (**VERIFIED** list API; **PROPOSED** picker UX).
- **Attachment to orders:** order ↔ `designSpecificationId` linkage (**VERIFIED** order-create field).
- **Immutability/versioning:** specs are PATCHable with `design_specification_versions` + `/history` (**VERIFIED**); statuses `draft|partial|ready_for_design|validated|ready_for_pattern` (**VERIFIED**).
- **Pattern compatibility:** `ready_for_pattern` status + pattern readiness endpoint gate the next flow (**VERIFIED**).
- **Offline:** spec edits offline follow the store-then-sync pattern (**INFERRED** from sync architecture; per-endpoint classification §6).

### FLOW D — Material & fabric decisions
- **Preconditions:** design spec exists (consumption derives from spec + pattern plan) (**VERIFIED** chain).
- **Deterministic inputs:** layout envelope is the baseline (never area÷width), every allowance independently visible (**VERIFIED** service contract).
- **Confidence/uncertainty:** pattern matching is **never claimed auto-solved**; allowances shown explicitly (**VERIFIED**); UI presents confidence as itemized allowances, not a fake certainty (**PROPOSED** presentation).
- **Manual overrides:** fabric width from `FabricProfile.width.valueCm` **or explicit override with `widthSource`** (**VERIFIED**); override rationale visible.
- **Fabric width:** cm canonical; inch inputs converted with fixed tolerance (**VERIFIED** `widthToCm` + width tolerance).
- **Directional fabric / pattern matching / allowances:** modeled as explicit allowances in the consumption engine (**VERIFIED** engine fields); UI surfaces each line item.
- **Stock vs procurement:** Phase 16 purchasing recommendations exist (**VERIFIED**); A4 shows "in stock" vs "purchase recommended" split (**PROPOSED** presentation of verified capability).

### FLOW E — Pattern / cutting preparation
- **Preconditions:** `designSpecificationId` + `measurementProfileId` + `measurementProfileVersion` required at derivation (**VERIFIED** POST contract); readiness endpoint reports spec readiness (**VERIFIED**).
- **Generation trigger:** `[Generate Cutting Plan]` — explicit user action (**PROPOSED** UI over **VERIFIED** derive endpoint).
- **Regeneration:** new model/version; previous model marked `superseded` (**VERIFIED** status enum) — history preserved.
- **Change invalidation:** measurement/design change ⇒ readiness re-check flags stale derivation (**VERIFIED** readiness contract); UI marks "inputs changed — regenerate" (**PROPOSED**).
- **Caching:** derived models persisted per customer (**VERIFIED**); no re-derivation on view (**INFERRED**).
- **Failure handling:** derivation errors surface as guidance + retry; partial output never silently accepted (**PROPOSED** UX; engine error behavior **VERIFIED** non-silent).
- **Offline capability:** derivation requires the pattern engine (client-side, protected IP) + persistence — **PARTIALLY OFFLINE CAPABLE** (§6).
- **Progressive disclosure:** checklist + one button; "View Pattern Details" expands pieces/layout/instructions (**PROPOSED** presentation of **VERIFIED** Phase 15 data).

### FLOW F — Production lifecycle *(see §4 state architecture)*
- **Entry criteria:** A5 confirm (order `in_progress`, stage `measurement` seq 1) + pattern ready for `cutting` (**VERIFIED** gate points).
- **Allowed actions per stage:** advance to next sequential stage; notes/events on every transition (**VERIFIED** transition API + events); fittings conditional per order type (**PROPOSED** config, D10).
- **Responsible roles:** assistants advance own-work stages; financial steps `owner|admin` (**PROPOSED**, on **VERIFIED** role middleware).
- **Required artifacts:** stage artifacts verified at gates (measurements → cutting needs pattern; `ready` needs QC pass — D14).
- **Exit criteria:** `ready` (seq 8) after `final_press` (+QC); `delivered` (seq 9) closes production (**VERIFIED** sequence).
- **Rework:** backward transitions — **UNRESOLVED/REQUIRES INVESTIGATION** (transition-service semantics for reverse moves not yet evidenced; Stage 10 forensics will verify before UI defines rework).
- **Cancellation:** order-level `cancelled` status (**VERIFIED** enum); stage-level cancel **UNRESOLVED**.
- **Offline:** stage transitions are API writes — **PARTIALLY OFFLINE CAPABLE** (queue-then-sync; §6).

### FLOW G — Payment & delivery — **production completion ≠ financial completion**
- **VERIFIED structural separation:** financial state lives on invoices/payments (`payment_status`, `amount_paid`, `balance_due`, `paid_at`) independently of order/stage status. A garment can be `delivered` with balance due, or fully paid before `ready`.
- Flow G presentation: payment steps on the order card read Finance contracts; delivery is a stage transition; the two closures are shown separately (**PROPOSED** presentation, **VERIFIED** separation). No commercial policy (plans, late fees, deposits) is invented here — **UNRESOLVED**, owned by Phase 20.

### FLOW H — Customer workspace
`/app/customers/:id` — tabs Overview · Orders · Measurements · Designs · Production · Payments · Activity. Merges the `CustomerOrdersModal`/`CustomerDetail` duality (migration §10). Intelligence powers tabs invisibly; today's Intelligence hub content becomes the Measurements+Designs tabs' engine (**PROPOSED** shell over **VERIFIED** capabilities).

### FLOW I — Operational dashboard
"What should I do today?" — Today's Priorities (due today / awaiting measurements / ready for production — derivable from **VERIFIED** order+stage data), Active Orders list, Quick Actions (**PROPOSED** presentation; Stage 7).

### FLOW J — Mobile primary workflow
Bottom nav (Home · Customers · Orders · Production · More). Flows A/B as steppers; stage transitions one-tap; measurement capture mobile-first (**PROPOSED**; Stage 12). Offline capture is most valuable here (workshop connectivity).

### FLOW K — Developer experience
Entitled staff (workspace + `DEVELOPER_API` flag) → account menu → `/developer` (DeveloperLayout): Overview · API Keys · Webhooks · API Activity · Usage · Documentation · ← Workspace. No workspace-sidebar presence; flagged-off shows the honest flag notice (**VERIFIED** behavior); endpoints stay flag+auth gated (**VERIFIED**).

### FLOW L — Platform owner experience
Account menu → Platform Control → `/platform` (PlatformLayout): Overview · Workspaces · Operators · Feature Flags · Usage & Limits · System Health · Governance · Configuration · ← Workspace. `users.role`-based, server-enforced; invisible+403 for non-platform users (**VERIFIED** chain). Business admin ≠ platform admin (**VERIFIED**).

---

## 4. Workflow state architecture *(mandate §E)* — enums are **VERIFIED canonical**; presentation is **PROPOSED**

| State | Canonical values (**VERIFIED**) | Human presentation *(PROPOSED)* | Transition owner |
|---|---|---|---|
| Customer | created/active; soft-delete (`deleted_at`) | customer card states | workspace member |
| Order | `draft · in_progress · ready · delivered · cancelled` | job card badges | A5 confirm; stage completion; cancel (role-gated) |
| Measurement | profile `DRAFT/ACTIVE/…` + version chain + per-value `source`/`override_reason` | ✓ complete / needs verification chip | Phase 13 validation authoritative |
| Design | spec `draft · partial · ready_for_design · validated · ready_for_pattern` + versions | readiness checklist item | Phase 14 status machine |
| Material readiness | consumption inputs + `widthSource` + allowances + purchasing recommendation | "Materials confirmed ✓" + yardage card | Phase 16 engine |
| Production | stages seq 1–9 (`measurement→…→ready→delivered`) + events | lifecycle columns/cards | transition API (role-gated) |
| Payment | invoice `payment_status`, `amount_paid`, `balance_due` | balance badge on order/customer | Finance contracts (role-gated) |
| Delivery | stage 9 + order `delivered` | delivered state + timeline close | transition API |

**No new states are introduced.** Presentation may group/label (§2 Diagram 1a) but every canonical state remains addressable and audited.

---

## 5. Intelligence integration map & AI advisory architecture *(mandate §F, §G)*

### 5.1 Contextual intelligence map
| Phase | Contextual position | Visible as |
|---|---|---|
| 13 Measurement | Flow A step 2 · Customer Measurements tab · stage-1 gate | guided fields, ✓ complete, verification chips |
| 14 Design | Flow A step 3 · Customer Designs tab · Studio hand-off | gallery, customize, readiness |
| 15 Pattern | Flow E · order workspace · cutting gate | checklist + Generate Cutting Plan + disclosure |
| 16 Fabric/Production | Flow A step 4 · Flow B stages · Materials screen | yardage card, stage columns, QC checklist |
| 17 AI | chips at each step (💡 ✨) + explain links | advisory cards, never destinations |

### 5.2 AI advisory verbs *(policy mapping — **PROPOSED** over **VERIFIED** advisory-only architecture)*
- **INFORM** — status/limitation statements ("Deterministic results only — no AI was used" — **VERIFIED** current copy).
- **WARN** — findings from deterministic engines surfaced advisively ("one measurement may benefit from verification").
- **SUGGEST** — style/fabric pairings at design steps.
- **EXPLAIN** — plain-language rationale (Phase 17 `/ai/explain` — **VERIFIED**).
- **RECOMMEND** — actionable next-step recommendations with evidence arrays (**VERIFIED** advisory structure).
- **PROHIBITED — SILENTLY MODIFY:** the AI layer has **no write path** to any domain record (**VERIFIED**: advisories are read-only responses; deterministic engines remain authoritative — certified). Every AI-visible change is a user-confirmed action. This prohibition is architectural and carried into Phase 18 unchanged.

---

## 6. Offline & recovery architecture *(mandate §H, §I)*

### 6.1 Interruption matrix *(recovery behavior; store mechanics **VERIFIED**, per-flow UX **PROPOSED**)*
| Interruption | Recovery behavior |
|---|---|
| App closed mid-wizard | local draft resumes at exact step |
| Offline transition | flows continue on store; sync on reconnect |
| Screen change | wizard state persists in store (not component memory) |
| Sync failure | queued mutation retried; conflict surfaced (existing sync engine) |
| Browser refresh | boot restores store + auth (verified pattern: draft restore) |
| Concurrent staff modification | last-write-wins per existing sync contract — conflict UX **UNRESOLVED** (Stage 8 investigation) |
| Missing required data | gate blocks step with guidance, never engine jargon |
| Pattern generation failure | error + retry; no partial acceptance |
| AI unavailability | chip degrades to deterministic-only notice — never blocks (**VERIFIED**) |
| Measurement changes after order | new profile version; order snapshot untouched (**VERIFIED**); regenerate prompt on stale derivation |
| Design changes after material calculation | readiness flags stale consumption → re-confirm materials prompt |
| Offline stage transition | queued transition applied in order on reconnect (**INFERRED** from queue architecture) |

### 6.2 Offline-first workflow audit *(evidence-based classification)*
| Workflow | Classification | Evidence |
|---|---|---|
| Customer capture | **PARTIALLY OFFLINE CAPABLE** (local list verified; API create + sync) | store + `/customers` |
| Measurement capture/review | **PARTIALLY OFFLINE CAPABLE** (local capture; definitions/validation cache; review needs API) | offline measurement suite **VERIFIED** |
| Design selection/customization | **PARTIALLY OFFLINE CAPABLE** (Studio offline-verified; spec sync via store) | phase tests |
| Fabric/material decision | **PARTIALLY OFFLINE CAPABLE** (consumption is client-computable **VERIFIED**; purchasing needs API) | service is pure functions |
| Pattern derivation | **FULLY OFFLINE CAPABLE** (client-side engine — protected IP — persisted locally; sync) | offline pattern suite **VERIFIED** |
| Production stage transitions | **ONLINE REQUIRED** (API write; queueing **INFERRED**) | transition endpoint |
| Payments/invoices | **ONLINE REQUIRED** (financial writes) | Finance APIs |
| AI advisories | **ONLINE REQUIRED** by design (degrade offline — **VERIFIED** deterministic-only) | gateway |
| Platform/Developer surfaces | **ONLINE REQUIRED** | control-plane APIs |

---

## 7. Data ownership & consistency map *(mandate §J)*

| Domain | Current UI source *(VERIFIED Stage 0)* | Local persistence | Backend persistence | Sync path | Conflict risk |
|---|---|---|---|---|---|
| Customer | API (`Customers.tsx`) | store cache | `customers` | API-first + store | low |
| Order | **offline store** (`Orders.tsx`) | yes | `orders` | sync engine | **medium-high** (split-brain — Stage 8 risk register) |
| Measurement | API (Intelligence hub) | store capture | Phase 13 tables | API + sync | low (versioned) |
| Design | API + Studio drafts | drafts + specs | Phase 14 tables | API + sync | low (versioned) |
| Material | store (`Materials.tsx`) + Phase 16 API in flow | yes | fabric profiles/plans | mixed | medium |
| Production | API (`ProductionBoard.tsx`) | — | stages/events | API | low (event-sourced) |
| Invoice | API (`Invoices.tsx`) | — | invoices | API | low |
| Payment | API | — | payments | API | low |
| Report | **offline store** (`Reports.tsx`) | yes | derived | store-derived | low (read model) |

**Known inconsistency (carried, D6):** Orders screen reads the store while Dashboard/Production read the API. Stage 8 must either unify or firewall the wizard's write path; the wizard follows the Intelligence-hub API-first pattern.

---

## 8. Role × workflow authorization matrix *(mandate §K)*

Legend: **V** = VERIFIED CURRENT enforcement · **P** = PROPOSED POLICY (to be enforced via existing middleware)

| Workflow / action | assistant | workspace admin | owner | developer-entitled | platform_owner |
|---|---|---|---|---|---|
| View workspace data | V (workspace member) | V | V | V (workspace only) | V |
| Create customer/order/measurement/design | P (own work) | V¹ | V | — | V |
| Advance production stages | P (own work) | V¹ | V | — | V |
| Price/discount/financial writes | P deny | V¹ (`requireWorkspaceRole`) | V | — | V |
| Developer console | V deny (flag-gated) | V deny | V deny | V (flag) | V deny unless entitled |
| Platform Control Center | V deny (403) | V deny | V deny | V deny | V (`requirePlatformRole`) |
| Operator grants | V deny | V deny | V deny | V deny | V (platform write) |

¹ enforcement middleware **VERIFIED** (`requireWorkspaceRole('owner','admin')`); which business actions use it = **PROPOSED** per column.
Other evidenced platform roles (`platform_admin/support/analyst` — **VERIFIED** constants) inherit Control-Center read/operate/write per existing level definitions; navigation for them = **PROPOSED** (same menu, sections per level).

---

## 9. Migration map *(mandate §L — replacement before removal)*

| Current surface | Replacement | Removal timing |
|---|---|---|
| `Customers → Intelligence` entry (certified) | Flow A steps A2–A4 + customer tabs | same release as Stage 8 parity (**D8**) |
| `CustomerOrdersModal` | customer workspace Orders tab | Stage 8, after parity |
| Sidebar Developer entry | account-menu Developer Console (Flow K) | Stage 6 |
| Sidebar Control Center entry | account-menu Platform Control (Flow L) | Stage 6 |
| Dashboard stats page | Operational Overview (Flow I) | Stage 7, after parity |
| `Production Board` naming/layout | Production lifecycle board (canonical seq 1–9) | Stage 10 (in place) |
| Switch-Role/Simulate-Tier demo controls | dev-flagged debug surface | Stage 6 |
| Design Studio sidebar entry | contextual entries only (A3, Designs tab) | Stage 6 (**D2**) |

Every row: replacement browser-certified **before** removal; no capability gap at any point.

## 10. Implementation dependencies *(mandate §M)*
Stage 6 (shells/routes) precedes 7–10 surfaces; Stage 4 assets precede 11 and A3 gallery; Stage 5 primitives precede all screen work; Flow A wizard depends on 5+6 and D9; Stage 8 depends on customer-workspace routes; Stage 9 contextualization rides on 8; Stage 10 needs rework/cancel forensics (§3 FLOW F UNRESOLVED items); 12 depends on 5–10; 13–14 gate everything.

## 11. Stage 3 handoff *(mandate §N)*
Visual direction must express: 7-destination workspace nav; wizard stepper (5 steps + progress); lifecycle board columns (canonical seq grouping per Diagram 1a); advisory chip styles (💡 ✨ with "Advisory only" labels); readiness checklists; yardage/material cards; empty states with illustration slots; mobile bottom nav; three shell identities (Workspace/Developer/Platform); account-menu pattern for privileged access; motion principles honoring `prefers-reduced-motion` (already global — **VERIFIED**).

## 12. Stage 8 handoff *(mandate §O)*
Stage 8 receives: this flow set (A–L) as build spec; state enums (§4) as the only allowed states; data-ownership map (§7) incl. the Orders split-brain risk; migration table (§9) with D8 parity rule; open items: concurrent-edit conflict UX, default-profile-per-garment policy, rework/cancel forensics, customer dedupe (D13).

---

## 13. Decision register *(mandate §4 format — no manufactured decisions)*

| # | D9 — Wizard write-path | 
|---|---|
| **Title / Context** | When does the order exist: at A5 confirm only, or earlier? |
| **Verified current** | OrderForm creates order on submit; drafts are local (**VERIFIED**) |
| **Options** | (a) order created at A5 only, local draft until then · (b) create `draft` order at A1 |
| **Recommended default** | (a) |
| **Rationale** | matches verified pattern; avoids abandoned draft rows polluting boards |
| **Impact if undecided** | wizard persistence design ambiguity |
| **Blocking stage** | Stage 8 · **Class B** (safe default) |

| # | D10 — Conditional fitting stages |
|---|---|
| **Title / Context** | show `first/second_fitting` only when order type includes fittings |
| **Verified current** | all 9 stages created per order (**VERIFIED** seq 1–9) |
| **Options** | (a) conditional display · (b) always show |
| **Recommended default** | (a) display-level only; canonical stages unchanged |
| **Rationale** | reduces noise; zero schema impact |
| **Impact if undecided** | board column design in Stages 7/10 |
| **Blocking stage** | Stage 7 · **Class B** |

| # | D11 — Pattern-preparation placement |
|---|---|
| **Title / Context** | inside order workspace vs also a Production column |
| **Verified current** | pattern readiness is per design spec (**VERIFIED** endpoint) |
| **Options** | order workspace only · both (single source) |
| **Recommended default** | both, single source of truth |
| **Rationale** | tailors think from the board; experts from the order |
| **Impact if undecided** | Stage 10 layout only |
| **Blocking stage** | Stage 10 · **Class D** (architecture resolves; not owner-level)** |

| # | D12 — AI chip default state |
|---|---|
| **Title / Context** | collapsed one-tap with "Advisory only" label |
| **Verified current** | panels never fire on mount; advisory-only labeling **VERIFIED** |
| **Options** | collapsed · expanded |
| **Recommended default** | collapsed, one tap |
| **Rationale** | certified pattern; least friction |
| **Impact if undecided** | trivial styling |
| **Blocking stage** | Stage 5 · **Class D** |

| # | D13 — Customer merge/dedupe tooling |
|---|---|
| **Title / Context** | A0 dedupe assistance |
| **Verified current** | none (**VERIFIED** absence) |
| **Options** | defer · soft-suggestions at entry |
| **Recommended default** | defer to Stage 8 decision |
| **Rationale** | no evidence of current duplication pain |
| **Impact if undecided** | none blocking |
| **Blocking stage** | Stage 8 · **Class C** |

| # | D14 — QC gate strictness |
|---|---|
| **Title / Context** | QC pass required before `ready`; admin override allowed? |
| **Verified current** | QC checkpoints exist (**VERIFIED** Phase 16); no gate enforcement evidenced — **UNRESOLVED** |
| **Options** | (a) required + override (`owner|admin`) · (b) required, no override · (c) advisory only |
| **Recommended default** | (a) |
| **Rationale** | quality without rigidity |
| **Impact if undecided** | Flow B gate semantics |
| **Blocking stage** | Stage 8/10 · **Class A/B** — the only genuinely owner-flavored call |

**Classification summary:** none block **Stage 3**. D14 (and D9/D10 defaults) should be confirmed with Stage 8 authorization; D11/D12 are architecture details (Class D); D13 defers.

---

## 14. Diagrams 2–8 *(mandate §2 — informational ASCII only)*

**Diagram 2 — Customer → Order (Flow A):**
```
CUSTOMER ──► ORDER INTENT ──► MEASUREMENTS ──► DESIGN ──► FABRIC ──► REVIEW/CONFIRM
 (A0)          (A1)             (A2: P13+P17)   (A3: P14+P17)(A4: P16) (A5: order+linkages)
```
**Diagram 3 — Order dependency graph:**
```
MeasurementProfile ─┐
DesignSpecification ─┼─► PatternModel ─► CuttingLayout ─► ProductionPlan ─► Materials confirmed
 (mp-…, versioned)   └─(readiness gate)   (pm-…)          (Phase 15)          (Phase 16)        (A5 unlock)
```
**Diagram 4 — Production state lifecycle (canonical seq):** see §2 Diagram 1a (canonical states, presentation grouping).
**Diagram 5 — Contextual intelligence stack:** Phase 13→14→15→16→17 chain feeding presentation steps A2/A3/A4/E/B (§5.1 table is the authoritative mapping).
**Diagram 6 — Offline/sync continuity:** local store ⇄ sync engine ⇄ canonical APIs per §7 map; interruption matrix §6.1.
**Diagram 7 — Role/surface boundaries:**
```
WORKSPACE (owner|admin|assistant)      DEVELOPER (staff+flag)      PLATFORM (users.role)
   /app/* — Flows A–J                    /developer/* — Flow K        /platform/* — Flow L
        └──────── account menu only ──────┴────────────────────────────┘   (server 403 boundary)
```
**Diagram 8 — Current → proposed migration:** §9 table (authoritative; replacement-before-removal).

---

## 15. Future-phase boundary register (context only)
Phase 19 (3D) mounts at A3/Designs tab consuming the **same** `ds-`/`mp-`/fabric contracts — no 3D abstraction built now. Phase 20 keeps role ≠ entitlement (§8 legend). Phase 21 consumes order/stage/spec/invoice records emitted by Flows A/B. No speculative infrastructure.

## 16. Protected & preserved
`DesignStudio.tsx` / `patternEngine.ts` / `productionAssistant.ts` ZERO DIFF (entry points only). All Phase 13–17 contracts, tenant isolation, auth, offline store, sync, migrations preserved.

---

## 17. Document changelog & conformance record
- **v1.0** (`90ee3f6`) — initial Stage 2 spec: canonical boundary map, Flows A–D (order wizard, production, platform, developer), role matrix, D9–D14.
- **v1.1** (this amendment — `docs(ux): complete Stage 2 workflow specification conformance`) — added per Master-Mandate Conformance Audit: executive summary (§0.2); workflow principles (§0.3); complete lifecycle + **canonical-vs-presentation mapping with no-state-change rule** (§2, Diagrams 1/1a); full Flows A–L incl. deep lifecycle checks for measurement/design/material/pattern/production/payment-delivery (§3); workflow state architecture (§4); intelligence + AI verb architecture incl. SILENTLY-MODIFY prohibition (§5); offline interruption matrix + evidence-based offline audit (§6); data ownership & consistency map (§7); role matrix split VERIFIED/PROPOSED (§8); migration map (§9); dependencies (§10); Stage 3 & Stage 8 handoffs (§11–12); full-format decision register with A/B/C/D classes (§13); diagrams 2–8 (§14). Documentation-only; no source code, protected assets, or Stage 3 work.
