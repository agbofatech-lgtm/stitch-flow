# P19.8 Billing State Machine

Verified webhook → payment confirmed → subscription ACTIVE → entitlements.

Failed/cancelled payment → no false activation.

`?payment=success` ignored.

Stale `occurredAt` < tenant watermark → `STALE_EVENT` (409), no overwrite.
