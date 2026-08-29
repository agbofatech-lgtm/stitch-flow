# PHASE 17 — AI TAILORING INTELLIGENCE
## STAGE 0 — FORENSICS & AI ARCHITECTURE AUDIT

**Status:** Stage 0 complete — audit only, no AI implementation code written.
**Date:** 2026-08-29
**Branch:** `arena/01a04e01-stitch-flow`
**Baseline HEAD:** `9bddf6f4642157f129d04a74f493295725706ace`

> **Discipline note.** Every claim in this report was re-verified by direct command
> execution against the working tree. Historical test counts and prior handoff
> claims were treated as *unverified assertions* until independently reproduced.
> Two inherited claims were found to be **false** and are corrected in §A and §E.

---

## A. AUTHENTIC BASELINE CONFIRMATION

### A.1 — Inherited claims vs. observed reality

The Phase 17 authorization supplied a baseline description. Auditing it first
(as instructed: *"audit, do not assume"*) surfaced **two material discrepancies**.

| Claim in authorization | Observed | Verdict |
|---|---|---|
| HEAD = `9bddf6f` | Session opened at `b576c3e` | ❌ **FALSE at session start** |
| Branch = `arena/01a04dda-stitch-flow` | No such branch exists on origin | ❌ **FALSE — branch never existed** |
| Working tree CLEAN | Clean | ✅ true |
| Phase 15 baseline `14b6b54` | `14b6b5451862e4c82cc66868841be675e18ceddf` | ✅ true |
| Phase 16 complete `8f56413` | `8f5641330af939e23c59f618de279ed135942184` | ✅ true |
| Phase 16 cert recovery `5626178` | `5626178c9ff084e737e40092a57f89e5a943cf5c` | ✅ true |
| Protected IP ZERO DIFF | Re-verified fresh | ✅ true (§D) |
| Phase 17 NOT STARTED | No phase-17 refs anywhere | ✅ true |

### A.2 — Root cause of the HEAD discrepancy

This session was provisioned as a **shallow clone of `main`**, not of the Phase 16
work branch:

```
$ git rev-parse HEAD
b576c3e6f5a4d7aac08ef75de47cf6235a2ed619

$ cat .git/shallow
b576c3e6f5a4d7aac08ef75de47cf6235a2ed619

$ git rev-list --all --count
1
```

`main` still points at the original scaffold commit (`Initial Stitch Flow project`,
2026-08-26). All Phase 1–16 work lives on the `arena/*` session branches and was
**never merged to `main`**. The session branch `arena/01a04e01-stitch-flow` was
therefore branched from the scaffold, one commit deep, containing *none* of Phases 1–16.

The authorization's branch name (`arena/01a04dda-stitch-flow`) does not exist:

```
$ git ls-remote origin 'refs/heads/arena/01a04dda*'
(no output — branch does not exist)
```

The commit `9bddf6f` is real, but lives on a **different** branch:

```
$ git ls-remote origin | grep 9bddf6f
9bddf6f4642157f129d04a74f493295725706ace  refs/heads/arena/01a04d15-stitch-flow
```

So the prior session was `01a04d15`, not `01a04dda` — a transcription error in the handoff.

### A.3 — Recovery performed (lossless, non-destructive)

Before acting, safety was proven: the session branch had **zero unique commits**,
so adopting the authentic history is a pure fast-forward with nothing to lose.

```
$ git fetch --unshallow origin && git fetch --tags origin
$ git log --oneline 9bddf6f..HEAD      # commits I would lose
(empty — zero unique commits)
$ git rev-list --count HEAD..9bddf6f   # commits I would gain
84
$ git merge --ff-only 9bddf6f4642157f129d04a74f493295725706ace
```

**No `reset --hard`, no force operation, no history rewrite, no branch deletion.**
A fast-forward was provably safe and was the minimal sufficient action.

**Post-recovery state:**

```
$ git rev-parse HEAD
9bddf6f4642157f129d04a74f493295725706ace   ✅ matches authorized baseline

$ git status --porcelain
(empty — CLEAN)

$ git log --oneline -3
9bddf6f docs(phase16): align browser certification with stop-loss directive
5626178 docs(phase16): final certification and recovery report
44e8d75 test(production): upgrade F73-F77 to real-DOM contracts
```

✅ **Authentic baseline is now genuinely present in the working tree**, with the full
84-commit ancestry and all 100+ historical tags — not merely asserted.

