# 11 — Internal vs Public API Boundary

## Internal product API (SAC)

```
Web atelier
  → Repository (T2)
  → Authenticated shop API (future SAC-3)
  → Database (future SAC-4)
```

Plus already-internal platform:

```
Control Center / auth clients
  → /auth /platform /control
  → file/memory (SAC-4 may move platform to Postgres separately)
```

SAC owns: identity wiring to shop data, tenant-aware CRUD, contract alignment, not a partner gateway.

## Future public API platform (Phase 20)

```
StitchFlow
  → API Gateway
  → Partners / mobile native / integrations
```

**LOCKED.** Not started. Laptop `API_READINESS.md` is inventory only.

Must not: revive `apps/api` as second authority; publish Pattern Engine over HTTP without auth; treat `docs/api.md` `/api/v1` as live.

## Boundary

| Concern | SAC | Phase 20 |
|---|---|---|
| Authenticated shop routes for the web app | **Yes** | No |
| Tenant isolation on shop tables | **Yes** | Consumes |
| Public partner keys, versioned public gateway | No | **Yes** |
| 3D | No | No (separate ADR-005 programme) |
| PSP / commercial | P19 already; not SAC shop | No |
