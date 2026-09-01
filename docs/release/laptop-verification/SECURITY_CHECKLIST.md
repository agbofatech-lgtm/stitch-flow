# Security checklist (pre-release inspection — not a certification)

**Not claimed:** PCI, SOC, pen-test, production security certified.

## Secrets

- [ ] `.env` is gitignored
- [ ] `.env.example` contains names and placeholders only
- [ ] No live PSP / LLM keys in git (scan at preparation: no `sk_live`, no `AIza`, no PEM)

## AuthZ

- [ ] `/control/*` requires identity + platform operator
- [ ] `/platform/*` commercial routes require identity + tenant context (except webhook)
- [ ] Webhook path is adapter HMAC, not “trust body”
- [ ] FeatureGate cannot grant server entitlement
- [ ] `MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES` default false

## HTTP

- Helmet on API with CORP `cross-origin` (so Vite `:5173` is not blocked)
- CORS `origin: true` (wide — CONDITIONAL, not hardened allow-list)
- Rate limit: present on some paths (inspect `apps/backend/src` if tightening later)

## Debug

No public debug endpoint that dumps JWT secrets found in `createApp`. Request logging includes origin/UA — do not log tokens.

## Tenant isolation

P19 tests cover isolation claims. Postgres not verified — file/memory store is TRANSITIONAL.
