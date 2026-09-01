# P19 Tenant Isolation Model

```
Request → Bearer JWT → Identity
       → Membership (active)
       → Tenant (active)
       → TrustedPlatformContext
       → Tenant-scoped query
```

`X-Tenant-Id` is a **hint**, accepted only if membership exists. Otherwise `TENANT_ISOLATION`.

localStorage tenant/workspace ids are **not** used by the backend.

Isolation fixture: `GET/POST /platform/records` — platform-owned notes, **not** shop Customer (avoids second Customer SoT).

Shop CRUD remains unmounted by default and **unscoped** if mounted — still a leak **risk** for those routes (documented, not “fixed” by exposing them).
