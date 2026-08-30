# Phase 18 — Stage 9: Contextual Intelligence Integration

**Status: IMPLEMENTED (Stage 9 of 14). Baseline commit `7a063a6` (Stage 8 completion).**
Evidence classes: VERIFIED (observed in repository/run), IMPLEMENTED (built this stage), PROPOSED (recommendation, not built), UNRESOLVED (owner decision/open gap).

---

## Part A — Baseline & Environment Incident

- Branch `arena/01a04eef-stitch-flow`; Stage 8 completion `7a063a6`; suite 226/226, tsc 0, build pass at baseline (re-run this session).
- **Incident (disclosed):** the sandbox was re-provisioned between Stage 8 and Stage 9. Local git was reset to the original base commit with all Stage 5–8 work as uncommitted files; `node_modules` and probe tooling were wiped (excluded from snapshots). Repaired by `fetch` + mixed reset to `7a063a6` (tree came back **bit-identical — 0 dirty entries**) and `npm ci`. No work lost; all baseline gates re-verified after repair.

## Part B — Source-of-Truth Matrix (§8, adjusted by repository evidence)

| Value | Source (repository) | Class | Mutable? | Snapshot? | AI may modify? |
|---|---|---|---|---|---|
| Body measurement | `CustomerMeasurementProfile.measurements` (canonical cm) | Deterministic | authorized workflow only | yes (order snapshot) | **No** |
| Measurement readiness | `patternAdapter.validateMeasurementCompleteness` | Deterministic | no (pure) | n/a | **No** |
| Garment→pattern kind | `patternAdapter.mapGarmentCategory` | Deterministic | no (pure) | n/a | **No** |
| Pattern result | `patternEngine` generators (5 kinds) | Deterministic | engine-controlled | order-dependent | **No** |
| Material requirement | `materialRequirementService.deriveMaterialRequirements` | Deterministic | calculation-controlled | yes | **No** |
| Fabric width | **NOT on `FabricRecord`** (VERIFIED `shared/types:580`); exists only as calculation input (`fabricConsumptionService.WidthInput`) | Deterministic input | data-controlled at calculation time | per calculation | **No** |
| Recommended consumption | `fabricConsumptionService.calculateFabricConsumption` (L0→L6 documented chain) | Deterministic | tailor overrides + reason (auditable) | yes | **No** |
| Fit-risk advisory | `productionAssistant.buildFitRiskWarnings` — **local, rule-based, zero network calls (VERIFIED)** | Advisory | no (pure) | n/a | n/a (no write path exists) |
| AI explanation/recommendation | Phase 17, on-device | Advisory | no | contextual | n/a |

