# ADR-004 — AI Advisory Boundary

| Field | Value |
|---|---|
| ADR ID | ADR-004 |
| Title | AI Advisory Boundary |
| Status | **Accepted / Active** |
| Date | 2026-08-31 |
| Authority | Principal Architecture Governance |
| Classification | Constitutional |
| Scope | Phase 17 and all future AI capabilities |
| Supersession | None |

---

## Fundamental law

> AI may advise deterministic systems. AI may not silently become deterministic authority.

---

## Context

T0 FACT: `productionAssistant.ts` and Design Studio copy use the word “AI” for **keyword/category heuristics**. That is not a model. Marketing must not treat it as Phase 17.

The temptation: because a model can recommend, implementations let it write operational truth (measurements, pattern points, prices, entitlements). That creates untraceable authority.

---

## Decision

StitchFlow AI shall operate as: **EXPLAIN, RECOMMEND, ANALYZE, DETECT, ASSIST**.

AI shall not silently overwrite protected deterministic truth.

Pipeline:

```
USER / SYSTEM CONTEXT
        ▼
AI ANALYSIS
        ▼
ADVISORY OUTPUT
        ▼
USER / AUTHORIZED SYSTEM REVIEW
        ▼
EXPLICIT ACCEPTANCE
        ▼
DETERMINISTIC DOMAIN ENGINE
```

Not: `AI → DATABASE UPDATE`.

---

## Permitted

Explain why a pattern or ease exists. Recommend fabric, fit adjustment, sequence. Analyze inconsistency or bottleneck. Detect missing measurement or unusual proportion.

---

## Required provenance (eventually)

Recommendation ID, model, prompt/context version, generated at, confidence, accepted / rejected / modified.

---

## Prohibited silent mutation

Body measurements; measurement history; pattern mathematics; deterministic pattern outputs; production truth; invoices; payments; subscription status; entitlements; audit records.

---

## Feature declaration (mandatory for any AI feature)

INPUT · MODEL ROLE · OUTPUT TYPE · AUTHORITY LEVEL · HUMAN APPROVAL REQUIREMENT · DOMAIN BOUNDARY

---

## Constraints

Phase 17 is unauthorized until Phases 13–16 deterministic core is trusted. Relabeling heuristics as “AI” in T4–T7 UI is an ADR-004 / marketing-integrity issue (also ADR-005 naming honesty).

STOP-ADR-04 if a feature requires automatic modification of deterministic data.

---

## Enforcement

AI feature authority review.
