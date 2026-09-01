# P19.5 Security Model

- Auth required except webhook (signature instead)
- Tenant membership for commercial reads
- Webhook HMAC SHA-256, timing-safe compare
- Secrets: env names only, never in JSON
- Idempotent event ids
- Audit: tenantId, actorId, eventId, previous/new state, timestamp — no credentials
- Not claimed: pentest, PCI, SOC2
