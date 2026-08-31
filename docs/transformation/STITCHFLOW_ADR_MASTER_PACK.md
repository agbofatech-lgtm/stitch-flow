# StitchFlow ADR Master Pack

| Field | Value |
|---|---|
| Document | STITCHFLOW_ADR_MASTER_PACK |
| Status | **Accepted / Active as a pack** — individual records are Accepted / Active |
| Date | 2026-08-31 |
| Authority | Principal Architecture Governance |
| Classification | Constitutional (Level 2) |
| Scope | Binding architectural law for StitchFlow transformation |
| Supersession | None — this is the founding pack (ADR-001 … ADR-011) |

This file is the **pack-level index**. Individual laws live in [`docs/architecture/adr/`](../architecture/adr/). This file does not replace those records.

---

## 1. What this pack is

Architecture Decision Records are **laws with versioned rationale**, not suggestions.

They answer: *what decisions govern implementation?*

They do **not** answer: *what currently runs?* That remains T0 repository evidence.

| Layer | Artifact | Question |
|---|---|---|
| 1 | Transformation Constitution (owner-issued; not invented here) | What StitchFlow fundamentally believes |
| 2 | **This pack + ADR-001…011** | What decisions govern implementation |
| 3 | Phase Matrix + T0–T7 / Phases 13–19 | What is built, when, under which gates |

**Conflict hierarchy (binding):**

1. Owner-approved constitutional rules
2. Accepted ADRs (this pack)
3. Master Transformation Phase Matrix
4. Individual phase master prompts
5. Implementation convenience

Implementation convenience shall never override architecture governance.

When two ADRs appear to collide:

1. Domain truth (ADR-001)
2. Data integrity (ADR-002)
3. Security and governance (ADR-006, ADR-007)
4. Architectural boundaries (ADR-009, ADR-010)
5. Product experience (ADR-008)
6. Delivery speed

---

## 2. What this pack is not

- Not a license to start T1. T1 requires **owner acceptance of T0 and of this pack**.
- Not a rewrite of the repository. Current code may **violate** several ADRs; that is why T1–T2 exist.
- Not permission to delete protected files in order to “comply.”
- Not the Transformation Constitution. This pack does not invent Level 1 text.
- Not a Bounded Context Map. Recommended later; not this artifact.
- Not a product roadmap, pricing policy, or marketing claim.

Silent architecture-through-code is **STOP-ADR-09**.

Quiet in-place edits of Accepted ADRs are forbidden. See [`DECISION_SUPERSESSION_POLICY.md`](../architecture/governance/DECISION_SUPERSESSION_POLICY.md).

---

## 3. Record index

| ID | Title | Classification | File |
|---|---|---|---|
| ADR-001 | Protected Domain Intelligence | Constitutional | [`ADR-001-protected-domain-intelligence.md`](../architecture/adr/ADR-001-protected-domain-intelligence.md) |
| ADR-002 | Offline-First Authority Model | Constitutional | [`ADR-002-offline-first-authority.md`](../architecture/adr/ADR-002-offline-first-authority.md) |
| ADR-003 | Canonical Domain Vocabulary | Constitutional | [`ADR-003-canonical-domain-vocabulary.md`](../architecture/adr/ADR-003-canonical-domain-vocabulary.md) |
| ADR-004 | AI Advisory Boundary | Constitutional | [`ADR-004-ai-advisory-boundary.md`](../architecture/adr/ADR-004-ai-advisory-boundary.md) |
| ADR-005 | 3D Dependency Boundary | Constitutional | [`ADR-005-3d-dependency-boundary.md`](../architecture/adr/ADR-005-3d-dependency-boundary.md) |
| ADR-006 | Commercial Platform Governance | Constitutional | [`ADR-006-commercial-platform-governance.md`](../architecture/adr/ADR-006-commercial-platform-governance.md) |
| ADR-007 | AGBOFA Platform Control Center Authority | Constitutional | [`ADR-007-agbofa-control-center-authority.md`](../architecture/adr/ADR-007-agbofa-control-center-authority.md) |
| ADR-008 | Experience System as an Architectural Requirement | Constitutional | [`ADR-008-experience-system-requirement.md`](../architecture/adr/ADR-008-experience-system-requirement.md) |
| ADR-009 | One Authoritative Backend Runtime | Foundational | [`ADR-009-authoritative-backend-runtime.md`](../architecture/adr/ADR-009-authoritative-backend-runtime.md) |
| ADR-010 | Contract-First Integration | Foundational | [`ADR-010-contract-first-integration.md`](../architecture/adr/ADR-010-contract-first-integration.md) |
| ADR-011 | Configuration over Hardcoding | Platform Constitutional | [`ADR-011-configuration-over-hardcoding.md`](../architecture/adr/ADR-011-configuration-over-hardcoding.md) |

Supporting governance:

