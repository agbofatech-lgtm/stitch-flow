# PHASE 5 — RISK REGISTER

Status date: 2026-08-27. P0 = release blocker, P1 = critical, P2 = important, P3 = enhancement.

## P0 — none open
Cross-tenant billing access, entitlement bypass, payment corruption, webhook forgery acceptance, destructive migration: all tested-against and PASS (PHASE5_SECURITY_MATRIX.md).

## P1 — none open
Subscription state corruption (state machine + tests), duplicate billing events (unique key + 2×/10×/concurrent tests), trial bypass (server clock), concurrency limit bypass (lock + race tests): all covered.

## P2 — important (open, accepted for Phase 5 with rationale)

| Id | Risk | Notes / mitigation |
|---|---|---|
| P2-COM-001 | Offline creations sync-pushed after a remote downgrade are not re-reconciled against plan limits at the sync lane | Direct API creation IS enforced; state-lane sync mutations are logged not materialized (Phase 3 design). Reconciliation policy deferred to Phase 6/7 to avoid inventing data-destroying behavior (PHASE5_OFFLINE_COMMERCIAL_SEMANTICS.md) |
| P2-COM-002 | Client-rendered premium features (PDF export, on-device pattern generation) are UX-gated only when offline | Inherent to client-side rendering of on-device IP; server surfaces enforced. Candidate hardening (entitlement-signed feature tokens) is a later-phase option |
| P2-COM-003 | No automated `past_due`/`cancelled → expired` scheduler; expiry of those states relies on provider events or operator action (trial + period-end expiry ARE lazy-evaluated server-side) | Operational procedure documented in PHASE5_DATABASE_MIGRATION/OPERATIONS notes; a scheduled job is a Phase 6 deployment concern (needs real infra) |
| P2-COM-004 | Live Paystack path unverified (no credentials) | Boundary implemented + fixture-tested; EXTERNAL CREDENTIAL REQUIRED; Phase 6 validates with a real sandbox/live key |
| P2-R1 (inherited) | UI read-path still AppContext/localStorage with IDB mirror | unchanged from Phase 4 |
| P2-R2 (inherited) | Browser PWA validation not executable in sandbox | unchanged; procedure documented (Phase 4) |
| P2-SYNC-001 (inherited) | Sync cursor regression after DB restore | operator procedure documented (Phase 4) |
| P2-DEP-001 (inherited) | `uuid` moderate advisory (unused code path; major bump declined) | unchanged |

## P3 — enhancements

| Id | Risk / item |
|---|---|
| P3-COM-001 | Billing UX (plans page, upgrade flow UI, in-app paywall messaging) — Phase 7 commercial workflows; AccountPanel badge is the Phase 5 surface |
| P3-COM-002 | `subscription.paused/resumed` unused by the Paystack mapping today (supported by machine + test provider for future providers/ops tooling) |
| P3-COM-003 | Client `tierEnforcement.ts` still evaluates against mock data for UX affordances; migrate its inputs to the server entitlement cache when the read-path work (P2-R1) lands |
| P3-COM-004 | Legacy `register(tier)` request field still creates per-user licenses (device licensing); consider decoupling registration from license tier naming in a later phase |
| P3-MIG-001 / P3-MOB-001 / P3-LINT-001 (inherited) | migration advisory lock; capacitor appId mismatch; 16 protected-file lint findings — unchanged from Phase 4 |

## Closed by Phase 5
- "No real billing system exists" (Phase 5 baseline finding) → commercial foundation implemented.
- "Client-side trial/tier state is forgeable authority" → server-authoritative subscription/trial; client state demoted to display.
- "Two conflicting tier vocabularies" → BASIC/PRO/STUDIO canonical server-side; legacy licensing mapped + documented.