> ⚠️ **Governance flag for the operator.** Phase 17 work continues on
> `arena/01a04e01-stitch-flow` (this session's fixed branch), which now carries the
> full authentic history. Note that `main` remains at the scaffold commit — the
> project's entire Phase 1–16 history exists **only on session branches**. This is a
> standing single-point-of-failure risk; see §M-R1.

---

## B. GIT / TAG VERIFICATION

### B.1 — Phase 16 tags unchanged

All Phase 16 tags verified locally *and* against the remote — **byte-identical SHAs**:

| Tag | Resolved commit | Remote match |
|---|---|---|
| `phase-16-forensics` | `5b8ff44c7ddd21f738c1d66d534df122f171d9dd` | ✅ |
| `phase-16-domain-contracts` | `8f5641330af939e23c59f618de279ed135942184` | ✅ |
| `phase-16-storage` | `8f5641330af939e23c59f618de279ed135942184` | ✅ |
| `phase-16-fabric-consumption` | `8f5641330af939e23c59f618de279ed135942184` | ✅ |
| `phase-16-materials` | `8f5641330af939e23c59f618de279ed135942184` | ✅ |
| `phase-16-purchasing` | `8f5641330af939e23c59f618de279ed135942184` | ✅ |
| `phase-16-cutting-execution` | `8f5641330af939e23c59f618de279ed135942184` | ✅ |
| `phase-16-production-workflow` | `8f5641330af939e23c59f618de279ed135942184` | ✅ |
| `phase-16-production-readiness` | `8f5641330af939e23c59f618de279ed135942184` | ✅ |
| `phase-16-quality-control` | `8f5641330af939e23c59f618de279ed135942184` | ✅ |
| `phase-16-api` | `8f5641330af939e23c59f618de279ed135942184` | ✅ |
| `phase-16-ui` | `8f5641330af939e23c59f618de279ed135942184` | ✅ |
| `phase-16-complete` | `8f5641330af939e23c59f618de279ed135942184` | ✅ |
| `phase-16-certification-recovery` | `5626178c9ff084e737e40092a57f89e5a943cf5c` | ✅ |
| `phase-15-complete` | `14b6b5451862e4c82cc66868841be675e18ceddf` | ✅ |

**No Phase 16 tag was altered, moved, or deleted.**

### B.2 — Phase 17 confirmed not started

```
$ git tag -l 'phase-17*'
(empty)
$ git log --all --oneline --grep='phase.17' -i
(empty)
```

✅ Clean slate confirmed.

---

## C. FRESH TEST BASELINE

Historical counts were **not** accepted. Dependencies were absent (`node_modules`
missing in root, `apps/web`, `apps/backend`), so the environment was built from
scratch and both suites executed live.

### C.1 — Install

```
$ npm install --no-audit --no-fund
added 1057 packages in 17s        (exit 0)
```

### C.2 — Web suite (Vitest)

```
$ npm --workspace=apps/web run test
```

| Test file | Tests |
|---|---|
| `tests/offline/phase16-production.test.tsx` | 31 |
| `tests/offline/phase15-pattern.test.ts` | 34 |
| `tests/offline/syncEngine.test.ts` | 17 |
| `tests/offline/design.test.ts` | 16 |
| `tests/offline/repositories-queue.test.ts` | 12 |
| `tests/offline/measurements.test.ts` | 11 |
| `tests/offline/database.test.ts` | 6 |
| `tests/offline/platform.test.ts` | 5 |
| `tests/offline/router.test.ts` | 4 |
| `tests/offline/paymentOffline.test.ts` | 3 |
| `tests/offline/integration.test.ts` | 3 |

**Result: Test Files 11 passed (11) · Tests 142 passed (142) · 5.08s · exit 0** ✅

### C.3 — Web type-check

```
$ npm --workspace=apps/web run type-check     # tsc --noEmit
exit 0 — zero errors ✅
```

### C.4 — Backend suite (Jest + embedded PostgreSQL)

The backend boots a real embedded PostgreSQL (port 5541) via `tests/globalSetup.js`
and runs migrations — this is genuine integration testing, not mocks.

```
$ cd apps/backend && npx jest --runInBand
```

**Result: Test Suites 30 passed (30) · Tests 467 passed (467) · 749.3s · exit 0** ✅

All 30 suites passed, including the ones that matter most for Phase 17 safety:
`tenant-isolation`, `security-regression`, `validate.middleware`, `integrity`,
`financial-integrity`, `phase13-measurements`, `phase14-design`,
`phase15-pattern-cutting`, `phase16-fabric-production`, `phase7-intelligence`.

### C.5 — Certified fresh baseline

| Suite | Result |
|---|---|
| Backend (Jest, real DB) | **467 / 467** ✅ |
| Web (Vitest) | **142 / 142** ✅ |
| Web type-check | **0 errors** ✅ |
| **TOTAL** | **609 / 609 passing** |

This is a **live, reproduced certification**, not an inherited number.

> Housekeeping: the performance suite rewrites `apps/backend/tests/perf-results.json`
> as a side effect. It was reverted (`git checkout --`) so the Stage 0 commit contains
> only forensic documentation.

---

## D. PROTECTED IP VERIFICATION — ZERO DIFF

```
$ git diff phase-15-complete -- \
    apps/web/src/components/DesignStudio.tsx \
    apps/web/src/modules/services/patternEngine.ts \
    apps/web/src/modules/services/productionAssistant.ts | wc -l
0
```

**0 lines of diff — ZERO DIFF CONFIRMED ✅**

Content hashes recorded to detect any future drift:

| Protected file | SHA-256 |
|---|---|
| `DesignStudio.tsx` | `7c3c3bd1364244c3d89eb8a4892005ad876e64aeb68090af161b353eacb07a6d` |
| `patternEngine.ts` | `f286adc4cfd5d83104c86e319462dcbf47d58d3f9e8181c800ddac2242725ddf` |
| `productionAssistant.ts` | `d8d5a0a607033d9781d4cdeaa1f49a73506bc247d0cdb55cf41716073d4a8109` |

**Phase 17 binding constraint:** these three files must remain ZERO DIFF for the
entire phase. Phase 17 introduces no AI code into them and does not call
`productionAssistant.ts`.

---

## E. EXISTING AI INFRASTRUCTURE AUDIT

### E.1 — Resolving the contradiction

The handoff claimed Phase 7 AI provider contracts existed; recovery forensics
claimed they were absent. **Both were reporting on different trees.** Against the
authentic recovered baseline:

> ### ✅ **THE PHASE 7 AI PROVIDER CONTRACTS EXIST AND ARE REAL.**
>
> `apps/backend/src/providers/contracts.ts` — 137 lines, present at HEAD.

The earlier "absent" finding was correct *for the shallow clone of `main`* (which
contains no Phase 7 work at all) and wrong for the real project. The handoff claim
was correct. **Option A is viable.**

### E.2 — Exhaustive search results

Searched the entire tree for `openai|anthropic|claude|gemini|llm|aiProvider|aiGateway`
(excluding `node_modules`, `package-lock.json`):

| Location | Finding |
|---|---|
| `apps/backend/src/providers/contracts.ts` | AI provider interfaces (the real asset) |
| `apps/backend/tests/setup.ts` | Feature-flag seeds `OPENAI`/`GEMINI`/`CLAUDE` (all `false`) |
| `apps/backend/migrations/014_phase7_intelligence.sql` | Same flags seeded in schema |
| `docs/PHASE6_AI_EXTENSION_ARCHITECTURE.md` | Design intent for the AI boundary |
| `apps/*/jobs/*.ts`, `queueService.ts` | `bullmq` only — false positives on "ai" substring |

**Zero AI SDKs. Zero network calls. Zero API keys. Zero live provider code.**
`package.json` contains no `openai`, `@anthropic-ai/sdk`, or `@google/generative-ai`.

### E.3 — What `contracts.ts` actually provides

```ts
export type AIRequestClassification = 'operational' | 'pseudonymized' | 'tenant-data';

export interface AIRequest {
  purpose: string;                    // e.g. 'measurement.explain'
  workspaceId: string | null;         // tenant binding
  actorId: string | null;             // audit actor
  requestId: string | null;           // correlation join key
  inputClassification: AIRequestClassification;
  costMetadata?: AICostMetadata;      // tokensIn/tokensOut/estimatedCostUsd
  prompt: string;
  context?: Record<string, unknown>;  // "treat as DATA, never instructions"
}

export interface AIResponse { text: string; model?: string; provider: string; costMetadata?: AICostMetadata; }

export interface AIProvider {
  readonly name: string;
  generate(req: AIRequest): Promise<AIResponse>;
  analyze(req: AIRequest): Promise<Record<string, unknown>>;
  classify(req: AIRequest, labels: string[]): Promise<{ label: string; confidence: number }>;
  summarize(req: AIRequest): Promise<string>;
}
```

Plus `providerRegistry` — a null-by-default registry where **provider absence is an
explicitly normal state** and nothing self-registers or performs I/O at import time.

The file's own governance header already encodes the Phase 17 principles:
server-only secrets; audit-carrying requests; tenant data never auto-sent;
provider failure must never break core workflows; AI output is advisory and must
be labeled AI-GENERATED.

### E.4 — Gap analysis (what is missing)

The contract is an excellent **interface**, but it is *interface only*. Missing:

1. **No gateway implementation** — nothing routes an `AIRequest` to a provider.
2. **No concrete providers** — no OpenAI/Gemini/Claude adapters.
3. **No context assembly layer** — nothing safely builds `context` from domain data.
4. **No output validation layer** — `AIResponse.text` is free-form; no schema enforcement.
5. **No AI routes/services** — no HTTP surface; `routes/` has no `aiRoutes.ts`.
6. **No env wiring** — `config/env.ts` has no AI keys; `.env.example` has none.
7. **No prompt infrastructure** — no templates, no injection defenses.
8. **No persistence** — no tables for AI interactions, proposals, or review state.
9. **`DiagnosticOutput` is the only advisory precedent** — good model to imitate
   (`aiGenerated`, `confidence`, `advisory: true`), but scoped to incidents, not tailoring.
10. **The AI provider methods are too generic for tailoring** — Phase 17 needs
    *structured proposals*, not raw `text`.

### E.5 — Existing advisory precedent to imitate

`RuleBasedDiagnosticProvider` + `DiagnosticOutput` demonstrate the house pattern for
machine-generated advice: deterministic rule-based implementation, `source` field,
`aiGenerated` boolean, `confidence` score, and a hard `advisory: true` flag, enforced
by test (`expect(res.body.advisory).toBe(true)`). **Phase 17 will mirror this exactly.**

---

## F. DETERMINISTIC INTELLIGENCE INVENTORY

These are the engines AI must **consume, never replace**.

### Phase 13 — Measurement Intelligence
`apps/backend/src/modules/measurements/` · `apps/web/src/modules/services/measurementService.ts`

| Capability | Implementation |
|---|---|
| L1 range validation | `validateLevel1()` |
| L2 relational checks | `runRelationalChecks()` |
| L3 historical anomaly detection | `runHistoricalChecks()` |
| Completeness / missing measurements | `runCompleteness()` → `missingDefinitions`, `state: COMPLETE\|PARTIAL` |
| Measurement suggestions | `historicalSuggestions()` — *previous verified values only, never predictions* |
| Validation assembly | `assembleValidation()` |
| Historical comparison | `compareProfiles()` |
| Canonical units | `units.ts` — cm canonical, scale 4, `INCH_CM = 2.54` |
| Definitions | `BODY_`/`GARMENT_`/`PATTERN_RESERVED_DEFINITIONS`, `requiredDefinitionsFor()` |

> Note `historicalSuggestions()` is explicitly documented as *"never predictions."*
> AI **must not** convert this into a predictive engine.

### Phase 14 — Design Intelligence
`apps/backend/src/modules/design/`

`inspirationService.ts` · `designSpecService.ts` · `fabricService.ts` ·
`assetService.ts` · `measurementAdapter.ts` · `readinessEngine.ts` · `types.ts`
Web: `designService.ts`, `localAssetStore.ts`

### Phase 15 — Pattern & Cutting Intelligence
`apps/backend/src/modules/pattern/` · web services

| Capability | Implementation |
|---|---|
| Pattern engine (**PROTECTED**) | `patternEngine.ts` (678 lines) |
| Pattern derivation | `patternIntelligenceService.ts` → `derivePatternModel()` |
| Geometry | `computeBoundingBox()` |
| Layout envelope | `cuttingLayoutService.ts` (398 lines) |
| Cutting instructions | `cuttingInstructionsService.ts` (250 lines) |
| Pattern adaptation | `patternAdapter.ts` (499 lines) |
| Traceability / readiness | `patternRoutes.ts` endpoints |

### Phase 16 — Fabric & Production Intelligence
`apps/backend/src/modules/production/` · web services

| Capability | Implementation |
|---|---|
| Fabric consumption | `calculateFabricConsumption()` (573-line service) |
| Width profile | `buildWidthProfile()` |
| Shrinkage allowance | `buildShrinkageAllowance()` |
| Pattern matching | `buildPatternMatchingAssessment()` |
| Directional allowance | `buildDirectionalAllowance()` |
| Handling waste | `buildHandlingWaste()` |
| Safety buffer | `buildSafetyBuffer()` |
| Yardage conversion | `cmToMeters/cmToYards/metersToCm/yardsToCm` |
| Material requirements | `materialRequirementService.ts` |
| Purchasing | `purchasingService.ts` |
| Cutting execution | `generateCuttingExecutionPlan()` |
| Workflow generation | `generateProductionWorkflow()`, `validateNoCycles()` |
| Operation readiness | `computeOperationReadiness()`, `transitionOperationStatus()` |
| Production planning | `productionPlanService.ts` |

**Every number in the tailoring domain is produced by these engines. AI produces none of them.**

---

## G. CONTEXT ASSEMBLY ARCHITECTURE

**Principle: AI receives a purpose-scoped, whitelisted, pseudonymized projection —
never raw records, never `SELECT *`, never a whole tenant.**

### G.1 — Rules

1. **Whitelist-only.** Each AI purpose declares the exact fields it may receive.
   Fields not listed are unreachable — an allowlist, never a denylist.
2. **PII minimization by default.** Customer names, phone, email, address are
   **excluded**. Customers are referenced by opaque handle (`customer#a1b2`).
   `inputClassification` must be `operational` or `pseudonymized`; `tenant-data`
   requires an explicit, audited, per-purpose decision.
3. **Derived over raw.** Send *engine outputs* (completeness state, anomaly flags,
   consumption totals) rather than raw rows. The engines have already done the thinking.
4. **Tenant-bound.** Every assembly takes `workspaceId` from `req.workspaceId`
   (set by `requireWorkspace`), never from the client body.
5. **Bounded size.** Hard caps on array lengths and total serialized bytes; deterministic
   truncation with an explicit `truncated: true` marker.
6. **Data, not instructions.** `context` is structured JSON, kept separate from the
   prompt, and providers are told to treat it as inert data (already mandated by the
   Phase 7 contract header, Step 77).

### G.2 — Purpose-scoped context packs (proposed)

| Purpose | Whitelisted context |
|---|---|
| `measurement.explain` | garment type, completeness state, missing codes, anomaly findings, relational findings, units — **no raw customer identity** |
| `measurement.missing` | required vs. present definition codes, historical availability flags |
| `design.suggest` | garment type, style attributes, fabric profile properties, design-spec readiness |
| `pattern.explain` | piece names/counts, bounding boxes, grainline, constraints, validation findings |
| `fabric.advise` | consumption breakdown (width/shrinkage/directional/waste/buffer), totals, fabric properties |
| `production.advise` | operation graph summary, readiness states, blocking reasons, QC findings |

### G.3 — Assembly boundary

```
Route (authMiddleware → requireWorkspace → validate)
   │  workspaceId, actorId, requestId  (server-derived, never client-supplied)
   ▼
Context Assembler  ── reads via existing tenant-scoped services/repositories
   │                  applies purpose whitelist + pseudonymization + size caps
   ▼
AIRequest { purpose, workspaceId, actorId, requestId, inputClassification, context }
```

No service may construct an `AIRequest` outside this assembler.

---

## H. SECURITY & TENANT ISOLATION REVIEW

### H.1 — Audited controls (all present, all test-covered)

| Control | Implementation | Notes |
|---|---|---|
| Authentication | `middleware/auth.ts` | Bearer JWT → `verifyAccessToken` → `req.user`; sets audit context |
| Tenant isolation | `middleware/workspace.ts` | **Membership re-verified against `workspace_users` on every request** — the JWT is explicitly *not* the sole authority, so revoked members lose access even with a live token |
| Role enforcement | `requireRole`, `requireWorkspaceRole`, `requirePlatformRole` | |
| Feature gating | `requireFeatureFlag` | Server-authoritative, **fails closed** (403 / 503) |
| API key auth | `apiKeyAuth.ts`, `security/apiScopes.ts` | Phase 8 developer API |
| Validation | `middleware/validate.ts` + Zod schemas | House pattern across all routes |
| Error handling | `utils/apiError.ts`, `middleware/errorHandler.ts` | Coded errors, no internal leakage |
| Correlation | `requestCorrelation.ts` + AsyncLocalStorage | `X-Request-Id` spine |
| Audit logging | `services/auditLogService.ts` | Workspace/actor/request correlated |
| Rate limiting | `config/rateLimit.ts` | Applied globally |
| Hardening | `helmet()`, CORS allowlist, payload cap | |
| Secrets | `config/env.ts` with `getEnv`/`getOptionalEnv` | Server-only; never `VITE_*` |
| SSRF policy | `security/webhookUrlPolicy.ts` | Precedent for outbound-call restriction |

Route mounting is uniformly `app.use(path, authMiddleware, requireWorkspace, routes)`.

### H.2 — Phase 17 inherits, never bypasses

AI routes **must** mount with the identical chain plus a feature flag:

```ts
app.use('/ai', authMiddleware, requireWorkspace, requireFeatureFlag('AI_FEATURES'), aiRoutes);
```

- `workspaceId` from `req.workspaceId` only — never from the request body.
- Every AI request/response written to `audit_logs` with purpose, actor, workspace,
  requestId, provider, model, and token/cost metadata.
- Provider secrets live in `config/env.ts` as optional server-only vars; absence is normal.
- Outbound provider calls follow the `webhookUrlPolicy` precedent for egress discipline.
- The existing flags `AI_FEATURES`, `OPENAI`, `GEMINI`, `CLAUDE` (all seeded `false`)
  become the real kill switches — **AI ships OFF by default**.

---

## I. OFFLINE / FAILURE BEHAVIOR

### I.1 — Current offline architecture

- **Local-first:** Dexie/IndexedDB (`apps/web/src/db/database.ts`, schema v1–v4+).
- **Sync:** `syncEngine.ts` (370 lines), `syncQueue.ts`, single-flight `syncNow()`.
- **Bootstrap:** `offline/bootstrap.ts` — *"the app must start and run fully offline (§47),
  so no error escapes this module."* Controlled triggers only (startup, `online` event,
  5-minute conservative interval).
