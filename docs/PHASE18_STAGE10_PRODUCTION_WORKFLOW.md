# Phase 18 — Stage 10: Production Workflow & Financial Operations Integration

**Status: IMPLEMENTED. Baseline `9440a13` (Stage 9 accepted).**
Evidence classes: VERIFIED (repository/run evidence), IMPLEMENTED (built this stage), PROPOSED, UNRESOLVED.

---

## Part A — Executive Summary

Stage 10 turns confirmed orders into two independent operational domains. **Production** (`modules/production/ProductionView.tsx`): a canonical-lifecycle board + detail workspace over the backend's verified state machine (start/complete/skip/reopen, auto-advance, reopen cascade, audit events, lazy seeding). **Finance** (`modules/finance/FinanceView.tsx`): an operations workspace over backend-authoritative invoice figures and the transactional idempotent payment contract. Production state ≠ payment state — structurally, in the UI, and in tests (X1–X5). No delivery-payment gate exists in the backend and none was invented.

## Part B — Baseline Verification

Branch `arena/01a04eef-stitch-flow`; Stage 9 tip `9440a13` verified (fetch + log); clean tree; **247/247 tests, tsc 0, build PASS** before any change (recorded pre-implementation). Validation stack live: embedded PostgreSQL 18.4 + backend (dev) + vite.

## Part C — Production Domain Forensics (all VERIFIED)

- Canonical stages + status enum: `shared/types` `ProductionStageCode` (9) / `ProductionStageStatus` (pending/active/completed/skipped); stage rows carry `startedAt/completedAt/skippedAt/reopenedAt/notes`.
- **Backend state machine** `productionStageService.ts` (`transitionOrderProductionStage`): rules below; every transition writes an audit row (`order_production_stage_events` with action, from/to status, note, actor); `syncOrderStageSnapshot` derives order status from stages.
- Routes: `GET/POST /orders/:id/production-stages[...]/transition|note` behind `authMiddleware + requireWorkspace` (backend-enforced; visibility ≠ authorization preserved — no frontend gate added).
- Web mirrors: `shared/api/productionStages.ts` (consumed verbatim; no second client).
- **Lazy initialisation VERIFIED**: `getOrderProductionStages` calls `ensureOrderProductionStages` → seeds all nine from order status. Stage 8's `productionStages: []` divergence is thereby reconciled: the wizard creates none; production seeds them on first touch (P1 resolved by evidence).

## Part D — Finance Domain Forensics (all VERIFIED)

- `Invoice`: `totalAmount/amountPaid/balanceDue/status` — **backend-computed**; `InvoiceStatus` = draft|sent|partial|paid|overdue|void (web union) and the live API also returns **`pending`** (observed; mapped honestly in the UI).
- `POST /payments`: transaction with `SELECT … FOR UPDATE` row lock; **over-payment rejected** ("Payment exceeds invoice total", audited); status recomputed paid/partial; **idempotent** — replayed `clientMutationId` returns the original payment with `duplicate: true`.
- Offline payment path (pre-existing, reused): `submitPaymentWithOfflineFallback` — network failure queues locally with the SAME idempotency key; HTTP 4xx is final and never queued.
- Duplicate safety (FN10/§45): server-side idempotency + row locking (VERIFIED); the UI surfaces replays honestly and never claims a second success.
- `GET /payments`, `GET /payments/invoice/:id` exist; invoice CRUD (`createInvoice/updateInvoice`) reused via the legacy `InvoiceModal` (exported, not duplicated — the Stage 7 `AddCustomerModal` pattern).

## Part E — Canonical Production Lifecycle (VERIFIED, unchanged)

`measurement → cutting → sewing → embroidery → first_fitting → second_fitting → final_press → ready → delivered`

All nine render individually; the board's visual **Fitting group** holds `first_fitting` + `second_fitting` as distinct cards/rows with their canonical codes (PW1–PW3, PW7). No stage deleted, merged, renamed, reordered; no parallel lifecycle.

## Part F — Production State Architecture (§6 transition table, from service code)

| Current | Allowed next (action) | Backward | Enforcement | Evidence |
|---|---|---|---|---|
| pending (current open) | → active (`start`) | — | service throws otherwise | `productionStageService.ts:326` |
| active (current open) | → completed (`complete`); next pending auto-activates | — | service | `:345` |
| pending\|active (current open) | → skipped (`skip`); next auto-activates | — | service | `:410` |
| completed | → pending (`reopen`) | **yes — cascade: reopens target and every later stage** | service | `:460` |
| skipped | → pending (`reopen`) | yes (same cascade) | service | `:460` |
| any non-open stage | start/skip rejected | via reopen only | service errors surfaced in UI | `:326,415` |

Rework therefore **exists** (reopen cascade) — implemented faithfully with an explicit consequence confirmation. Skip is verified. Order status is derived server-side; the UI consumes the returned status.

## Part G — Production Workspace (IMPLEMENTED)

