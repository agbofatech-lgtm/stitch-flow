# Phase 8 — Webhook Delivery Infrastructure (Subsystem 2)

Status: **IMPLEMENTED + TESTED** (checkpoint `phase-8-webhooks`). The delivery network path IS exercised in tests via a real local HTTP receiver. This is **not** external-production-verified (see Limitations).

Builds ON `integration_outbox` (Phase 7) — no competing event system. Outbox = durable event queue; new tables add endpoint registration + delivery tracking.

## Data model (migration 016)

**`webhook_endpoints`** (tenant-scoped): `url`, `status active|disabled`, `subscribed_events TEXT[]` (exact event types, or `@all`), per-endpoint bounded retry policy (`max_attempts` 1–10 default 8, `backoff_base_seconds` 0–3600 default 30), `secret_prefix` (identification), `secret_encrypted`, `failure_count`, `last_delivery_at`.

**`webhook_deliveries`** (tenant-scoped, **one row per attempt**): `delivery_key` UNIQUE = `outbox:endpoint:attempt` (idempotent delivery identifier), `endpoint_id` FK **SET NULL** (history outlives endpoint deletion), response status/time, `next_retry_at`, `failure_reason`. State machine:

```
PENDING ──▶ DELIVERING ──▶ DELIVERED
                │ transient (network/timeout/5xx/429)
                ├─▶ RETRYING (marker; NEW PENDING row scheduled at backoff)
                └─▶ DEAD_LETTER (permanent 4xx, or attempts exhausted)
```

## Secrets & signing

- Secret generated server-side (`whsec_` + 192-bit base64url), displayed **once** at creation, never returned again, never logged.
- Storage: **AES-256-GCM envelope** (`v1.iv.tag.ct`, `src/utils/secretBox.ts`). Rationale: an *outgoing-signing* secret must be retrievable to sign every delivery — a one-way hash cannot sign. GCM keeps it non-plaintext at rest and tamper-evident. Key: `WEBHOOK_ENCRYPTION_KEY` (falls back to a value derived from `JWT_SECRET`; rotating either invalidates envelopes — documented).
- Signature header: `X-StitchFlow-Signature: t=<unix_seconds>,v1=<hex>` where `v1 = HMAC-SHA256(secret, "<t>.<body>")`. Also sent: `X-StitchFlow-Event`, `X-StitchFlow-Delivery` (delivery row id), `X-StitchFlow-Workspace`.
- `verifyWebhookSignature()` (exported for receivers/tests): ±300 s timestamp tolerance → `WEBHOOK_REPLAY_REJECTED`; HMAC compared with `timingSafeEqual` → `WEBHOOK_SIGNATURE_INVALID`. Replay protection requires receivers to enforce the timestamp tolerance (documented receiver contract).

## Retry / dead-letter / replay

- Transient: network error, timeout, HTTP 5xx, 429 → next attempt at `base × 2^(attempt−1)` (bounded by `max_attempts`; no infinite retries).
- Permanent: other 4xx → **immediate DEAD_LETTER** (retrying cannot change the outcome).
- DEAD_LETTER rows stay inspectable (`GET /webhooks/dead-letters`) and are replayable (`POST /webhooks/dead-letters/:id/replay`) by the endpoint's workspace staff — replay creates a **new attempt row** (attempt n+1); history is never mutated.
- Delivery timeout: `WEBHOOK_DELIVERY_TIMEOUT_MS` (default 10 000), AbortController-enforced, read at call time.
- Stale `DELIVERING` rows (crashed worker) are auto-recovered after 2× the timeout window.

## Engine & non-blocking guarantees