| Artifact | Path |
|---|---|
| Architecture index | [`docs/architecture/README.md`](../architecture/README.md) |
| ADR index | [`docs/architecture/adr/README.md`](../architecture/adr/README.md) |
| Constitution index (pointer only) | [`docs/architecture/governance/ARCHITECTURE_CONSTITUTION.md`](../architecture/governance/ARCHITECTURE_CONSTITUTION.md) |
| Gate register | [`docs/architecture/governance/ARCHITECTURE_GATE_REGISTER.md`](../architecture/governance/ARCHITECTURE_GATE_REGISTER.md) |
| Supersession policy | [`docs/architecture/governance/DECISION_SUPERSESSION_POLICY.md`](../architecture/governance/DECISION_SUPERSESSION_POLICY.md) |
| Canonical vocabulary | [`docs/domain/CANONICAL_DOMAIN_VOCABULARY.md`](../domain/CANONICAL_DOMAIN_VOCABULARY.md) |

T0 evidence (current truth, not future law):

| ID | Path |
|---|---|
| T0.1 | [`T0_REPOSITORY_TRUTH_REPORT.md`](./T0_REPOSITORY_TRUTH_REPORT.md) |
| T0.2 | [`docs/architecture/PROTECTED_ASSET_REGISTRY.md`](../architecture/PROTECTED_ASSET_REGISTRY.md) |
| T0.3 | [`docs/architecture/RUNTIME_TRUTH_MAP.md`](../architecture/RUNTIME_TRUTH_MAP.md) |
| T0.4 | [`docs/architecture/DOMAIN_INTELLIGENCE_MAP.md`](../architecture/DOMAIN_INTELLIGENCE_MAP.md) |
| T0.5 | [`docs/architecture/DATA_AUTHORITY_MAP.md`](../architecture/DATA_AUTHORITY_MAP.md) |
| T0.6 | [`T0_RISK_REGISTER.md`](./T0_RISK_REGISTER.md) |
| Gate | [`T0_ARCHITECTURE_GATE.md`](./T0_ARCHITECTURE_GATE.md) |

---

## 4. One-line laws

| ADR | Binding sentence |
|---|---|
| 001 | Preserve protected domain behavior before improving structure. |
| 002 | Offline-first is explicit local store + sync — not business SoT in localStorage. |
| 003 | One canonical name per business concept; synonyms must be declared. |
| 004 | AI may advise; AI must not silently become deterministic authority. |
| 005 | 3D consumes trusted tailoring truth; it never authors it. |
| 006 | StitchFlow consumes commercial authority; it does not hardcode it. |
| 007 | AGBOFA Control Center governs platform configuration; Studio does not. |
| 008 | Experience quality is an acceptance criterion, not a later polish pass. |
| 009 | One identifiable authoritative application runtime. |
| 010 | Cross-layer communication is contract-governed. |
| 011 | Operational policy is configuration; deterministic domain truth is code + tests. |

---

## 5. T0 compliance vs ADR (FACT)

ADRs govern **implementation from this point**. They do not rewrite git history.

| ADR | Current repository (T0 FACT) | Programme implication |
|---|---|---|
| 001 | Protected files located and frozen. Untested. UI-coupled Design Studio. | Do not rewrite. Extraction later with fixtures. |
| 002 | **Violated.** localStorage is primary for studio/ops. No IndexedDB, no sync engine. Accidental local-first, not offline-first. | T2 exists to close this. New work must not deepen localStorage as SoT. |
| 003 | **Drift present.** Dual Customer types, mixed measurement names, dual tier names, brand aliases. | Glossary starts now. Mass-rename is T3+, not T1. |
| 004 | Heuristics labeled “AI”. No model pipeline. | Do not relabel as Phase 17. Do not add silent mutation. |
| 005 | No 3D stack. Design Studio is 2D. | Do not add 3D libraries in T1–T7. |
| 006 | Simulated FeatureGate; two price tables; unused license SQL. | Do not add a third table. Phase 19 owns commercial platform. |
| 007 | No Control Center in this repo. | Do not implement it inside Studio. |
| 008 | No token system, no router, mixed visual language. | Applies from T4. Not a T1 design-system requirement. |
| 009 | **Violated.** npm starts stub `server.ts`; `app.ts` unmounted; `apps/api` unpackaged. | T1 is mandatory. Do not delete `app.ts` in favor of the stub. |
| 010 | **Violated.** Dual env names, dual paths, DTO mismatch, no shared contract package. | T1 deliverable: `API_CONTRACT_BASELINE.md`. |
| 011 | Hardcoded CORS, ports, stub payloads, prices, ranges. | T1 may env-drive runtime config. Not Control Center. |

**Do not “comply” by deleting protected files.** That violates ADR-001.

---

## 6. Agent constitutional instructions

