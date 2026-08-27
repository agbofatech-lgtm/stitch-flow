# PHASE 5 — OFFLINE COMMERCIAL SEMANTICS

StitchFlow is offline-first; commercial authorization is server-authoritative. These two facts are reconciled by ONE principle:

> **Offline continuity applies to the tailor's own business data. It never applies to commercial authorization.**

## The distinction (Step 26)

### Non-sensitive local work — continues offline (existing architecture, unchanged)
Creating/editing customers, orders, measurements, invoices, production stages and recording tailor-customer payments offline keeps working exactly as built in Phases 3.5/4: written to IndexedDB, queued (`syncQueue`), pushed on reconnect. An expired remote subscription NEVER locks a tailor out of data already on their device — the tailor's business records are their property.

### Commercially sensitive operations — require the server
Plan changes (checkout/cancel), entitlement resolution, trial state and premium **server** features (e.g. the low-stock report) are server round-trips. Offline they simply fail like any other network call — there is no offline path that mints authorization.

## What the client caches, and what the cache CANNOT do

`stitchflow.billing.entitlements` (localStorage, written by `shared/api/billing.ts`) holds the last server-resolved entitlements + `fetchedAt`, used ONLY to render plan/status badges (marked "(cached)" when offline). Because **no client code path feeds cached/local commercial state into an authorization decision**, editing this cache, IndexedDB, the client clock or any request body/query/header changes pixels, not permissions — the backend re-derives `user → membership → subscription → plan → limits → usage` on every enforced request (forgery-tested, PHASE5_SECURITY_MATRIX.md #4–7).

## Defined behaviors

| Scenario | Behavior |
|---|---|
| Offline, cached subscription exists | UI shows cached plan/status "(cached)"; local business work continues |
| Subscription expires remotely while offline | Device keeps working locally (data is the tailor's). On next connectivity, entitlement refresh shows BASIC and **server-enforced** operations (customer creation via API, member invites, premium reports, checkout) enforce BASIC limits |
| Premium **server** operation attempted offline | Fails as a network error; nothing is granted locally |
| Premium **client-rendered** feature offline (PDF export, pattern generation on device) | Governed by last-known entitlements as UX gating. This is display-level honor-system by the nature of client-side rendering — the protected IP still executes on-device. Documented limitation (risk P2-COM-002); server-side surfaces of the same value (reports API, sync-backed data) remain enforced |
| Sync of queued offline work after remote downgrade | Sync push (state-lane `/sync/mutations`) is logged server-side (Phase 3 design: state-lane mutations are recorded, not materialized), and event-lane endpoints keep their existing integrity gates. Direct API creations enforce limits at request time. Queued offline work is never silently destroyed (Step 27 analogue for business data) |
| Trial "extension" via device clock | Impossible: expiry compares `trial_end` to the SERVER clock |

## Why offline creation is not a limit bypass in practice

The enforceable commercial surface is the server: accounts whose clients sync (the normal, valuable mode) hit server enforcement at API/sync time; a device that never syncs consumes no server resources and gains nothing durable. Tightening sync-lane reconciliation of over-limit offline creations (e.g. flagging over-limit rows at delta application) is recorded as **P2-COM-001** for Phase 6/7 — deliberately not invented ad-hoc here to avoid unsafe data-destroying behavior (Step 26: "Do not invent unsafe behavior").