Board: eight visual groups (Fitting = two canonical stages), cards showing customer, order number, garment, due date (real), open-stage badge, payment-status badge (from the invoice contract; honest "no invoice"), search + stage filter (client-side, honestly so). Detail: header, ActionBar with **destination-named transitions** ("Complete Sewing — Embroidery becomes active"), skip/reopen confirmations stating consequences, nine-stage timeline (shape + text status, canonical codes, real timestamps, per-stage notes via the note endpoint), current-stage note editor, Stage 9 intelligence (snapshot context, drift, fit-risk advisory — read-only), financial **context** card. Terminal orders show "No open stage" with Reopen only — no fabricated forward actions (PW6b). Priority/assignment/completion-% are NOT shown — no repository fields exist (§47; none invented).

## Part H — Stage Transition Semantics

Every action names current → destination; skip states the skipped timestamp + next activation + reopen path; reopen states the full cascade. Success consumes the authoritative server response (no optimistic mutation). Backend rejections surface verbatim with retry ("Only an active stage can be completed" — tested).

## Part I — Fitting Workflow

`first_fitting`/`second_fitting` remain distinct canonical stages; notes captured per stage via the verified note endpoint. Fitting **observations never mutate** measurements/design/snapshot — the note editor is explicitly a record; changes follow the authorized review path in the customer workspace (stated in-UI).

## Part J — QC / Rework Findings

- QC infrastructure: **none exists** beyond transition confirmation + notes (VERIFIED absence) → nothing fabricated; documented UNRESOLVED for product (D3).
- Rework: reopen cascade (Part F) — verified and implemented.

## Part K — Finance Architecture (IMPLEMENTED)

Independent domain: money expected / received / outstanding (presentational sums of authoritative per-invoice fields), status semantics with icon+text (never colour alone), filter tabs (all/outstanding/paid/overdue) + search, honest empty/loading/error states, invoice create/edit via reused `InvoiceModal`.

## Part L — Invoice & Payment Lifecycle

Recording a payment: validated client-side (positive amount, method, reference required) → `submitPaymentWithOfflineFallback` with a fresh `clientMutationId` → outcomes rendered honestly: confirmed (server transaction), **duplicate acknowledged** ("already recorded — nothing was recorded twice"), queued-offline ("submitted once online; cannot be recorded twice"), or rejection (error shown, dialog stays, **no success** — FN9). Figures refresh from the server after confirmation.

## Part M — Production ≠ Finance Boundary (§22 matrix, tested X1–X5)

Ready+Unpaid ✓ representable · Paid+in-production ✓ · Delivered+any-financial-state ✓ (no gate). The two domains share only the ORDER id; production shows finance as context ("never blocks or advances a stage here"), finance never shows production state. Both independence directions unit-tested (FN4/FN5/FN6).

## Part N — Delivery Policy Gate

**UNRESOLVED — no policy exists in the backend** (VERIFIED absence: `transitionOrderProductionStage('delivered','complete')` performs no payment check; payment routes touch no production state). Delivery is a pure production action; unpaid delivery remains representable. Any "hold garment until balance paid" rule is a product decision → proposed representation (policy CHECK at delivery, never state merging) is documented, not implemented (D4).

## Part O — Stage 9 Intelligence Integration

Consumed read-only: measurement readiness context (order snapshot), `snapshotDrift` ("Customer measurements have changed since this order was confirmed — production reads the snapshot"), fit-risk advisory from the snapshot. Advisory cards contain **zero** production/financial actions (X5); deterministic/advisory visual distinction retained (Stage 9 `IntelligenceCard`).

## Part P — Snapshot & Drift Semantics

Production reads `order.measurementSnapshot` (frozen at confirm); drift vs the customer's current profile is **surfaced, never applied** (X6). Fitting notes and stage records never rewrite the snapshot.

## Part Q — Garment Taxonomy Compatibility

Untouched this stage: production displays the order-domain garment verbatim (no translation needed — no pattern operations here). The single authoritative adapter remains Stage 9's `orderIntelligence` (documented seam: order `trouser` vs engine `trousers`; kind table authoritative). No scattered translations introduced.

## Part R — Offline Classification (evidence-based)

| Operation | Class | Evidence |
|---|---|---|
| Board/detail reads, transitions, notes, stage seeding | ONLINE-REQUIRED (API) | routes require auth+workspace |
| Invoice/payment reads, payment write | ONLINE-REQUIRED; network-failure **queue** with idempotency key (pre-existing contract) | `submitPaymentWithOfflineFallback` |
| Stage 9 readiness/advisory/drift in production | OFFLINE-CAPABLE (local pure) | Stage 9 VERIFIED |
| Connectivity display | `navigator.onLine` only; no sync claims | §33 respected |

## Part S — Authorization Boundaries

Backend: `authMiddleware + requireWorkspace` on orders/invoices/payments; workspace-scoped queries. Frontend: no new gating, no entitlement surface (tested — CI12 discipline carried over). Roles: none re-invented.

## Part T — Accessibility & Responsive Behavior

