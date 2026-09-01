# P19.8 Webhook Security

HMAC SHA-256 `X-Billing-Signature`. Missing/invalid → 401.

Idempotency: same `eventId` → 200 duplicate, one subscription.

Replay/out-of-order: watermark.

Unknown type → 400.

Named PSP path → PROVIDER_DEFERRED.

LIVE PSP: **DEFERRED**.
