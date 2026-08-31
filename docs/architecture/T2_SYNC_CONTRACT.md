# T2 Sync Contract

## Operation

| Field | Meaning |
|---|---|
| operationId | Idempotency key |
| entity | Canonical entity name |
| entityLocalId | Local record id |
| operationType | create \| update \| delete |
| payload | Serialized body |
| expectedVersion | Local version at enqueue |
| createdAt | ISO time |
| attemptCount | Incremented on process |
| status | pending \| syncing \| acked \| failed \| conflict |
| lastError | Transport / policy error |

## Acknowledgement (when remote exists)

`{ remoteId?, remoteVersion }`

If `compareVersions(local, remote)` is `conflict` and policy is not server-authoritative: **do not overwrite**.

## Current remote

Business push is `blockedBusinessApiTransport`:

> T1 unauthenticated business CRUD is not mounted.

Queue remains durable. Status `failed` with that error. Retry does not duplicate entities.

Health probe (reachability, not sync ack): `GET {API}/health` must report `runtime: apps/backend/src/app.ts`.
