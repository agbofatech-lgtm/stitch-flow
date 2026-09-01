# 10 — Known Gaps and Conditions Register

**Date:** 2026-09-01  
**Rule:** classify evidence. Do not fix. Do not rank by excitement.

Classes: **CRITICAL BLOCKER** · **ARCHITECTURAL GAP** · **TRANSITIONAL CONDITION** · **INHERITED DEFECT** · **TECHNICAL DEBT** · **DOCUMENTATION DRIFT** · **FUTURE PROGRAMME**

“CRITICAL BLOCKER” here means blocked for **production SaaS launch**, not blocked for owner laptop UI inspection (laptop report: none for UI inspection).

---

| ID | Item | Class | Evidence |
|---|---|---|---|
| G01 | AppContext / localStorage remains shop SoT | TRANSITIONAL CONDITION | `AppContext.tsx`, `shared/lib/db.ts`, ADR-002 target unmet |
| G02 | T2 runtime started but not product SoT | TRANSITIONAL CONDITION | `main.tsx` `startDataAuthorityRuntime`; Orders/Studio ignore repos |
| G03 | Unmounted business CRUD (default) | TRANSITIONAL CONDITION / launch blocker | `MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES` default false; T1 STOP D |
| G04 | Dual customer shapes / populations | ARCHITECTURAL GAP | AppContext `Customer` vs HTTP `ApiCustomer` |
| G05 | `apps/web/src/types.ts` is `main.tsx` | INHERITED DEFECT | 10-line bootstrap file; real types in `shared/types/index.ts` |
| G06 | Web TypeScript `tsc --noEmit` FAIL | INHERITED DEFECT | `materials.ts`, `reports.ts`, `types.ts` — pre-existing; backend tsc PASS |
| G07 | `apps/api` orphan | TECHNICAL DEBT | no package.json; never started |
| G08 | Nested untracked `stitch-flow/` duplicate | TECHNICAL DEBT | older T0-stub tree; not a workspace |
| G09 | Duplicate Capacitor identities | TECHNICAL DEBT | `com.tailorstudio.app` vs `com.stitchflow.app` |
| G10 | Stale T3 `ownership.ts` (billing / control unassignable) | DOCUMENTATION DRIFT | P19 implemented those planes; T3 file frozen |
| G11 | PostgreSQL not verified / 006 not applied | ARCHITECTURAL GAP | `/ready` `postgres: not-verified`; empty 002–005; missing migrate script |
| G12 | Live PSP deferred; no provider selected | ARCHITECTURAL GAP | adapter `test`; `PROVIDER_DEFERRED` |
| G13 | Pricing unresolved (`amountMinor: null`) | ARCHITECTURAL GAP | `catalog.ts`; dual folklore GHS vs USD |
| G14 | FeatureGate UX-only; atelier unused access/check | TRANSITIONAL CONDITION | FeatureGate comment; ADR-006 |
| G15 | Logout / refresh not implemented on P19 path | ARCHITECTURAL GAP | P19.11 identity PASS with this note |
| G16 | Offline commercial / entitlement semantics | UNKNOWN / TRANSITIONAL | no indefinite bypass claimed; not proven |
| G17 | ~1 MB main bundle | TECHNICAL DEBT | 1016.24 kB / gzip 294.04 kB; Studio not code-split |
| G18 | PWA / service worker | INHERITED DEFECT | manifest TailorPro; no SW architecture |
| G19 | Design Studio fixed canvas / internals | TRANSITIONAL CONDITION | protected monolith; PEX framed only |
| G20 | Trusted core not exclusive Studio path (T10 C1) | TRANSITIONAL CONDITION | DesignStudio → T7 re-export |
| G21 | Hip/bust default 98/100/102 unresolved | TRANSITIONAL CONDITION | T10 C2; inventory only |
| G22 | Screenshot / a11y lab limitations | TRANSITIONAL CONDITION | PEX visual regression NOT TESTABLE |
| G23 | `src` ≠ checked-in `dist` | CRITICAL BLOCKER for `npm start` / Docker | dist mounts surfaces absent from src |
| G24 | Production-stage path mismatch | INHERITED DEFECT | Orders `/stages` vs backend `/production-stages` |
| G25 | Dual order / invoice SoT across screens | ARCHITECTURAL GAP | document 03 |
| G26 | Canvas px/cm, PDF visual equivalence | UNKNOWN | T10 C3–C4 |
| G27 | Live LLM not verified | UNKNOWN | P17 local interpreter default |
| G28 | No URL router | TECHNICAL DEBT | `currentView` enum |
| G29 | CORS `origin: true` | ARCHITECTURAL GAP (security) | `app.ts`; `CORS_ORIGIN` unused |
| G30 | No HTTP operator grant / no bootstrap admin | ARCHITECTURAL GAP | security tests expect 404 |
| G31 | Empty backend workers / unused Redis/BullMQ on live path | TECHNICAL DEBT | `jobs/*.ts` empty |
| G32 | `docs/api.md` `/api/v1` | DOCUMENTATION DRIFT | not mounted |
| G33 | T0 runtime/data maps describe stub era | DOCUMENTATION DRIFT | see HISTORICAL_DRIFT_INDEX |
| G34 | Uncommitted WorkflowContext stub | INHERITED DEFECT (working tree only) | `getDataAuthorityRuntime = () => null`; not in HEAD |
| G35 | Phase 19 owner acceptance pending; no tag | TRANSITIONAL CONDITION | P19.11 |
| G36 | PEX owner acceptance pending | TRANSITIONAL CONDITION | P9/P10 register unticked |
| G37 | 3D | FUTURE PROGRAMME | ADR-005; NOT STARTED |
| G38 | Phase 20 | FUTURE PROGRAMME | LOCKED |
| G39 | Authenticated shop API | FUTURE PROGRAMME | requires owner auth decision before mount |
| G40 | Shop invoices path vs `/payments` | INHERITED DEFECT | client/server contract mismatch recorded in T0 |

---

This register does not authorize work. See document 11 for legitimate programmes and their stop conditions.