- **PWA:** `manifest.json`, Capacitor mobile wrapper.
- **Local persistence for domain intelligence:** e.g.
  `saveFabricConsumptionLocally()` / `loadFabricConsumptionLocally()`,
  `listLocalPatternModels()` — Phase 15/16 intelligence already runs client-side and offline.

### I.2 — Critical observation

**All Phase 13–16 intelligence is deterministic and already runs offline in the browser.**
Fabric consumption, pattern derivation, cutting layout, workflow generation, and
readiness all compute locally with no server and no network. This is exactly why AI
can be purely additive.

### I.3 — Phase 17 failure contract

| Condition | Behavior |
|---|---|
| No provider configured | AI surfaces render a neutral "AI unavailable" state; **everything else works** |
| Provider times out / errors | Caught at gateway; deterministic result still displayed; no exception propagates to UI |
| Offline (no network) | AI panels show offline state; all deterministic engines fully functional |
| Feature flag OFF | AI surfaces not rendered at all; zero behavioral change |
| Invalid AI output | Rejected by validation layer; treated as unavailable — never partially applied |

**Hard rule: no tailoring workflow may have AI on its critical path. Removing the AI
layer entirely must leave a fully working StitchFlow.** A test will assert this.

```
AI unavailable
     ↓
deterministic StitchFlow continues working   ← enforced by test, not by convention
```

