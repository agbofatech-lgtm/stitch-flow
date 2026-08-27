# PHASE 1 STATUS — Type-System, Build Integrity & Architectural Wiring Recovery

**Branch:** `arena/01a04183-stitch-flow` (baseline `b576c3e`)
**Date:** 2026-08-27
**Note:** Phase 1 was executed twice — the first completed run was lost to a sandbox reset; this run replays the identical verified fix recipe. All gates re-validated from scratch.

| Gate | Result |
|---|---|
| Type-check (apps/web, `tsc --noEmit`, strict) | **PASS — 0 errors** |
| Type-check (apps/backend) | **PASS — 0 errors** |
| Build (web `vite build`) | **PASS** |
| Build (backend `tsc -p`) | **PASS** (`dist/app.js`, `dist/server.js`) |
| Build (root `npm run build`, all workspaces) | **PASS** |
| Smoke test (`apps/web/scripts/phase1-smoke.ts`) | **PASS — 13/13 checks** |
| Shortcut scan (Gate 3) | **PASS** — 0 new `any` / `@ts-ignore` / `@ts-nocheck` / `declare module` / `as any` |

**Errors Before:** 23 visible (3 syntactically corrupted files suppressed the semantic phase) → **238** once the parser was unblocked
**Errors After:** **0**

---

## Root causes fixed (in dependency order)