1. Read applicable ADRs before modifying architecture.
2. If implementation conflicts with an ADR: **STOP**.
3. Do not modify protected domain intelligence without regression evidence (ADR-001).
4. Do not introduce a persistence path outside ADR-002.
5. Do not create duplicate domain terminology (ADR-003 / STOP-ADR-08).
6. Do not allow AI output to silently mutate deterministic truth (ADR-004).
7. Do not begin Level 3 3D fitting before ADR-005 gates.
8. Do not hardcode commercial policy (ADR-006, ADR-011).
9. Do not bypass AGBOFA Control Center authority (ADR-007).
10. If a decision does not exist: observe → document → propose ADR → wait. Do not invent it in code (STOP-ADR-09).

Stop conditions: [`ARCHITECTURE_GATE_REGISTER.md`](../architecture/governance/ARCHITECTURE_GATE_REGISTER.md) STOP-ADR-01 … STOP-ADR-09.

---

## 7. Phase coupling (authorization, not a schedule)

| Stage | ADRs that constrain it | Authorized by this pack alone? |
|---|---|---|
| T0 | All as documentation of current vs law | T0 pack already written; owner Gate J still pending |
| T1 | 009, 010, 011 (runtime); 001 freeze; 006/007 not implemented | **No** — owner YES on T0 + this pack |
| T2 | 002, 010; 001 freeze | No — after T1 gates |
| T3 | 003, 001 extraction prep | No |
| T4–T5 | 008, 001 (consume, do not reimplement) | No |
| T6–T7 | 001 extraction, 010 contracts, 008 | No |
| Phase 17 AI | 004 after deterministic core trusted | No |
| 3D | 005 | No |
| Phase 19 commercial / Control Center | 006, 007, 011 | No |

Forbidden until separately authorized: Design Studio rewrite, engine rewrite, backend replace, AI, 3D, billing, DB migrate, delete legacy.

---

## 8. FACT vs INFERENCE vs PROPOSAL (pack discipline)

| Kind | Meaning in this pack |
|---|---|
| FACT | Observed in T0 evidence or stated as current repo behavior |
| INFERENCE | Reasonable reading of T0; not proven at runtime |
| PROPOSAL | Target architecture; not implemented |

ADRs themselves are **decisions** (law). Their Context sections mix FACT (T0) with the decision. Agents must not treat a target diagram as a running system.

Example: ADR-002’s IndexedDB + sync engine is **PROPOSAL / target**. T0 FACT is localStorage + stub HTTP.

---

## 9. Owner acceptance checklist

This pack is **not operational as a programme unlock** until the owner completes this checklist.

Copy, mark, and return. Do not apply git tags `transformation-t0-*` until T0 Gate J is also YES.

```
ADR MASTER PACK ACCEPTANCE
Date:
Owner:

[ ] I accept ADR-001 Protected Domain Intelligence as law.
[ ] I accept ADR-002 Offline-First Authority Model as law
    (and acknowledge the repo currently violates it).
[ ] I accept ADR-003 Canonical Domain Vocabulary as law
    (starter glossary; no mass-rename in T1).
[ ] I accept ADR-004 AI Advisory Boundary as law.
[ ] I accept ADR-005 3D Dependency Boundary as law.
[ ] I accept ADR-006 Commercial Platform Governance as law.
[ ] I accept ADR-007 AGBOFA Control Center Authority as law
    (and that Control Center is not a T1/T5/T6 deliverable).
[ ] I accept ADR-008 Experience System as an acceptance criterion
    (from T4 onward).
[ ] I accept ADR-009 One Authoritative Backend Runtime as law
    (and acknowledge the repo currently violates it).
[ ] I accept ADR-010 Contract-First Integration as law
    (and acknowledge current contract drift).
[ ] I accept ADR-011 Configuration over Hardcoding as law.
[ ] I accept the conflict hierarchy in §1.
[ ] I accept STOP-ADR-01 … STOP-ADR-09.
[ ] I accept that T1 is NOT authorized until I also accept T0 Gate J.
[ ] I accept that ADRs must not be quietly edited; supersession requires a new ADR.

PROCEED TO T1 AFTER T0 GATE J?
YES / NO / YES WITH CONDITIONS

Conditions (if any):

Notes:
```

---

## 10. After owner YES (still not T1 execution)

When the owner accepts this pack **and** T0 Gate J:

1. Programme position becomes: T1 authorized under Phase Matrix T1 constraints.
2. First T1 forensic steps remain non-redesign (U3/U4 typecheck/test as documented in T0 gate).
3. T1 must produce one authoritative runtime (ADR-009) and a contract baseline (ADR-010).
4. Protected engines remain frozen (ADR-001).
5. Git tags for T0 may be applied only if the T0 gate document’s owner block is also YES.

Until then: **audit/governance only.** No product/code changes, no installs, no deletions.

---

**Pack complete as documentation.** Owner checklist (§9) is PENDING.