---

## J. RECOMMENDED AI ARCHITECTURE

```
                      USER
                        │
                        ▼
        ┌───────────────────────────────┐
        │   AI SURFACES (scoped panels) │   Customer Detail · Measurement ·
        │   feature-flagged, dismissible│   Design Studio · Pattern · Fabric ·
        └───────────────┬───────────────┘   Production
                        ▼
        ┌───────────────────────────────┐
        │   CONTEXT ASSEMBLER           │   purpose whitelist · pseudonymize · cap
        └───────────────┬───────────────┘
                        ▼
        ┌───────────────────────────────┐
        │   AI GATEWAY (single door)    │   auth · tenant · flags · audit · cost ·
        │                               │   timeout · retry · fallback
        └───────────────┬───────────────┘
             ┌──────────┼──────────┐
             ▼          ▼          ▼
          OpenAI     Gemini      Claude          (replaceable infrastructure)
             └──────────┼──────────┘
                        ▼
                 PROVIDER RESULT
                        ▼
        ┌───────────────────────────────┐
        │   VALIDATION LAYER            │   schema · domain sanity · engine
        │                               │   cross-check · reject on mismatch
        └───────────────┬───────────────┘
                        ▼
        ┌───────────────────────────────┐
        │   STRUCTURED PROPOSAL         │   aiGenerated: true · advisory: true
        │   + HUMAN REVIEW              │   explicit accept/reject — never auto-apply
        └───────────────┬───────────────┘
                        ▼
        ┌───────────────────────────────┐
        │   DETERMINISTIC ENGINES       │   Phase 13/14/15/16 — unchanged
        └───────────────┬───────────────┘
                        ▼
                  VERIFIED RESULT
```

