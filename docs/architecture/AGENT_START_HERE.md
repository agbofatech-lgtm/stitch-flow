# StitchFlow — Agent / Engineer Start Here

**Status:** Current continuity entrypoint (2026-09-01)  
**Does not replace:** ADRs, phase closure records, or repository evidence.

## Mandatory first principle

```
THE REPOSITORY IS THE SOURCE OF TRUTH.
DOCUMENTATION GUIDES INVESTIGATION.
RUNTIME VERIFICATION OVERRIDES ASSUMPTION.
```

Code existence ≠ route mounted ≠ route authoritative ≠ product using it.

---

## Before you change anything

1. **Verify branch and HEAD.** Record `git rev-parse --abbrev-ref HEAD` and `git rev-parse HEAD`. Compare to origin. Distinguish committed tree, local modifications, untracked files, and the nested `stitch-flow/` duplicate.
2. **Read** [`continuity/01_SYSTEM_EXECUTIVE_TRUTH.md`](./continuity/01_SYSTEM_EXECUTIVE_TRUTH.md).
3. **Read** [`continuity/02_RUNTIME_AUTHORITY_MAP.md`](./continuity/02_RUNTIME_AUTHORITY_MAP.md).
4. **Read** [`continuity/04_PROTECTED_ASSET_CONTINUITY.md`](./continuity/04_PROTECTED_ASSET_CONTINUITY.md).
5. **Read** [`continuity/06_PHASE_AND_GOVERNANCE_CONTINUITY.md`](./continuity/06_PHASE_AND_GOVERNANCE_CONTINUITY.md) for the stage you think you are in. Then open that stage’s closure record. Implementation complete ≠ owner acceptance ≠ certification ≠ checkpoint tag.
6. **Verify protected hashes** (git blob / LF-normalized SHA-256) before touching Pattern Engine, Production Assistant, Design Studio, measurement vocabulary, or production stage service. Method is in document 04. Windows CRLF working copies will not match the registry until LF-normalized.
7. **Inspect actual runtime paths.** `npm run dev:backend` starts `apps/backend/src/server.ts` → `createApp()`. `npm start` / Docker currently execute `dist/server.js`, which may not match `src`. Frontend Vite `:5173` is the product UI.
8. **Never assume code existence equals authority.** `apps/api` is orphaned. Shop CRUD exists and is unmounted by default. T10 exists and is not the live Design Studio path.
9. **Check owner authorization.** Do not self-tick owner acceptance. Do not create checkpoint tags unless the owner ordered that exact tag.
10. **Respect locked phases.** Phase 20 is LOCKED. 3D fitting is NOT STARTED (ADR-005). Next PEX stage is LOCKED. Do not mount unauthenticated business CRUD, enable a PSP, or rewrite protected formulas without an explicit owner programme.

---

## Continuity pack

| Doc | Question |
|---|---|
| [01 System executive truth](./continuity/01_SYSTEM_EXECUTIVE_TRUTH.md) | What is StitchFlow *today*? |
| [02 Runtime authority](./continuity/02_RUNTIME_AUTHORITY_MAP.md) | What actually runs? |
| [03 Data authority](./continuity/03_DATA_AUTHORITY_AND_SOURCES_OF_TRUTH.md) | Where does truth live? |
| [04 Protected assets](./continuity/04_PROTECTED_ASSET_CONTINUITY.md) | What must not be casually rewritten? |
| [05 Tailoring execution](./continuity/05_TAILORING_EXECUTION_ARCHITECTURE.md) | Which engine path is live? |
| [06 Phase governance](./continuity/06_PHASE_AND_GOVERNANCE_CONTINUITY.md) | What is accepted / tagged / locked? |
| [07 Platform & commercial](./continuity/07_PLATFORM_AND_COMMERCIAL_ARCHITECTURE.md) | What is P19 actually? |
| [08 Frontend experience](./continuity/08_FRONTEND_EXPERIENCE_CONTINUITY.md) | What did PEX change? |
| [09 Backend & API](./continuity/09_BACKEND_AND_API_REALITY.md) | Which routes are mounted? |
| [10 Gaps & conditions](./continuity/10_KNOWN_GAPS_AND_CONDITIONS_REGISTER.md) | What is known incomplete? |
| [11 Next programmes](./continuity/11_NEXT_PROGRAMME_DECISION_TREE.md) | Legitimate future paths (none selected) |
| [Historical drift](./continuity/HISTORICAL_DRIFT_INDEX.md) | Where older docs conflict with later implementation |
| [Verification](./continuity/CONTINUITY_VERIFICATION_REPORT.md) | How this pack was produced |

Index of the pack: [`continuity/README.md`](./continuity/README.md).

Authority **convergence** forensics (SAC-0, implementation not granted): [`convergence/README.md`](./convergence/README.md). SAC-1 is locked until the owner authorizes it.

---

## Locked until the owner authorizes a named programme

- Phase 20
- 3D fitting / virtual try-on
- Rewriting Pattern Engine formulas or Production Assistant heuristics
- Rebuilding Design Studio
- Mounting unauthenticated shop CRUD
- Selecting or enabling a live PSP
- Treating localStorage as the long-term shop SoT
- Treating `apps/api`, nested `stitch-flow/`, or stale `dist/` as authority
