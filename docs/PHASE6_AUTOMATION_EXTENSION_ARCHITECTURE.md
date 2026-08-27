# STITCHFLOW PHASE 6 — FUTURE n8n / AUTOMATION EXTENSION ARCHITECTURE

**Status: documentation only. Phase 6 introduces NO n8n dependency, NO webhook fan-out, NO event bus. The boundaries below describe how a later phase MAY attach automation.**

## Event vocabulary (already materialized as data)

Phase 6 did not need a new event bus because the durable records already exist and are queryable:

| Future event | Durable source (today) | Correlation |
|---|---|---|
| workspace.created / customer.created / customer.updated | `audit_logs` (CUSTOMER_CREATED/UPDATED…) | workspace_id + request_id |
| order.created / order.status_changed | `audit_logs` (ORDER_CREATED, ORDER_STATUS_CHANGED w/ from→to) | same |
| invoice.created / payment.created | `audit_logs` (INVOICE_CREATED, PAYMENT_CREATED) | same |
| material.used / material.restored | `audit_logs` (MATERIAL_USED/RESTORED) | same |
| subscription.created / subscription.changed | `subscriptions` + `billing_events` ledger + commercial audit | provider_event_id (idempotent) |
| sync.failed / authentication.failed | metrics counters + pino logs | request_id |

A later automation phase can expose these as push events (outbox table + dispatcher) without changing any producer — the producers already write transactionally.

## n8n attachment boundary (future)

```
StitchFlow durable events (audit_logs / billing_events / outbox)
        → Event Adapter (read-only poller or outbox dispatcher — future)
        → n8n webhook (HTTPS, signature-verified, same pattern as /billing/webhook)
```

Recommended future workflows: order ready → notify · payment received → receipt · subscription renewal/failure → dunning · workspace inactive → lifecycle · incident created → page.

## Rules carried forward

- Outbound automation must NEVER be on the critical path of a mutation (post-commit only).
- Webhook secrets follow the SERVER-ONLY matrix; verification is timing-safe over raw body (the Paystack webhook implementation is the in-house reference).
- Provider retries must be idempotent (the billing-events UNIQUE(provider, provider_event_id) ledger is the reference pattern).

**NOT REQUIRED FOR PHASE 6.**
