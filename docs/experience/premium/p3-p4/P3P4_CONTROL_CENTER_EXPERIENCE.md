# Control Center Experience

FACT

- Distinct plane via `data-plane="control"` and `data-theme="dark"`.
- Login still `/auth/login`. Planes still `/control/{status,tenants,configuration,audit,billing/provider}`.
- No invented metrics. Empty JSON remains empty.
- FeatureGate / billing semantics unchanged.
- Tenant 403 remains expected for tenant tokens.

CONDITIONAL: operator UX is clearer; payload is still raw JSON until a later presentation pass that does not invent numbers.
