# PHASE 17 — AI TAILORING INTELLIGENCE
## Final Certification Report

**Date:** 2026-08-29
**Branch:** `arena/01a04e01-stitch-flow`
**Remote branch:** `origin/arena/01a04e01-stitch-flow`
**Phase 16 baseline:** `9bddf6f4642157f129d04a74f493295725706ace`

---

## 1. CERTIFICATION SUMMARY

| Item | Result |
|---|---|
| AI Contracts | **PASS** |
| Provider Gateway | **PASS** |
| No-Provider Resilience | **PASS** |
| Deterministic Provider | **PASS** |
| Measurement Intelligence | **PASS** |
| Design Intelligence | **PASS** |
| Fabric Intelligence | **PASS** |
| Production Intelligence | **PASS** |
| Customer Explanations | **PASS** |
| Tenant Isolation | **PASS** |
| Data Governance | **PASS** |
| Failure Isolation | **PASS** |
| Offline Core | **PASS** |
| Web Tests | **PASS** (156/156) |
| Backend Tests | **PASS** (532/532) |
| TypeScript | **PASS** (backend + web, 0 errors) |
| Production Build | **PASS** (PWA service worker generated) |
| Protected IP | **PASS** (ZERO DIFF) |
| Git Integrity | **PASS** (all checkpoints pushed + verified) |
| Laptop Browser Validation | **PENDING** (see §9) |

---

## 2. REPOSITORY RECOVERY (performed before any implementation)

The session was again provisioned as a **shallow clone of `origin/main`**, which
is only the scaffold commit `b576c3e`. This is the recurring failure mode named in
the mandate, and it was detected and repaired before any code was written.

**Observed on entry:**

```
$ git rev-parse HEAD
b576c3e6f5a4d7aac08ef75de47cf6235a2ed619
$ cat .git/shallow                      # SHALLOW
$ git rev-list --all --count            # 1
$ git config --get-all remote.origin.fetch
+refs/heads/main:refs/remotes/origin/main      # restricted to main only
```

**Repair (§3 of the mandate):**

```
$ git config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"
$ git fetch --unshallow origin
$ git fetch --all --tags --prune
```

**Checkpoint discovery (§4) — answered with evidence:**

| # | Question | Answer |
|---|---|---|
| A | Does `phase-17-forensics` exist? | **YES** |
| B | What commit? | `2ace89f6d4c130e4855260b88080f8278e2872ed` (tag object `3650d46f`) |
| C | Descended from `9bddf6f`? | **YES** (`git merge-base --is-ancestor` → true) |
| D | Files changed? | `docs/PHASE17_AI_FORENSICS.md` only (+712) |
| E | Forensic report present? | **YES**, sections A–N |
| F | Commits after it? | **NO** |
| G | Stage 1 contracts implemented? | **NO** |
| H | Stage 2 implementation? | **NO** |
| I | Pushed remotely? | **YES** — on `origin/arena/01a04e01-stitch-flow` |
| J | Working tree authentic? | Shallow-clone artifact; repaired |

**Result: STATE A.** Stage 0 was authentic and complete, so it was **not redone**.
Work resumed at Stage 1.

**Recovery method — non-destructive.** The local branch had **zero unique commits**
(`git log 2ace89f..HEAD` empty) and 85 commits to gain. Working-tree file content
already matched the target (verified by SHA-256 per file), so only HEAD/index were
stale; `git reset --mixed 2ace89f` reconciled them with **no file loss, no
`--hard`, no force-push, no history rewrite**.

---

## 3. PROTECTED IP — ZERO DIFF

```
$ git diff --stat phase-15-complete -- \
    apps/web/src/components/DesignStudio.tsx \
    apps/web/src/modules/services/patternEngine.ts \
    apps/web/src/modules/services/productionAssistant.ts
(no output — 0 lines changed)
```

| Protected file | SHA-256 | Matches Stage 0 |
|---|---|---|
| `DesignStudio.tsx` | `7c3c3bd1364244c3d89eb8a4892005ad876e64ae…` | ✅ |
| `patternEngine.ts` | `f286adc4cfd5d83104c86e319462dcbf47d58d3f…` | ✅ |
| `productionAssistant.ts` | `d8d5a0a607033d9781d4cdeaa1f49a73506bc247…` | ✅ |

Verified before implementation, at every checkpoint, and at final certification.
Phase 17 integrates **around** these assets: it never imports, calls, moves,
renames or reimplements them.

---

## 4. ARCHITECTURE DELIVERED