Two mandate assumptions were **adjusted by evidence** (the mandate's own §8 rule): fabric width is *calculation input data*, not stored fabric data; and Phase 17 is a **local inference mechanism**, so §23's "AI online-required unless local inference exists" resolves to advisory = **OFFLINE-CAPABLE** (CI11 was implemented in its inverted, honest form).

## Part C — Context Chain (§5, repository-verified links only)

Customer → identity → measurement profile (`getCustomerMeasurementProfiles`) → measurements → **garment type** (11) → `mapGarmentCategory` → pattern kind (5) → completeness/readiness → inspiration (`analyzeDesignInspiration`) → `buildFitRiskWarnings` advisory → fabric record → width status (honest gap) → order snapshot (`applyMeasurementProfileToOrder` / manual `garmentMeasurements`) → frozen at confirm → Design Studio contextual entry (`order:{id}` draft keys — VERIFIED `DesignStudio.tsx:177,996`).

Links that exist but are **not yet wired into the wizard** (inputs not owned at order-creation time): `runPatternAdapter` (needs `DesignSpecification`), `deriveMaterialRequirements` (needs `PatternModel`), `calculateFabricConsumption` (needs `CuttingLayout` + width). The Materials card discloses these as the deterministic source ("pattern & cutting preparation") with the missing-data honesty the mandate requires — never a fabricated interim number.

## Part D — Surfaces Integrated (all composing Stage 5 primitives)

1. **Wizard · Measurements** (`data-intelligence="deterministic"`, `data-ready`): real readiness counts per garment, required-missing names, honest engine-mapping note for categories the engine maps to a foundation (e.g. order `trouser` → Phase 14 map keys `trousers`; `senator`/`bodice` fall back to bodice with the adapter's own warning text — VERIFIED `GARMENT_KIND_MAP`).
2. **Wizard · Materials** (`missing`): "cannot be finalized until fabric width is known"; allowance chain disclosed **by name** (from the Phase 16 pipeline docs); no estimate number ever rendered (CI5 asserts this).
3. **Wizard · Review** (`advisory`): Phase 17 fit-risk warnings with severity label (text, not colour), recommendation, provenance ("Based on: …"), dismissal, and an explicit "advisory only — never changes measurements/fabric/requirements" disclosure.
4. **Wizard · Confirmed** (`snapshot`): frozen order-snapshot card stating the §25 integrity rule (later profile edits never rewrite the order).
5. **Customer workspace** (`deterministic`/`missing`): one measurement-readiness card (latest profile, canonical field count, update-date chronology). The full intelligence surface stays in `CustomerDetail` — no duplication (§9.1).

## Part E — Silent-Mutation Prohibition (§18–§19, §40)

- The advisory path is **pure functions** — no write path exists (VERIFIED). Negative tests (CI9 + §40): with the advisory rendered, `addOrder` payload measurements are bit-identical, `applyMeasurementProfileToOrder` is not extra-invoked, captured inputs unchanged after dismissal + back-nav, and **no mutation action ever appears inside an intelligence card** (only Dismiss). Correct-flow example (§19) is structurally enforced: nothing in Stage 9 can recalculate requirements from the UI.

## Part F — Offline Classification (§22–§23, honest)

| Surface | Class |
|---|---|
| Measurement readiness (patternAdapter) | OFFLINE-CAPABLE (local pure engine) |
| Fit-risk advisory (productionAssistant) | OFFLINE-CAPABLE (local rule-based — mandate's "local inference exists" branch) |
| Fabric-width status / material card | OFFLINE-CAPABLE (honest missing-data text) |
| Fabric/inspiration/profile stores | local offline store (existing app architecture) |
| Customer list / orders API (workspace) | ONLINE-REQUIRED (existing Stage 7 honesty, unchanged) |

CI10/CI11 verify offline rendering with `navigator.onLine === false`; the suite also asserts no "synced" claim appears anywhere.

## Part G — Versioning & Context Integrity (§24–§26)

- Stable IDs everywhere (customer id, profile id, inspiration id, fabric id); never display-name inference.
- No version numbers exist on measurement profiles (VERIFIED: `createNewVersion` exists in the API service but the shared type carries no version field) → the UI shows **update-date chronology** and the tests assert no invented "v3" ever renders.
- `snapshotDrift()` ships as a pure utility for Stage 10 (production must consume the order snapshot, not the live profile); the confirmed screen states the freeze rule today.

## Part H — Authorization & Boundaries (§30–§32)

- No frontend-only security added: intelligence renders from the same context functions any role already uses; CI12 asserts no entitlement/permission surface appears in the intelligence UI. Backend/store authorization unchanged.
- Production sequence untouched (canonical 9 stages consumed only as existing `CANONICAL_STAGES` semantics; no workflow implementation). No finance surfaces.

## Part I — Protected Assets (§7, §42)

`git diff 7a063a6 -- …DesignStudio.tsx …patternEngine.ts …productionAssistant.ts` → **0 lines** (verified at completion). `DesignStudioAdapter.ts` (a non-protected adapter file) was read but **not modified** — the engineKey↔code translation table lives in Stage 9's adapter with provenance comments, because the two existing maps (`BODY_CODE_MAP` vs `KIND_MEASUREMENT_REQUIREMENTS`) disagree on two pairs and are per-kind ambiguous for `bust_circumference`; patternAdapter's own table is the authority used.

## Part J — Tests (§39–§41) & Type Gate

- New: `tests/offline/phase18-stage9.test.tsx` — CI1–CI15 + §40 negatives, **21 tests**, engines REAL (only context mocked; CI15 spies the real `validateMeasurementCompleteness` and cross-checks the rendered number against the engine's own answer).
- Full suite: **247/247 (17 files)**; `tsc --noEmit` → **0 errors**.

## Part K — Build, PWA & Browser Validation (§42–§43)

- `vite build` PASS; PWA precache unchanged behaviour (`_originals` excluded).
- Live browser validation (DOM-level; **visual art-direction approval pending** — no human vision claimed): full journey login → customers → customer → readiness strip → new order → garment → measurements (deterministic card) → design → materials (missing-data card) → review (advisory) → confirm (snapshot card) at **1440 / 834 / 390**: results in the completion report appendix below.

## Part L — Decision Register (§51)

| ID | Decision | Context | Status |
|---|---|---|---|
| D1 | Fabric width treated as calculation input, not fabric-record data | `FabricRecord` has no width (VERIFIED) | IMPLEMENTED (matrix adjusted per §8 rule) |
| D2 | Phase 17 classified OFFLINE-CAPABLE local advisory | zero network calls (VERIFIED); mandate's own §23 branch | IMPLEMENTED (CI11 inverted honestly) |
| D3 | "AI" branded as on-device advisory ("Advisory · on-device") | Phase 17 is deterministic rule-based; §35/§49 forbid fake AI mystique; existing UI convention is "Assistant" | IMPLEMENTED |
| D4 | Kind-translation table lives in Stage 9 adapter with provenance | two existing repo maps disagree on 2 pairs; patternAdapter table authoritative; protected files untouched | IMPLEMENTED |
| D5 | Wizard does NOT precompute consumption/requirements | requires DesignSpecification/PatternModel/CuttingLayout not owned at order creation; honesty over theatre | IMPLEMENTED (disclosed in card) |
| D6 | `snapshotDrift` shipped as utility, surfaced for Stage 10 | drift cannot occur at confirm-time; production surfaces own later comparison | IMPLEMENTED (util) / Stage 10 |
| D7 | Readiness strip in workspace vs CustomerDetail duplication | §9.1 forbids duplicating CustomerDetail | IMPLEMENTED (one card only) |

## Part M — Unresolved Decisions (§47)

1. **Fabric width acquisition** — the library needs a width field (and composition/weight) on `FabricRecord`, or a width-capture step before cutting; backend contract decision.
2. **Phase 14/18 taxonomy seam** — order domain `trouser`/`bodice`/`senator` are not engine map keys (`trousers` is); UI is honest today; a canonical mapping decision belongs to the engine owner.
3. **Version numbers on profiles** — service has `createNewVersion`, types carry none; product decision.
4. **Advisory naming** — "Assistant" (43 existing uses) vs Stage 9's explicit "on-device advisory" labelling; unify in Stage 13 pass.

## Part N — Stage 10 Handoff (§56)

Stage 10 may consume: customer context (workspace strip), readiness + kind mapping (`measurementReadiness`), advisory (`fitRiskAdvisory`, pure), fabric-width status + allowance-chain names, `snapshotDrift` (order snapshot vs current profile), the canonical 16-field list, and the frozen order snapshot semantics. Stage 10 owns production workflow, stage transitions, production workspace, fitting/rework UI — untouched here.

## Part O — Completion Gates

Tests 247/247 · tsc 0 · build PASS · browser 1440/834/390 (below) · protected zero-diff 0 lines · STOP after this report — no Stage 10 work.

### Appendix — Browser validation results (DOM-level, live app)

Environment honestly noted: after the sandbox re-provision the validation stack was rebuilt from repository assets only — embedded PostgreSQL 18.4 (`embedded-postgres`, the repo's own test pattern) + backend (`apps/backend`, migrations applied) + vite dev server; a validation account and one customer were created through the real API. Journey: login → customers → customer (workspace readiness strip) → New order → kaftan → measurements → design → materials → review → confirm.

| Width | workspace strip | deterministic card (real engine text "1 of 3 required … kaftan pattern", data-ready=false) | missing-data card ("cannot be finalized until fabric width is known") | advisory card ("Advisory · on-device") | snapshot card ("Frozen at confirm") | overflow | page errors |
|---|---|---|---|---|---|---|---|
| 1440×900 | ✓ (missing — no profile yet, honest) | ✓ | ✓ | ✓ | ✓ | 0px | 0 |
| 834×1000 | ✓ | ✓ | ✓ | ✓ | ✓ | 0px | 0 |
| 390×800 | ✓ | ✓ | ✓ | ✓ | ✓ | 0px | 0 |

Classification: **DOM/browser validated; visual art-direction approval pending** (no human vision claimed — §43). Fresh workspace ⇒ the workspace strip honestly shows the "missing" variant (no measurement profile on this device).