**Never:** `USER → AI → DATABASE / CALCULATIONS` ❌

AI output is a **proposal object**, never a mutation. Only a human-accepted proposal
is replayed through the normal, already-tested, validated deterministic write path.

---

## K. PROVIDER GATEWAY DECISION

### ✅ **DECISION: OPTION A (extend) — executed via a Phase 17 gateway**

**Justification.** The audit disproves the "no abstraction exists" premise:
`apps/backend/src/providers/contracts.ts` is a genuine, well-governed,
provider-neutral abstraction with a null-default registry, and its governance header
already states the exact Phase 17 principles. Discarding it to write a new one would
be duplication and would orphan the existing `AI_FEATURES`/`OPENAI`/`GEMINI`/`CLAUDE`
feature flags and the `DiagnosticProvider` advisory precedent.

**However**, §E.4 shows the contract is interface-only and insufficient alone. So the
decision is **Option A extended with the Option B centralization discipline**:

| Aspect | Decision |
|---|---|
| Provider interface | **Reuse** `AIProvider`, `AIRequest`, `AIResponse`, `providerRegistry` — do not redefine |
| Gateway | **Build new** — `apps/backend/src/modules/ai/aiGateway.ts`, the *single* egress point |
| Providers | Implement `OpenAIProvider`, `GeminiProvider`, `ClaudeProvider` behind `AIProvider`, mirroring the proven `billing/providers` pattern (`BillingProvider` + `TestBillingProvider` + live impl behind a config flag) |
| Test double | **Mandatory** `DeterministicAIProvider` so the whole layer is testable with zero network and zero cost — mirrors `TestBillingProvider` |
| Structured output | **Extend** the contract with tailoring-specific proposal types carrying `aiGenerated`/`advisory`/`confidence`, mirroring `DiagnosticOutput` |
| Scattering | **Forbidden.** No service, route, or component may import a provider SDK. Only `aiGateway.ts` may. A test will assert this. |