- `webhookService.dispatchOutbox()` — claims PENDING outbox rows (`FOR UPDATE SKIP LOCKED`), matches active subscribed endpoints, inserts idempotent delivery rows, marks outbox `DISPATCHED` (or `SKIPPED` when no subscribers — never stuck PENDING).
- `webhookService.drainOnce()` — claims due deliveries, performs the HTTP POST, records outcome.
- After every `outboxService.record()` a drain is **scheduled off the response path** (single-flight, `.unref()`'d timer) — business transactions are never blocked by webhook delivery, and failures never bubble into business flows.
- Manual/ops trigger: `POST /platform/webhooks/dispatch` (platform `operate` role) — the worker contract until a dedicated worker exists.

## SSRF policy (`src/security/webhookUrlPolicy.ts`)

Enforced at registration, at edit, and **re-checked on every delivery attempt**. Rejects: non-http(s) schemes, credentials-in-URL, malformed URLs, and (unless explicitly allowed) loopback (`127.0.0.0/8`, `::1`, `localhost`, `*.localhost`), RFC1918 private ranges, link-local `169.254.0.0/16` (incl. cloud metadata `169.254.169.254`), CGNAT `100.64.0.0/10`, IPv6 unique-local `fc00::/7`, `metadata.google.internal`, `*.internal`, `0.0.0.0/8`. Private destinations are allowed only when `WEBHOOK_ALLOW_PRIVATE_DESTINATIONS=true` or `NODE_ENV=test` (local test receivers).

**Documented limitation:** a public hostname that later resolves to a private address (DNS rebinding) is not fully mitigable without resolved-IP pinning in the HTTP client. Mitigation path: route deliveries through a dedicated egress proxy with IP pinning (deferred; see PHASE8_SECURITY.md risk register). Registration-time + per-attempt literal checks close every non-rebinding case.

## Management API (`/webhooks`, staff JWT + workspace, `WEBHOOK_MANAGEMENT` flag default OFF)

| Method | Path | Notes |
|---|---|---|
| POST | `/endpoints` | 201 `{endpoint, secret}` — one-time secret; audited |
| GET | `/endpoints` | + per-endpoint delivery stats |
| PATCH | `/endpoints/:id` | url (re-SSRF-checked)/status/events/description; audited |
| DELETE | `/endpoints/:id` | deliveries preserved (FK SET NULL); audited |
| POST | `/endpoints/:id/test` | `webhook.test` event through the REAL pipeline |
| GET | `/deliveries?status=` | workspace-scoped history |
| GET | `/dead-letters` | workspace-scoped |
| POST | `/dead-letters/:id/replay` | new attempt; cross-tenant → 404; audited |

Error codes: `WEBHOOK_NOT_FOUND`, `WEBHOOK_DISABLED`, `UNSAFE_WEBHOOK_URL:<reason>`, `INVALID_EVENTS`, `INVALID_RETRY_POLICY`, `FEATURE_DISABLED`. API keys/portal tokens/anonymous are structurally rejected (401).

## Test evidence

`tests/phase8-webhooks.test.ts` — **22 tests**: signature determinism/tamper/replay-window/malformed; SSRF policy (11 blocked destinations in prod mode, test-mode allowance, scheme/credential rejection); flag fail-closed; one-time secret + non-plaintext storage + audit; malformed registrations; edit/disable/delete + audit; tenant isolation (endpoints + deliveries + replay); auth boundary (API key/portal/anonymous); real delivery with verifiable signature + envelope + response recording; event filtering + SKIPPED semantics; double-dispatch idempotency; exponential-backoff retry to success (per-attempt rows); bounded dead-letter; permanent-4xx immediate dead-letter; timeout-as-transient; dead-letter replay with intact history + cross-tenant rejection; test-event pipeline.

Full battery: **23/23 suites, 256/256 tests**. Backend tsc PASS, web tsc PASS, web lint unchanged (16 pre-existing), protected IP zero-diff.

## Limitations / honesty notes

- Runtime network path exercised against a **local** receiver (127.0.0.1) under the documented test-mode SSRF allowance — **NOT external-production-verified** (real HTTPS destinations, TLS behavior, internet egress) → external gate.
- No persistent worker process yet: drains happen post-response (scheduled) + manual ops trigger. A dedicated worker/cron calling `dispatchOutbox()+drainOnce()` is the deployment contract (documented in PHASE8_OPERATIONS.md).
- DNS-rebinding limitation documented above.