```
        Measurement / Design / Fabric / Production workspace
                              │  (explicit user action only)
                              ▼
                    AI Advisory Panel (UI)
                              │
                              ▼
        /ai/*  →  authMiddleware → requireWorkspace → validate → rate limit
                              │
                              ▼
                     Tailoring Advisor
              (reads Phase 13/14/15/16 engine output)
                              │
                              ▼
                   Purpose-scoped Context Builder
              (allowlist · pseudonymise · cap · limitations)
                              │
                              ▼
                        AI  GATEWAY                ← single egress point
              (purpose · tenant · timeout · isolation)
                              │
                     providerRegistry (Phase 7)
                              │
        ┌──────────┬──────────┼──────────┬──────────────┐
        ▼          ▼          ▼          ▼              ▼
     OpenAI     Gemini     Claude   Deterministic   (none)
        └──────────┴──────────┴──────────┴──────────────┘
                              │
                    Schema Validation (Zod)
                              │
                  Deterministic Precedence  ← engine always wins
                              │
                   Structured Advisory (advisory: true)
                              │
                     Human review / decision
                              │
                  Deterministic StitchFlow engines
```

**Provider decision: OPTION A (extend).** The Phase 7 `AIProvider` / `AIRequest` /
`AIResponse` / `providerRegistry` contracts were reused, not duplicated. No
competing provider architecture was created.

### Files added

| File | Role |
|---|---|
| `modules/ai/types.ts` | Domain contracts: purposes, findings, evidence source, provenance, advisory, failure taxonomy |
| `modules/ai/advisorySchema.ts` | Zod validation + normalisation of provider output |
| `modules/ai/deterministicPrecedence.ts` | Enforces engine-wins-over-AI |
| `modules/ai/aiGateway.ts` | The single controlled boundary |
| `modules/ai/contextBuilders.ts` | Purpose-scoped allowlisted context |
| `modules/ai/tailoringAdvisor.ts` | Consumes Phase 13/14/15/16 output |
| `modules/ai/providers/DeterministicAIProvider.ts` | Mandatory zero-cost test double |
| `modules/ai/providers/HttpAIProvider.ts` | The only outbound AI call site |
| `modules/ai/providers/index.ts` | Config-driven provider selection |
| `routes/aiRoutes.ts` | `/ai/*` API |
| `web/shared/api/ai.ts` | Typed browser client |
| `web/components/ai/AIAdvisoryPanel.tsx` | Advisory UI primitive |
| `web/components/ai/MeasurementAIPanel.tsx` | Measurement surface |
| `web/components/ai/ProductionAIPanel.tsx` | Production + fabric surfaces |

**No vendor SDK was added.** `openai`, `@anthropic-ai/sdk`, `@google/generative-ai`
and `langchain` are all absent from `package.json` (asserted by test P17-ARCH3).
All three vendors are served by one audited HTTP adapter.

---

## 5. NON-NEGOTIABLE GUARANTEES — HOW EACH IS ENFORCED

| Guarantee | Enforcement | Test |
|---|---|---|
| AI never overrides deterministic truth | Contradicting a **blocking** assertion is suppressed and recorded | P17-C1…C5 |
| AI never invents measurements | Raw values are excluded from context; only findings travel | P17-G1, G2 |
| AI never computes fabric quantities | Consumption is read from the Phase 16 record; AI only explains | P17-G6 |
| AI never mutates production state | Advisor is read-only; no mutation path exists | P17-G7 |
| AI is always advisory | `advisory: true` on every advisory | P17-A3 |
| Provider cannot fake authority | Schema forbids a provider self-labelling `deterministic` | P17-B5 |
| No certainty without evidence | `high` confidence without evidence is downgraded | P17-B6 |
| Tenant isolation | `workspaceId` server-derived; context/tenant mismatch refused | P17-F4, F5, API5 |
| No PII to providers | Allowlist-only + salted pseudonyms | P17-F1, F2, F3 |
| Secrets stay server-side | No `VITE_` AI vars; bundle scanned clean | P17-ARCH5 |
| Single gateway | Source scan for provider imports/endpoints | P17-ARCH1, ARCH2 |
| AI never required | Every failure degrades to deterministic advisory | P17-D1…D6 |

### Deterministic precedence — demonstrated

The deterministic provider can simulate a model that dismisses a real blocker.
Test **P17-C4** drives that end-to-end:

- Engine says: *"Fabric width is incompatible with the cutting layout."* (blocking)
- Model says: *"The fabric width is compatible and this should be fine."*
- **Result:** the AI claim is removed, the blocker survives as
  `source: 'deterministic'`, a `DeterministicConflict` is recorded, and the UI
  renders *"StitchFlow overruled the AI on 1 point(s)"*.

---

## 6. FAILURE MODES (§26) — ALL COVERED

| Mode | Behaviour | Test |
|---|---|---|
| `NO_PROVIDER` | Deterministic advisory | P17-D1 |
| `PROVIDER_DISABLED` | Deterministic advisory | P17-D2 |
| `INVALID_API_CONFIGURATION` | Classified, degrades | classifier |
| `TIMEOUT` | Abandoned at limit, degrades | P17-D4 |
| `RATE_LIMIT` | Degrades; API returns controlled 429 | P17-D3, API13 |
| `NETWORK_FAILURE` | Degrades | P17-D3 |
| `MALFORMED_RESPONSE` | Rejected before UI | P17-D3, B1 |
| `SCHEMA_VALIDATION_FAILURE` | Rejected before UI | P17-D3, B3 |
| `PROVIDER_ERROR` | Degrades | P17-D3, API12 |
| `EMPTY_RESPONSE` | Degrades | P17-D3, B2 |

