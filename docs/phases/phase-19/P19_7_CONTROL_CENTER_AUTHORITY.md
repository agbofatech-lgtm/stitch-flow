# P19.7 Control Center Authority

Platform operator: `store.platformOperators` (granted in tests via runtime; **no public HTTP promote**).

Tenant register does **not** create a platform operator.

Tenant token → `/control/*` → 403 `PLATFORM_ADMIN_REQUIRED`.