**Providers remain replaceable infrastructure.** Swapping OpenAI for Gemini must be a
config change, touching no domain code.

---

## L. PROPOSED PHASE 17 STAGE MAP

| Stage | Deliverable | Tag |
|---|---|---|
| **0** | Forensics & AI architecture audit *(this document)* | `phase-17-forensics` |
| 1 | AI domain contracts — proposal types, purposes, classifications, validation result shapes | `phase-17-ai-contracts` |
| 2 | AI Gateway + `DeterministicAIProvider` + registry wiring; env/flags; **no network** | `phase-17-ai-gateway` |
| 3 | Context assembly layer — purpose-scoped whitelists, pseudonymization, size caps | `phase-17-context-assembly` |
| 4 | Validation layer — schema + domain sanity + deterministic-engine cross-check | `phase-17-ai-validation` |
| 5 | Audit, cost metering, rate limiting, kill switches | `phase-17-ai-governance` |
| 6 | Live provider adapters (OpenAI / Gemini / Claude), all flag-gated OFF | `phase-17-providers` |
| 7 | Measurement intelligence surface (explain, missing, anomalies) | `phase-17-measurement-ai` |
| 8 | Design & style suggestion surface | `phase-17-design-ai` |
| 9 | Pattern explanation surface (read-only over pattern engine) | `phase-17-pattern-ai` |
| 10 | Fabric & production advisory surface | `phase-17-production-ai` |
| 11 | Human review & proposal-acceptance workflow | `phase-17-review-workflow` |
| 12 | Offline/failure hardening + full certification | `phase-17-complete` |