`requestAdvisory()` is a total function — **it never throws and never rejects**
(P17-D6 asserts this across all eight modes). An AI failure returns HTTP 200 with
deterministic content (P17-API12): the tailoring workflow is never interrupted.

---

## 7. TEST RESULTS (freshly executed)

### Backend — Jest + embedded PostgreSQL
```
$ cd apps/backend && npx jest --runInBand
Test Suites: 32 passed, 32 total
Tests:       532 passed, 532 total
Time:        821.5 s
```
Baseline was 30 suites / 467 tests. Phase 17 adds 2 suites / **65 tests**, and all
30 pre-existing suites still pass — **no regressions, no test was modified**.

### Web — Vitest
```
$ npm --workspace=apps/web run test
Test Files  12 passed (12)
Tests       156 passed (156)
```
Baseline was 11 files / 142 tests. Phase 17 adds 1 file / **14 tests**.

### TypeScript & build
```
$ cd apps/backend && npx tsc --noEmit        # 0 errors
$ npm --workspace=apps/web run type-check    # 0 errors
$ npm --workspace=apps/web run build         # ✓ built, PWA sw.js generated
```

**Total: 688 tests passing.** No test requires an API key, network access, or a
live model.

### Two real defects found and fixed during certification
1. **Rate limit read at module load** — the env override never applied. Fixed by
   reading it lazily.
2. **Hanging timer on timeout simulation** — kept the Node event loop open
   ("Jest did not exit"). Fixed with `unref()`.

Both were caught by tests failing honestly rather than by weakening assertions.

---

## 8. SECRET HYGIENE

The production bundle was scanned:

| Pattern | Hits in `apps/web/dist/` |
|---|---|
| `OPENAI_API_KEY` / `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` | **0** |
| `api.openai.com` / `api.anthropic.com` / `generativelanguage` | **0** |
| Key-shaped tokens (`sk-` + 20+ chars) | **0** |

(`sk-` matched only CSS `mask-conical` and font filenames — confirmed false positives.)

Server-only settings are documented in `apps/backend/.env.example`, defaulting to
**disabled**: `AI_ENABLED=false`, `AI_PROVIDER=none`. No `.env` file was committed.

---

## 9. BROWSER VALIDATION — PENDING (§33)

Per the standing directive, no time was spent fighting sandbox browser
infrastructure. Playwright/Chromium was **not** attempted.

**ENVIRONMENT BLOCKED — LAPTOP VALIDATION REQUIRED.**

Covered here instead: real-DOM (jsdom) component tests, full integration tests
against a real database, TypeScript, and a passing production build. Recommended
laptop checks: measurement workspace panel, production readiness + fabric tabs,
and the unavailable state with `AI_ENABLED=false`.

---

## 10. GIT INTEGRITY

| Tag | Commit | Pushed |
|---|---|---|
| `phase-17-forensics` | `2ace89f6d4c130e4855260b88080f8278e2872ed` | ✅ (pre-existing) |
| `phase-17-domain-contracts` | `900d50889f037db36915107da8c136477214087d` | ✅ |
| `phase-17-ai-gateway` | `bc04fcb743d4858f2cae593d3800ef0fc672002a` | ✅ |
| `phase-17-api` | `63e7a6012f3faa1515a6ff83ddafc396d9742740` | ✅ |
| `phase-17-ui` | `dfc9c153a90946ae91b0bb771624c0da5c9a92c4` | ✅ |
| `phase-17-complete` | *(this commit)* | ✅ |

No existing tag was moved. No branch was force-pushed. No history was rewritten.

### ⚠️ `main` remains divergent
`origin/main` is still the scaffold commit `b576c3e`. The entire Phase 1–17
history exists only on `arena/*` session branches. **This was not changed** — the
mandate forbids restructuring repository governance or merging to `main` without
explicit authorization. It remains the project's single largest structural risk
and is the direct cause of the repeated recovery incidents.

---

## 11. SYSTEMS AI DOES NOT REPLACE (verified)

Measurement validation L1/L2/L3 · measurement values & units · completeness ·
historical suggestions · pattern engine · pattern geometry · cutting layout ·
cutting instructions · fabric consumption · every allowance calculation ·
yardage conversion · material requirements · purchasing quantities · production
workflow & transitions · QC pass/fail · pricing & payments · authentication ·
authorization · tenant isolation · validation middleware · audit logging · sync.

AI reads their output and explains it. It computes none of it.

---

## 12. SCOPE

Phase 17 only. **Phase 18 and Phase 19 were not started.**
