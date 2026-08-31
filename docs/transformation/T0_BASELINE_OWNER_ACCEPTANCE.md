# T0 Baseline — Owner Acceptance Record

| Field | Value |
|---|---|
| Document | T0_BASELINE_OWNER_ACCEPTANCE |
| Status | **ACCEPTED** |
| Date prepared | 2026-08-31 |
| Date accepted | 2026-08-31 |
| Prepared by | Implementation / architecture agent (verification only) |
| Owner acceptance | **ACCEPTED** |
| Acceptance authority | Owner instruction `STITCHFLOW — T0 FINAL ACCEPTANCE, TAGGING & CLOSURE` (2026-08-31). Status line: “Owner has accepted the T0 Baseline Acceptance Record.” |
| T1 | **LOCKED** — this acceptance does **not** authorize T1 |

---

## 1. What was accepted

The following are a trustworthy **starting point** (current truth), not a completed platform:

- T0 investigation pack (T0.1–T0.6 + gate)
- ADR Master Pack ADR-001…011 as **target law**
- Canonical Domain Vocabulary as a **starter** (T3 still locks field-level names)
- T0 final verification report

Separation that remains explicit:

```
CURRENT TRUTH   (T0 evidence)
      ≠
TARGET LAW      (Accepted ADRs)
      ≠
AUTHORIZED IMPLEMENTATION   (T1+ only after separate Owner YES)
```

The running repository **violates** ADR-002, ADR-009, and ADR-010. That is why T1–T2 exist. Acceptance of this baseline is **not** a claim that those ADRs are already implemented.

---

## 2. Code baseline (FACT)

| Item | Value |
|---|---|
| Product/code commit | `b576c3e6f5a4d7aac08ef75de47cf6235a2ed619` |
| Branch | `arena/01a05677-stitch-flow` |
| Authorized baseline tag | `transformation-t0-baseline-accepted` (applied to the T0 documentation-closure commit, not to `b576c3e` alone) |

Protected asset SHA-256 hashes: [`docs/architecture/PROTECTED_ASSET_REGISTRY.md`](../architecture/PROTECTED_ASSET_REGISTRY.md) §9.

---

## 3. Locked current-truth statements (short)

| Topic | Locked FACT |
|---|---|
| Frontend | Vite React SPA `:5173`, no router, `currentView` |
| API client | `VITE_API_BASE_URL` \|\| `http://localhost:5000` |
| Live backend | `apps/backend/src/server.ts` stub `:5000` |
| Unmounted | `app.ts` CRUD, `apps/api`, `proxy-server.js` |
| Data | Split localStorage vs HTTP stub; Postgres **not** product SoT |
| Protected | Pattern Engine, Production Assistant, Design Studio, measurement types, production stages |
| Offline-first | **Not** current behavior |
| AI / 3D / Control Center / billing | **Not** implemented as platform capabilities |

Unknowns U1–U7 remain open.

---

## 4. T0 did not do (scope integrity)

No T1–T7 implementation. No Phase 13–19 implementation. No protected-file edits. No mounting of APIs. No schema/migration changes.

---

## 5. Owner decision

**GO WITH CONDITIONS → T1 remains LOCKED until a separate T1 authorization.**

Conditions include: T1 must not rewrite protected engines; must not expose unauthenticated `app.ts` CRUD publicly; must not treat the stub as the platform API; later stages remain unauthorized.

---

## 6. Owner block (recorded from Owner closure instruction)

```
T0 BASELINE OWNER ACCEPTANCE

I have read: (accepted as the T0 pack referenced by the closure instruction)
  [x] T0_REPOSITORY_TRUTH_REPORT.md
  [x] PROTECTED_ASSET_REGISTRY.md (including hashes)
  [x] RUNTIME_TRUTH_MAP.md
  [x] DOMAIN_INTELLIGENCE_MAP.md
  [x] DATA_AUTHORITY_MAP.md
  [x] T0_RISK_REGISTER.md
  [x] T0_ARCHITECTURE_GATE.md
  [x] STITCHFLOW_ADR_MASTER_PACK.md
  [x] CANONICAL_DOMAIN_VOCABULARY.md
  [x] T0_FINAL_VERIFICATION_REPORT.md
  [x] This baseline record

I accept this T0 pack as locked current truth:
YES

I accept that CURRENT TRUTH ≠ TARGET LAW ≠ AUTHORIZED IMPLEMENTATION:
YES

I authorize git tag transformation-t0-baseline-accepted
AFTER the T0 docs are committed:
YES
(per T0 FINAL ACCEPTANCE, TAGGING & CLOSURE)

I authorize T1 by this document:
NO  (T1 requires a separate authorization after tags)

Owner name: Owner (closure instruction; personal name not supplied)
Date: 2026-08-31
Conditions / notes: T1 remains LOCKED. Tag does not start implementation.
```

**T0 OWNER ACCEPTANCE: ACCEPTED**

T1 STATUS: **LOCKED**
