# P19.10 Identity / Tenancy / Security

| Check | Result |
|---|---|
| Register + distinct tenant/workspace | PASS |
| Login valid/invalid | PASS |
| Missing/malformed/invalid/expired token | PASS |
| Inactive identity | PASS |
| JWT extra role/operator claims | PASS (MALFORMED_TOKEN) |
| Client operator fields | PASS (ignored) |
| HTTP operator grant | PASS (404, no route) |
| Cross-tenant read/write/spoof X-Tenant-Id | PASS |
| Tenant A payment isolation | PASS |
| Shop `/payments` unmounted | PASS (404) |
| USER ≠ OPERATOR | PASS |
| TENANT ≠ WORKSPACE | PASS |
| ROLE ≠ ENTITLEMENT | PASS |
| Logout / refresh | **NOT IMPLEMENTED** (not invented) |

Tenant isolation is certified for **mounted platform routes**. Legacy shop CRUD isolation is **NOT VERIFIED** because those routes are unmounted by default.
