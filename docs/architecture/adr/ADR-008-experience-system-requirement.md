# ADR-008 — Experience System as an Architectural Requirement

| Field | Value |
|---|---|
| ADR ID | ADR-008 |
| Title | Experience System as an Architectural Requirement |
| Status | **Accepted / Active** |
| Date | 2026-08-31 |
| Authority | Principal Architecture Governance |
| Classification | Constitutional |
| Scope | Frontend and product experience |
| Supersession | None |

---

## Decision

The StitchFlow Experience System is not optional visual guidance. It is an **acceptance criterion**.

A feature is incomplete if it works technically but:

- violates workflow clarity
- creates cognitive overload
- breaks workspace consistency
- introduces generic SaaS patterns without purpose
- bypasses the Design System
- ignores responsive operational realities

Experience law:

> Every aesthetic decision must improve comprehension, confidence, focus, or action. Every functional decision must contribute to clarity, rhythm, and product character.

---

## Architecture consequence

```
Feature Definition
        ▼
UX Acceptance Criteria
        ▼
Component Selection
        ▼
Implementation
        ▼
Visual QA
        ▼
Owner Acceptance
```

Not: Implementation → “Make it beautiful later.”

---

## Context

T4–T5 in the Phase Matrix create tokens, primitives, and Studio shell **before** migrating workflows. T0 FACT: current UI is large custom screens, no design-token system, no router, mixed visual language.

---

## Constraints

Do not copy the old sidebar into a new color scheme and call it Studio (T5 forbidden work).

Do not embed domain calculations into the shell (ADR-001).

Experience cannot override domain truth (conflict priority 5 vs 1).

---

## Enforcement

Experience acceptance review (Gate H). Applies from T4 onward. T1 backend work is not required to ship a design system.