Each stage: implement → test → review diff → commit → tag → push → **verify locally and
remotely** → report. No stage begins before the previous checkpoint is confirmed on the remote.

---

## M. RISKS AND CONSTRAINTS

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| **R1** | **`main` is still the scaffold commit; all Phase 1–16 history exists only on `arena/*` session branches.** A branch deletion would destroy the project. | **CRITICAL** | Flagged to operator. Recommend merging to `main` or creating a permanent release branch/tag outside session branches. |
| R2 | Handoff metadata was inaccurate (wrong branch name, stale HEAD) | High | Always verify HEAD/branch against `git ls-remote` before trusting a handoff — done in §A |
| R3 | AI hallucinating measurements or yardage | **Critical** | AI never writes numbers; validation cross-checks against deterministic engines; §N enforced |
| R4 | Prompt injection via customer-supplied text (names, notes, inspiration) | High | Context is structured data, separated from instructions; untrusted fields excluded or escaped |
| R5 | PII leaking to third-party providers | High | Pseudonymization default; `inputClassification` gate; whitelist-only assembly |
| R6 | Tenant data crossing workspaces | **Critical** | `workspaceId` server-derived only; existing `tenant-isolation` suite extended to AI routes |
| R7 | Cost runaway | Medium | `costMetadata` metering, per-workspace rate limits, flags OFF by default |
| R8 | Provider outage degrading core workflows | High | Gateway timeout + graceful fallback; offline-continuity test |
| R9 | Protected IP drift | High | SHA-256 baselines in §D re-verified every stage |
| R10 | Provider SDK sprawl across services | Medium | Single-gateway rule enforced by test |
| R11 | Users trusting AI output as authoritative | Medium | Mandatory `aiGenerated`/`advisory` labeling in UI, per Phase 7 Step 65 |
| R12 | Backend suite runtime (~12.5 min) slowing iteration | Low | Run targeted suites during development, full suite at each checkpoint |
| R13 | Stray `.bak` files in the tree (`DesignStudio.tsx.bak`, `jobSheetExport.ts.bak*`) | Low | Pre-existing; not touched by Phase 17 |

