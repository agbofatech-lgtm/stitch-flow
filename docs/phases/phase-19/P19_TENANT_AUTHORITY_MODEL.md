# P19 Tenant Authority Model

Status: **IMPLEMENTED (runtime, transitional persistence)**.

Tenant answers **which isolated organization**. It is the security, commercial-account, and ownership boundary (OD-P19-01).

`tenantId === workspaceId` is **forbidden** as an assumption. Bootstrap creates **different** UUIDs.

Statuses: `active` | `suspended`.

**ABSENT previously.** **TRANSITIONAL** store now. Not Postgres.

Commercial subscriptions are **not** on Tenant this slice (STOP-P19-IDENTITY-K/L).
