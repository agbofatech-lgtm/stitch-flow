# Phase 18 — Stage 8: Order Creation Workflow (Customer → Confirm)

**Status: IMPLEMENTED (Stage 8 of the staged rebuild). Baseline commit `7787681`.**
Evidence classes used throughout: VERIFIED (observed in repository/run), IMPLEMENTED (built this stage), PROPOSED (recommendation, not built), UNRESOLVED (open gap, honestly stated).

---

## Part A — Scope & Experience

Stage 8 delivers the first complete operational workflow: **Customer → New Order → Garment → Measurements → Design → Materials → Review → Confirm**, as one coherent wizard instead of a redesigned page.

- New component: `apps/web/src/modules/orders/OrderWorkflow.tsx` (5 steps, `data-view="order-workflow"`, `data-step` on the root reflects the current step id).
- Entry point: Customer Workspace → "New order" (`data-handoff="stage8-order-workflow"`, `apps/web/src/modules/customers/CustomersView.tsx`). The legacy order-creation path (Orders view → OrderForm) remains untouched and reachable (replacement-before-removal §40).
- Post-confirm screen (`data-view="order-confirmed"`) shows order number, the five summary rows, and a **contextual Design Studio entry** (`data-action="open-studio"` → `selectOrder(orderId)` + `setView('design-studio')`, the §12 entry contract: the studio receives order context; the tailor is never stranded — the shell's normal navigation returns them).
- The tailor never sees Phase 13–17 internals: no engine names, contract names, flags, or algorithms appear in the UI. Materials are presented as "Materials Required" (human workflow), not as a Phase 16 engine.

## Part B — Customer Context (§28)

- The workflow header reads "New order · {fullName}" from the moment it opens until confirmation; the customer is never re-asked or re-typed.
- Back/exit returns to the Customer Workspace (`onExit`), not to a bare list.

## Part C — Step 1: Garment

- 11 garment tiles — the repository's `GarmentType` union is the taxonomy (VERIFIED: `src/shared/types/index.ts:115`). The Stage 8 mandate text lists 5 (shirt/trouser/kaftan/dress/jacket); **repository evidence (11 values) wins**. Stage 4 imagery covers 4 of them (shirt, trouser, kaftan, dress) via `assets.ts → garmentImageSrc(type)`; the remaining 7 render an honest fallback tile with `title="No reference image available"`. No invented imagery (VISUAL_ASSET_MANIFEST §2/§5 records authentic photography as an open acquisition gap).
- Selecting a garment is required before Continue (disabled state, not an error dialog).

## Part D — Step 2: Measurements (lifecycle)

The step implements the mandated lifecycle: existing profile? → select/create → review/capture → validate → advisory → confirm → attach → snapshot.

- **Existing profile**: the customer's measurement profiles (from `useApp`) render as selectable cards; selecting one shows a read-only review of its 16 values before it can be attached.
- **Create/capture**: "Capture manually" switches to a 16-field form — the canonical `SNAPSHOT_FIELDS` set, identical keys and order to `OrderForm.SNAPSHOT_FIELDS` (VERIFIED `src/components/OrderForm.tsx:70`). Manual values ≥ 1 valid entry unlock Continue (soft validation: positive numbers; empty fields are simply absent from the snapshot — same honesty as the legacy form).
- **Attach + snapshot**: at confirm, a profile selection applies the canonical `applyMeasurementProfileToOrder(orderId, profileId)` (the Phase 13–17 snapshot machinery; historical orders untouched), while manual values are written as `garmentMeasurements` directly on the new order. Both paths were contract-checked: `addOrder` returns the new order id (`string | null`, VERIFIED `AppContext:933`).

## Part E — Step 3: Design

- Phase 14 design inspirations from the store render as cards with imagery; selection is optional. Empty state names what/why/next ("No design inspirations on this device yet") with the action "Continue without design" — deliberately worded so it cannot be confused with the action bar's Continue.

## Part F — Step 4: Materials (human workflow, §15)

- Fabric records (Phase 16 store) render as a simple list: name, colour/notes, and stock — **labelled as a library record** ("Stock on record"). A requirement is NOT stock: the step never claims the fabric is reserved, procured, or deducted. Yardage estimation is explicitly deferred to Phase 15→16 (later stage; not faked here).

## Part G — Step 5: Review (§16) & Confirm (§17)

- Review answers "Do I know exactly what I'm about to make?": customer, garment, measurement source (profile name or "captured manually, N values"), design, fabric, plus due date, price, and notes fields.
- Confirm is explicit (`data-action="confirm-order"`). It verifies its dependencies and explains exactly what is missing:
  - API customer not in the device store → `addCustomer` is attempted (tier-gated; a BASIC-plan limit surfaces the store's own error text, VERIFIED). Creation updates context state asynchronously, so confirmation completes via an effect once the new store customer appears (below).
  - `addOrder` returning null → "The order could not be saved on this device. Nothing was lost — please retry." — actionable, no data loss, no false success.
- Confirm payload honesty: `status: 'in_progress'`, `buildOrderNumber()` (`SF-YYMMDD-HHMMSS`, same format as the legacy form), `productionStages: []`. The legacy OrderForm seeds `DEFAULT_PRODUCTION_STAGES` on create; the wizard does not (no stage plan is promised before production planning exists) — **documented divergence**, listed in Part N.

## Part H — Interruption & Draft Honesty (§18–19)

- Pre-confirm wizard state is **component state** — the same class of honesty as the legacy OrderForm before save. Matrix, honestly:
  - Step navigation (forward/back) within the wizard: input preserved (VERIFIED in test OW8 and live probe).
  - Refresh / close / navigate away pre-confirm: input is **not** preserved, and the UI never claims otherwise — no "saved as draft" message appears anywhere.
  - No draft record is written to the store on interruption: `Order.status` includes `'draft'` (VERIFIED type union) but nothing in the repository creates drafts today; the wizard uses `'in_progress'` on confirm. Draft persistence is UNRESOLVED / future stage — no UI workaround pretending otherwise.
- Offline honesty (§25): all confirm-path operations are the app's existing local-store operations; no network claims are made. No fake sync/persistence copy exists in the component (grep-verified).

## Part I — Dependency Invalidation (§20)

- Traced contract: a measurement profile is attached by id and snapshotted at confirm; changing garment or design after selecting a profile does not silently mutate the profile. The wizard's cross-step dependencies are displayed, not guessed: the Review step always shows the *current* combination, so any stale combination is visible before confirm.
- Garment → measurement relevance: the 16 fields are all offered for every garment (advisory labels only). No hidden filtering by garment (that would hide contract limits) — relevance hints are a Part N follow-up.

## Part J — Workflow States & Navigation (§21–22, §29)

- Wizard state is component state, not DB enums (§21). Back navigation never discards entered values (§22, VERIFIED OW8). Back from step 1 exits to the Customer Workspace.
- Mobile-first: steps render full-width; the action bar is sticky at the bottom with safe-area padding and `--sf-touch-min` (≥44px) targets. Desktop centers the wizard (max-w-3xl).

## Part K — Progressive Disclosure (§23) & Roles (§27)

- Each step asks exactly one question; price/due date/notes appear only at Review, not earlier.
- Authorization reuses the existing tier system: customer creation is gated by `featureAccess.canCreateCustomer` inside the store's `addCustomer` (VERIFIED). No frontend-only security was added: the wizard calls the same gated context functions as the rest of the app; role checks are the server/store's job.

## Part L — Assets & Budgets (§33–34)

- Garment tiles use the 4 existing manifest card images (`/assets/garments/*-card-800.webp`) via `garmentImageSrc`; 7 tiles are honest text fallbacks. No new binary assets were added; P0 imagery remains VISUALLY PROVISIONAL per the manifest. Card/hero budgets unchanged from Stage 4 (no new imagery to weigh).

## Part M — AI Advisory (§24)

- Stage 8 introduces **no AI calls** in the wizard (advisory-only means: nothing added, nothing silenced). The Phase 17 production assistant remains reachable through its existing surfaces; its advisory (INFORM/WARN/SUGGEST/EXPLAIN/RECOMMEND) semantics and failure behavior are unchanged and protected (Part O).

## Part N — Dependency Table (§46) & Known Gaps

| # | Dependency / Contract | Class | Notes |
|---|---|---|---|
| 1 | `addOrder` returns order id (`string \| null`) | VERIFIED | AppContext:933; null → honest retry copy |
| 2 | `applyMeasurementProfileToOrder(orderId, profileId)` | VERIFIED | canonical snapshot path, unchanged |
| 3 | `addCustomer` returns `{success, error?}` (no id) | VERIFIED | wizard re-finds the created customer via identity match once context state updates (effect, Part G) |
| 4 | `addCustomer` tier gate `canCreateCustomer` | VERIFIED | BASIC limit error text surfaces verbatim |
| 5 | Garment taxonomy = 11 `GarmentType` values | VERIFIED | mandate text said 5; repository wins |
| 6 | `CustomerMeasurementProfile.profileType` / `label` / `measurements` | VERIFIED | profile cards use these fields |
| 7 | Wizard `productionStages: []` vs OrderForm `DEFAULT_PRODUCTION_STAGES` | **DIVERGENCE (deliberate)** | wizard promises no stage plan pre-planning; see Part G |
| 8 | `Order.status` includes `'draft'`; nothing creates drafts | VERIFIED | draft persistence UNRESOLVED (Part H) |
| 9 | Fabric yardage estimation | DEFERRED | Phase 15→16 later stage; UI labels stock as "on record" only |
| 10 | Garment→field relevance hints (which of the 16 apply) | PROPOSED | advisory help text; not built, no hidden filtering |
| 11 | `productionPlan` on new orders | VERIFIED null | nothing consumes it in this workflow |
| 12 | Design Studio internals | PROTECTED | entered contextually post-confirm; zero edits (Part O) |

## Part O — Protected-Surface Zero-Diff (§42)

`git diff 7787681 -- apps/web/src/components/DesignStudio.tsx apps/web/src/modules/services/patternEngine.ts apps/web/src/modules/services/productionAssistant.ts` → **empty** (verified in the completion report run). The workflow owns the path *around* the studio, never its internals.

## Part P — Test Suite (§36–37) & Type Gate (§38)

- New suite `tests/offline/phase18-stage8.test.tsx` (OW1–OW10 + sub-cases, 17 tests): entry handoff & customer header, garment grid + selection, manual capture + validation, profile select + review, design selection, materials list, review completeness, confirm persistence (addOrder + applyProfile called with the created id), customer-creation fallback incl. tier-limit error surfacing, error-copy honesty (no false success on null id), back-navigation preservation.
- `tests/offline/phase18-stage7.test.tsx` updated: OrderWorkflow stubbed in the harness so the Stage 7 entry test stays scoped to its own handoff (asserts the stub receives `data-customer`).
- Full suite: **226/226 passing (16 files)**; `npx tsc --noEmit` → 0 errors. Both run at final commit state.

## Part Q — Build, PWA & Responsive Validation (§39–41)

- `npx vite build` succeeds; service-worker precache 115 entries — `_originals` excluded (unchanged Stage 3 behavior).
- Live browser validation (DOM-level, Playwright against the dev server; not vision-based): full journey **login → Customers → customer → New order → kaftan → waist 74 → design → materials → review → Confirm** completed on **1440×900, 834×1000, 390×800**: workflow mounted with customer header, 11 garment tiles (4 with imagery), review reached, confirmed screen + Design Studio entry present, **0px horizontal overflow, 0 page errors** at all three widths. A stale-closure bug found by this live probe (newly created store customer not yet in the render's `customers` array) was fixed (Part G) — the exact failure mode browser validation exists to catch.

## Part R — Unresolved Decisions (§47)

1. **Draft persistence** — refresh/close pre-confirm discards input (honestly unstated as anything else). Whether to persist `status:'draft'` records is a product decision for a later stage; no backend contract exists today.
2. **Production-stage seeding at create** — wizard intentionally sends `[]` vs legacy `DEFAULT_PRODUCTION_STAGES` (Part N #7). Revisit when production planning (Phase 16 flow) is staged.
3. **Garment→measurement relevance hints** — advisory per-garment field hints proposed, not built.
4. **Authentic garment photography** — 7 of 11 tiles are text fallbacks; acquisition gap tracked in VISUAL_ASSET_MANIFEST §5.
5. **API-customer identity match** — re-finding a created customer uses fullName+phone; a store-level "return the created id" contract would remove the heuristic (documented, not invented).
