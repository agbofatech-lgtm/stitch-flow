# Decision Supersession Policy

**Status:** Active  
**Date:** 2026-08-31  
**Authority:** Principal Architecture Governance

An ADR is not edited casually after it is Accepted.

## Change control

```
PROBLEM DISCOVERED
       │
       ▼
ARCHITECTURE REVIEW
       │
       ▼
NEW ADR PROPOSED
       │
       ▼
IMPACT ANALYSIS
       │
       ▼
OWNER APPROVAL
       │
       ▼
NEW ADR ACCEPTED
       │
       ▼
OLD ADR SUPERSEDED
       │
       ▼
MIGRATION PLAN
```

**Never** quietly edit an Accepted ADR in place. That destroys architectural history.

## Status machine

Proposed → Accepted (Active) → Superseded | Deprecated → Retired

- **Proposed:** not constitutional truth.
- **Accepted / Active:** binding.
- **Superseded:** replaced by a named newer ADR; file remains.
- **Deprecated:** not for new work; still documented.
- **Retired:** no longer applicable.

## Amendment fields required on the new ADR

- Supersedes: ADR-XXX
- Why the prior decision failed or became insufficient
- Migration plan for code, contracts, and docs
- Owner approval reference

## Agent rule

If implementation needs a decision that contradicts an Active ADR: **STOP**. Propose a new ADR. Do not invent an interpretation.
