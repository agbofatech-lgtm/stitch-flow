# Control Center checklist

Plane is separate (`data-plane=control`) from the atelier.

## Access

- [ ] Tenant Settings ≠ Control Center
- [ ] Sign-in form states tenant owners cannot become operators here
- [ ] Failed login shows error + dismiss, no fake dashboard

## After operator JWT

Nav groups (existing APIs only):

| Group | Plane | API |
|---|---|---|
| System | Overview | `GET /control/status` |
| System | Configuration | `GET /control/configuration` |
| Tenancy | Tenants | `GET /control/tenants` |
| Commercial | Billing | `GET /control/billing/provider` |
| Governance | Audit | `GET /control/audit` |

- [ ] Badges: Live PSP deferred, Postgres not verified
- [ ] Empty payload copy: “we do not invent metrics”
- [ ] Retry on plane error

Not present (do not invent): Plans product module, Usage, Account billing, fake $ revenue.
