# Phase 18 — Stage 7: Customer & Workspace Experience
**Baseline:** Stage 6 `388ef15` → Stage 7 final (see log) · **Branch:** `arena/01a04eef-stitch-flow`
**Evidence classes:** VERIFIED · IMPLEMENTED · INFERRED · PROPOSED · UNRESOLVED.

## A. Baseline
`388ef15`, clean tree, correct branch, tags fetched (§38 protocol).

## B. Forensics (before)
**Customers (VERIFIED):** API-backed via `@shared/utils/customerApi` (getCustomers/createCustomer/updateCustomer; fields fullName/phone/email); search = name+email+phone client-side; create via `AddCustomerModal` (validation: name/phone required, email format; renders through a shared `ModalShell`); `CustomerOrdersModal` via `getCustomerOrders(id)`; `CustomerDetail` (Phase 13–16 measurement/design/pattern/production intelligence, offline store + context) opens contextually. **Dashboard (VERIFIED):** API `getDashboardSummary`/`getDashboardDataBundle`/`getPaymentsAnalytics` + store (customers, fabricRecords, low-stock); 940-line stats/insight layout; real data, no fabricated figures. **Contracts:** ApiOrder (orderNumber/status/garmentType/dueDate/totalAmount/currency…), ApiInvoice (status/dueDate/balanceDue/amountPaid/total, customerId), DashboardSummary (totalCustomers/totalOrders/pendingOrders/totalRevenue/pendingBalances/dueAlerts/currency).

## C. Customer architecture (IMPLEMENTED)
`src/modules/customers/CustomersView.tsx`:
- **List** — task rows (initials, name, phone-fallback), 44px targets, DS Surface; counts line; loading skeleton; honest error+retry; first-use and no-results empty states (Stage 4 illustrations: no-customers/no-orders/no-results).
- **Search** — single field over the three VERIFIED fields (name, phone, email); empty/partial/no-results defined; pure client filter (offline-safe against loaded data).
- **Create** — the existing validated `AddCustomerModal` reused (exported from Customers.tsx; behavior unchanged) → createCustomer → list refresh; ModalShell gained dialog semantics (role/aria-modal/labelled close — narrow a11y repair, its only change).
- **Customer workspace** (§10 hierarchy, IMPLEMENTED) — header (identity + contact + primary **New order** = Stage 8 handoff to the existing Orders surface, `data-handoff="stage8-orders"`); **Active work** (getCustomerOrders, honest error/retry, empty→order CTA); **Measurements & designs** = existing `CustomerDetail` reused verbatim below the header (Phase 13–16 preserved; profile-versioning note rendered: updating a profile never mutates a past order's snapshot — VERIFIED contract); back-navigation restores the list.

## D. Workspace architecture (IMPLEMENTED)
`src/modules/workspace/HomeView.tsx` — attention model over real data only: greeting/date; **L1 Urgent** overdue invoices (balance via formatCurrency, safeCurrency for code); **L2 Action required** due-today orders + low-stock materials; **L3 Active work** list (top 5); **L4 At a glance** (customers/materials from store, active orders, pending balances from summary); first-use empty state → Add customer. Every API section: skeleton → data or honest error ("Live figures unavailable… retry"); zero fabricated statistics (§17/§41).

## E. Responsive architecture
Validated live at 1440/834/390 (probe9): home sections, customer list/search, workspace, add-modal all functional; **0px page-level overflow at every width incl. customer workspace**; 56px mobile targets preserved; DS drawer/bottom-nav shell integration unchanged (Stage 6 contract intact).

## F. Offline behavior (evidence-based)
FULLY OFFLINE: customer search over loaded list; store-backed home figures (customers/materials counts); measurement profiles (offline store via CustomerDetail); all navigation. ONLINE REQUIRED (honest error + retry, never fake success): customer list load, customer orders, dashboard summary/orders/invoices. NO sync-state claims anywhere (no shell sync store exists — Stage 6 documented gap preserved).

## G. Authorization
No new permissions; no frontend-only security. All roles see Home/Customers (consistent with previous behavior — no per-view gates existed, VERIFIED). Backend remains authoritative. Demo role/tier tools untouched (account menu, Stage 6).

## H. Intelligence integration
Phase 13–16 surfaces consumed, not moved: CustomerDetail (measurement profiles + Design + Pattern + Production intelligence sections) renders inside the customer workspace — the contextual discovery path Stage 2 mandated. Phase 17 advisory rules unchanged (AiAdvisory primitive available; no AI writes, no silent modification — nothing new added here beyond existing surfaces). Engines and `DesignStudio.tsx` untouched.

## I. Visual implementation
Stage 5 primitives throughout (Surface, Section/Body/Label/Numeric, Button hierarchy, Input, Badge, Skeleton, EmptyState, ErrorState); semantic tokens only (no teal introduced — the reused legacy ModalShell retains its legacy styling, documented); Stage 4 illustrations bound via manifest-registered derivatives (`modules/workspace/assets.ts`); motion SUBTLE only; empty-state grammar followed (what/why/next + calm craft illustration).

## J. Testing
- `tests/offline/phase18-stage7.test.tsx` — CW1–CW9 (12 tests): attention model from real data, honest API-failure, first-use guidance, list+search (name/phone/email), no-results+clear, honest list failure+retry, empty state, customer workspace (identity/contact/active work/intelligence context/Stage-8 handoff), back navigation, create flow via reused modal contract.
- **Full suite 209/209** (197 Stage 6 baseline + 12). tsc clean. Production build clean (precache 115 entries / 6.42 MB).
- Browser (DOM-level, LIMITED — no vision): 3 widths × full journey — results in §E; 0 console errors.

## K. Migration (current → implemented)
Dashboard→HomeView (REPLACED content; old Dashboard.tsx retained on disk unreferenced — retirement deferred to owner). Customers list/detail flow→CustomersView + reused CustomerDetail (old Customers.tsx list retained; modal exported for reuse). AddCustomerModal→reused verbatim (+dialog semantics). No functionality removed (§40 honored): every old capability remains reachable — orders modal superseded by in-workspace Active Work with the same API; edit/delete customer remain available on the legacy screen path should the owner reinstate it (documented; not exposed in new list — noted as follow-up for owner decision).

## L. Known limitations
- Customer edit/delete actions from the old list are not yet surfaced in the new list (capabilities exist in `customerApi`; exposing them = small follow-up; legacy screen retained). UNRESOLVED (owner preference).
- Payments per customer shown via Finance only (invoice→customer linkage exists but a per-customer financial tab is Stage 8+/Finance-stage scope).
- ModalShell retains legacy visual styling (slate palette) — deliberate: reused validated behavior; visual refresh deferred to avoid scope creep (documented, not silent).
- DOM-level browser validation only (no vision); WCAG audit remains Stage 13.

## M. Stage 8 handoff
Stage 8 can assume: the shell (Stage 6), DS primitives + status language (Stage 5), the Home→Customers→Customer-context journey, "New order" handoff points (`data-handoff="stage8-orders"`), customer identity + measurement/design context via CustomerDetail contracts, and honest loading/error/offline patterns. Stage 8 owns: order wizard (Flow A/B), measurement workflow, design customization flow, and the contextual Design Studio entry (D2 retirement of the legacy sidebar entry).

## Integrity
DesignStudio.tsx, patternEngine.ts, productionAssistant.ts — **zero-diff (verified)**. No backend changes, no DB changes, no Phase 13–17 contract changes, no Stage 8/Phase 19–21 work, no unrelated refactors. Protected boundaries intact.