Non-colour status everywhere (shape/icon + text), labelled controls, keyboard-reachable actions, focus-visible patterns from Stage 5, dialogs with `role="alertdialog"`/`aria-modal` + explicit Cancel, ≥44px targets. **Discovered + fixed (justified by §49):** the Stage 6 mobile bottom bar kept only the first four primary destinations and the More sheet listed only secondary — Finance (5th primary) was unreachable at 390px despite the sheet's own copy claiming otherwise. Overflow primaries now render in the More sheet (Workspace group); shell suite still green. Validated 1440/834/390 — 0px overflow, 0 console errors each.

## Part U — Testing

New `tests/offline/phase18-stage10.test.tsx`: **27 tests** — PW1–PW15 (+PW6b terminal state), FN1–FN12, X1–X5. Views real; only the API layer mocked to verified contracts. Full suite: **274/274 (18 files)**; `tsc --noEmit` 0 errors.

## Part V — Browser Validation (live app, real backend, DOM-level)

Journey per width: login → Production → board (8 groups, real card) → delivered-state honesty → fresh order detail (9-stage timeline, snapshot card, financial context) → **real transition** ("Complete Sewing — Embroidery becomes active", server-authoritative) → Finance → invoice row → **real payment** (100 of 500) → confirmed → balance 400 → overflow/console check. Each width self-seeded a fresh order + invoice via the real POST contracts.

| Width | groups | 9 stages | snapshot | fin-context | transition | payment | balance | overflow | errors |
|---|---|---|---|---|---|---|---|---|---|
| 1440×900 | 8 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0px | 0 |
| 834×1000 | 8 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0px | 0 |
| 390×800 | 8 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0px | 0 |

Classification: DOM/browser validated; visual art-direction approval pending (§43). Environment note: login rate-limiting (5/15min, VERIFIED `authRateLimit`) and 15-minute access tokens shaped probe logistics only — no product claim made from them.

## Part W — Performance

No new binary assets; PWA precache 115 entries (unchanged), `_originals` excluded; build PASS (10.4s). No polling; stage reads bounded (one seeding GET per stage-less order per load, memoised).

## Part X — Protected Asset Verification

`git diff 9440a13 -- …DesignStudio.tsx …patternEngine.ts …productionAssistant.ts` → **0 lines**.

## Part Y — Known Limitations (genuine only)

1. Delivery-payment policy — UNRESOLVED (product decision; Part N).
2. QC gates beyond transition confirmation — UNRESOLVED (no infrastructure; Part J).
3. Payment duplicate-safety relies on the caller supplying `clientMutationId` (the UI always does; contract documented).
4. Web `InvoiceStatus` union lacks backend's `pending` (mapped in UI; type reconciliation deferred to backend contract owner).
5. Fitting-specific structured records (adjustment lines) do not exist — only stage notes (VERIFIED); deeper fitting workflows are a product decision.
6. Board reads are online-required; no offline board cache exists (honest error + retry).

## Part Z — Stage 11 Handoff

Application is operationally coherent: customer → order → intelligence → production → finance, all on verified contracts. Stage 11 (Public Landing) may reference: verified capabilities (offline-first tailoring operations, measurement intelligence, production lifecycle, finance tracking), the Stage 5 visual system + approved asset manifest, and MUST NOT expose internal operational data or Finance/Production internals. No Stage 11 work performed.

## Decision Register

| ID | Title | Context | VERIFIED | Options | Default taken | Rationale | Impact | Blocking stage |
|---|---|---|---|---|---|---|---|---|
| P1 | Production initialization | `ensureOrderProductionStages` seeds lazily | ✓ | seed at confirm vs lazy GET | lazy (consume) | backend contract; no divergence left | Stage 8 `[]` reconciled | — |
| P2 | Backward/rework transitions | reopen cascade verified | ✓ | none needed | implement as-is | repository authority | rework UX honest | — |
| P3 | QC strictness | no QC infra | absence ✓ | invent vs document | document UNRESOLVED | §13 prohibition | future stage | Stage 10+ owner |
| P4 | Delivery-payment policy | no gate in backend | absence ✓ | invent gate vs policy-check pattern | UNRESOLVED + PROPOSED pattern | §23 forbids invention | unpaid delivery representable | owner decision |
| P5 | Payment recording | transactional idempotent POST | ✓ | new UI vs reuse | reuse + honest outcomes | §20/§45 | — | — |
| P6 | Taxonomy authority | single adapter (Stage 9) | ✓ | scatter vs centralize | centralize (untouched here) | §53 | — | — |
| P7 | Snapshot drift | drift surfaced, never applied | ✓ | auto-update vs surface | surface only | §26/§27 | — | — |
| P8 | Finance offline writes | queue w/ idempotency key exists | ✓ | claim offline-first vs classify | classify honestly | §32/§33 | — | — |
| D-shell | Mobile Finance reachability | bottom bar dropped 5th primary | ✓ (live) | ignore vs More-sheet overflow | fix (More sheet) | §49 mandate | shell surface touched, documented | — |

## State Architecture Diagram (domain coordination, NOT state merging)

CONFIRMED ORDER → { PRODUCTION DOMAIN (canonical stage machine) ∥ FINANCIAL DOMAIN (invoice/payment machine) } → POLICY CHECK *(none exists — UNRESOLVED, Part N)* → DELIVERY (production action only today).
