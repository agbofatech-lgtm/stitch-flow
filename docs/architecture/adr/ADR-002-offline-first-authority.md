# ADR-002 — Offline-First Authority Model

| Field | Value |
|---|---|
| ADR ID | ADR-002 |
| Title | Offline-First Authority Model |
| Status | **Accepted / Active** |
| Date | 2026-08-31 |
| Authority | Principal Architecture Governance |
| Classification | Constitutional |
| Scope | Data persistence, synchronization, frontend architecture |
| Supersession | None |

---

## Context

T0 mapped fragmented persistence:

```
React Component
      ├── localStorage
      └── REST API
```

Questions that cannot be answered consistently today: which copy is authoritative, what happens offline, after refresh, during conflicts, across devices, on sync failure.

**T0 FACT:** localStorage is currently the primary store for studio/ops domain data. That is **current reality**, not permitted future architecture. T2 exists to close this gap. New work must not deepen localStorage as business SoT.

See [`docs/architecture/DATA_AUTHORITY_MAP.md`](../DATA_AUTHORITY_MAP.md).

---

## Decision

StitchFlow shall adopt an **offline-first** architecture.

Offline-first does **not** mean: save everything in localStorage.

It means: local work is a first-class operational state governed by explicit synchronization architecture.

Target:

```
USER ACTION
     ▼
APPLICATION SERVICE
     ▼
DOMAIN REPOSITORY
     ├── LOCAL STORE (IndexedDB)
     └── SYNC ENGINE → PLATFORM API
```

---

## localStorage policy

**Not permitted** as primary persistence for:

- Customer records
- Measurement history
- Orders
- Production data
- Design artifacts
- Pattern artifacts
- Financial records

**Permitted:**

- UI preferences
- Non-critical display settings
- Temporary hints
- Small ephemeral state

---

## Synchronization metadata

Synchronizable entities must support metadata equivalent to:

```ts
interface SyncMetadata {
  localId: string;
  remoteId?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  syncStatus: "synced" | "pending" | "conflict" | "failed";
  lastSyncedAt?: string;
}
```

Exact fields may evolve. The architectural requirement may not.

---

## Data authority principle (target)

| Domain | Authority |
|---|---|
| Identity | Platform |
| Authentication | Platform |
| Customer working copy | Local-first |
| Measurement capture | Local-first |
| Finalized measurements | Server |
| Design draft | Local-first |
| Final design artifact | Server |
| Pattern output | Deterministic domain engine |
| Orders | Server |
| Production | Server |
| Billing | Commercial platform |
| Entitlements | Platform authority |

Conflict behavior must never be accidental. Silent overwrites are prohibited. Policies are **domain-specific** (no global last-write-wins).

---

## Constraints

- No new business-critical localStorage architecture.
- No direct component persistence of domain entities.
- Do not replace server authority with frontend state for Orders, Production, Billing.
- Do not claim the current repo is already offline-first (T0: it is not).

---

## Consequences

T2 is mandatory before product claims of offline capability. Existing localStorage remains until a migration with dual-read/dual-write is planned — migration is T2, not silent deletion in T1.

---

## Compliance evidence

Repository abstraction; IndexedDB implementation; sync queue; offline / reconnect / conflict tests.

**T0:** none of these exist. Absence is a T2 backlog item, not permission to ignore this ADR in new code.

---

## Enforcement

Repository + sync tests. STOP-ADR-02.