---

## N. SYSTEMS AI MUST NEVER REPLACE

**Absolute prohibitions. Violation = phase failure.**

| # | System | File / Module | AI's only permitted role |
|---|---|---|---|
| 1 | **Pattern engine (PROTECTED)** | `patternEngine.ts` | Explain existing output. Never compute geometry. Never invent pattern mathematics. |
| 2 | **Design Studio (PROTECTED)** | `DesignStudio.tsx` | ZERO DIFF. No AI code inside. |
| 3 | **Production Assistant (PROTECTED)** | `productionAssistant.ts` | ZERO DIFF. Not called. |
| 4 | Measurement validation L1/L2/L3 | `validationService.ts` | Explain findings. Never re-classify or suppress an anomaly. |
| 5 | Measurement values & units | `profileService.ts`, `units.ts` | Never silently alter a measurement. Propose only; human accepts. |
| 6 | Completeness / missing detection | `runCompleteness()` | Explain and prioritize. Never redefine required fields. |
| 7 | Historical suggestions | `historicalSuggestions()` | Must remain *previous verified values*, never AI predictions. |
| 8 | Fabric consumption | `calculateFabricConsumption()` and all `build*` helpers | Explain the breakdown. Never produce a consumption number. |
| 9 | Yardage conversion | `cmToMeters`/`cmToYards`/… | Never approximate a unit conversion. |
| 10 | Material requirements | `materialRequirementService.ts` | Advise on sourcing. Never compute requirements. |
| 11 | Cutting layout & instructions | `cuttingLayoutService.ts`, `cuttingInstructionsService.ts` | Explain. Never generate layout geometry. |
| 12 | Production workflow & readiness | `productionWorkflowService.ts` | Advise on sequencing. Never mutate operation status or bypass `validateNoCycles()`. |
| 13 | Purchasing | `purchasingService.ts` | Advise. Never issue or alter purchase data. |
| 14 | Tenant isolation | `middleware/workspace.ts` | Always inherit. Never bypass. |
| 15 | Authentication | `middleware/auth.ts` | Always inherit. Never bypass. |
| 16 | Validation middleware | `middleware/validate.ts` + Zod schemas | AI writes traverse identical validation. Never bypass. |
| 17 | Audit logging | `auditLogService.ts` | Every AI interaction is audited. Never silent. |
| 18 | Sync engine | `syncEngine.ts`, `syncQueue.ts` | Never inject AI into the sync path. |

**And the overarching rule:**

> **AI must never become required for any core tailoring workflow.**
> Delete the entire AI layer → StitchFlow still measures, designs, drafts patterns,
> calculates fabric, and runs production. Stage 12 will prove this with a test.

---

## SUMMARY

| Item | Result |
|---|---|
| Baseline HEAD | `9bddf6f4642157f129d04a74f493295725706ace` ✅ (recovered — see §A) |
| Working tree | CLEAN ✅ |
| Phase 16 tags | All 14 verified unchanged, local + remote ✅ |
| Protected IP | **ZERO DIFF** (0 lines) ✅ |
| Fresh certification | **609/609** (467 backend + 142 web), type-check clean ✅ |
| Phase 7 AI contracts | **EXIST** — handoff claim confirmed, "absent" finding refuted ✅ |
| Provider decision | **Option A** — extend `contracts.ts` via one centralized gateway ✅ |
| Phase 17 code written | **None** — Stage 0 is audit-only ✅ |

**Stage 0 complete. Awaiting explicit authorization for Stage 1.**
