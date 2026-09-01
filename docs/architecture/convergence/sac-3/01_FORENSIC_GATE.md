# Forensic Gate

Reuse P19: JWT `sub`+`typ`, `requireIdentity`, `requireTenantContext` (hint `X-Tenant-Id`, verify membership). No refresh/logout.

Tenant ≠ Workspace (register creates distinct ids).

Legacy `/customers` etc. SQL + unauthenticated — **MUST REMAIN LEGACY**. New `/shop` wrapper.

Persistence: platform file/memory; shop SAC-3 **memory**. Postgres not-verified.

T2 outbox stays blocked (SAC-5). `/shop` contracts are idempotency-ready (server-assigned ids).