1. **Three corrupted files** (from the frozen session's interrupted batch edits):
   `src/types.ts` had been overwritten with a copy of `main.tsx`; `shared/api/materials.ts` and `shared/api/reports.ts` carried half-applied `Promise.race` fragments and truncated template literals. Restored faithfully (materials/reports to the house `fetch → check → json()` pattern used by their healthy siblings).
2. **React/JSX typing** — `@types/react@18` / `@types/react-dom@18` were absent; added to the `apps/web` workspace only, version-matched to React 18.2. No fake JSX namespaces.
3. **Vite env typing** — added `src/vite-env.d.ts` (`/// <reference types="vite/client" />`), fixing `import.meta.env` and `.png` module declarations properly.
4. **TS target/lib** — ES2020 → **ES2021** (exactly what `String.replaceAll` requires; matches Vite 7's evergreen-browser baseline; not a blind max upgrade).
5. **Module boundary repair** — 29 backend files (15 repositories incl. placeholders, 8 services, 6 zod schemas, `express.d.ts`, 3 utils) were stranded inside `apps/web/src`. They are the surviving originals of `apps/backend`'s 0-byte files. Moved via `git mv` into `apps/backend/src/`, aliases (`@modules/*`, `@shared/utils/*`) rewritten to backend-relative paths. This simultaneously fixed:
   - `Cannot find module '../config/db'` ×12 → repositories now resolve backend's canonical `config/db.ts` (no fake db stub created)
   - `@shared/utils/password|jwt|license` → backend `utils/` (empty husks recovered from the real implementations in `apps/api/src/shared/`)
   - **Zod "Expected 2-3 arguments"** — the schemas are zod-v3 code; web has zod 4, backend has zod 3. Relocation resolved it with **zero dependency changes** and validation semantics intact.
   - Server-only code (bullmq, bcrypt, Buffer, pg) no longer sits in the browser bundle graph — the frontend/backend environment boundary is restored; no secrets exposed to Vite.
6. **Backend env config** — extended `config/env.ts` with `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, token TTLs, `BCRYPT_ROUNDS`, device limits — all names/defaults from the existing `.env.example` (secrets remain required-without-fallback, same pattern as `DATABASE_URL`). JWT `expiresIn` strings narrowed via documented `SignOptions['expiresIn']` assertion (not `any`).

## Canonical Types Established (TYPE → CANONICAL LOCATION → CONSUMERS)

| Type | Canonical location | Consumers |
|---|---|---|
| **All domain types** | `apps/web/src/shared/types/index.ts` (74 exports) — `src/types.ts` restored as a pure re-export barrel | 19 files via `../types`, 4 module services via `../../types` |
| `CustomerMeasurementProfile` | shared/types — **nested**: metadata + `measurements: GarmentMeasurements` (+ `createdBy?` provenance) | CustomerDetail, OrderForm, mockData, AppContext, DesignStudio |
| `GarmentMeasurements` | shared/types — single flat measurement vocabulary (~40 fields; UI `wrist` maps to canonical `aroundWrist`) | pattern engine, production assistant, snapshots, profiles |
| `ExtendedMeasurements` | `patternEngine.ts` — extends `Partial<BodyMeasurements>` → `GarmentMeasurements`; resolves through the repaired barrel (no duplication) | patternEngine, DesignStudio, jobSheetExport |
| `ApiInvoice` / `InvoicePayload` / `ApiInvoiceLineItem` | `shared/api/invoices.ts` — rebuilt from backend `mapInvoiceRow` (runtime truth); status computed server-side, so the ignored `status` field was removed from the modal payload | Invoices, Dashboard, invoicePdf |
| `ApiOrder` | `shared/api/orders.ts` — rebuilt from backend `mapOrderRow` | Orders, Dashboard, Customers, Invoices, ProductionBoard |
| `ApiProductionStage` / `StageTransitionResult` | `shared/api/productionStages.ts` — rebuilt from backend `ProductionStageDto` + real route paths (`/orders/:id/production-stages/...`; the old client pointed at nonexistent `/stages/...` endpoints) | Orders, ProductionBoard |
| `ApiPayment` / `PaymentPayload` | `shared/api/payments.ts` — rebuilt from backend payment DTO | Invoices |
| `ApiWorkspaceMember` | `shared/api/workspaceMembers.ts` — rebuilt from backend `mapWorkspaceMember` | Settings |
| `AppSettings` | added to shared/types (was omitted from the barrel): typed key→JSON map matching `GET /settings` | shared/api/settings, Settings |
| `StageOverdueAlert` | shared/types (unchanged) — `checkOverdueStages` annotated `(stage): StageOverdueAlert \| null` + null-filter predicate; returns clean arrays | productionAlerts, ProductionBoard, Dashboard |
| `ProductionStageCode` | shared/types (unchanged) — API strings converted to `Date` at the mapping boundary | Orders, ProductionBoard, alerts |
| `MeasurementProfileType` | shared/types (closed union, unchanged) — legacy strings narrowed via `toMeasurementProfileType()` / `garmentTypeToProfileType()` in DesignStudio | DesignStudio, snapshots, orders |

## Infrastructure Repairs
React typings ✓ · JSX config ✓ · TS target/lib ES2021 ✓ · path aliases (tsconfig paths and vite aliases verified consistent; broken backend aliases removed with the relocation) ✓ · environment configuration boundary ✓ · database configuration reconnected ✓ · zod schemas on correct major version ✓ · Vite `ImportMeta.env` typing ✓ · `vite.config` `allowedHosts` for proxied preview ✓

## Business Logic Changed
- **NONE in substance.** Protected files touched only where Phase-1 defects demanded:
  - `patternEngine.ts`: import path fix + `notes` (a string) excluded from the numeric measurement map. **Pattern mathematics untouched** — verified by smoke test (all 5 draft generators produce geometry).
  - `productionAssistant.ts`: import path fix only.
  - `DesignStudio.tsx`: type guard narrowed to canonical `BodicePatternResult`; profile-type strings normalized to the closed union (unknown values collapse to `'custom'`); no UI/UX changes.
- Intent-preserving behavioral notes: `Invoices` no longer sends a `status` field the backend ignores; `OrderForm.profileToSnapshot` snapshots the full canonical measurement set instead of a drifted manual subset; unvalidated currency strings narrowed via the pre-existing `safeCurrency` helper.

## Remaining Errors
**None.** Both workspaces type-check and build clean.

## Remaining Architectural Risks (for later phases)
1. **P0 (pre-existing):** backend `dev`/`start` still run the mock `server.ts`; the real `app.ts` remains unmounted and the recovered auth/sync services are not yet wired to routes (route/controller/middleware files still empty). Phase 2 scope.
2. `apps/api/` orphan tree still duplicates some utils (kept as reference).
3. Pre-existing `any`s in recovered legacy code (10 occurrences, all in relocated backend repositories/services + `jobCardPdf(branding: any)`) — inherited, flagged for Phase 2 typing.
4. Migration runner missing; empty decoy migration files still shadow the real nested ones.
5. 1.1 MB unsplit web bundle; `.bak` files still in tree.
6. `updateProductionStage` client for a nonexistent endpoint was replaced by `addOrderProductionStageNote` matching the real route.
7. **Platform risk observed:** this workspace was reset once between sessions, losing a completed Phase 1. **Recommend pushing `arena/01a04183-stitch-flow` to GitHub immediately after each phase.**

## Phase 1 Recommendation
**READY FOR PHASE 2** — single coherent type system and build graph: one canonical type library, API contracts mirroring real backend DTOs, clean frontend/backend module boundary, green type-check/build/smoke gates on both workspaces.
