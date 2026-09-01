# P19.5 Payment State Machine

```
CHECKOUT → PAYMENT_PENDING
        → (verified webhook payment.confirmed) → PAYMENT_CONFIRMED → SUBSCRIPTION ACTIVE → entitlements
        → payment.failed → PAYMENT_FAILED (no activation)
        → payment.cancelled → PAYMENT_CANCELLED
```

`?payment=success` is **ignored**. Duplicate `eventId` → one transition (HTTP 200 `duplicate: true`).
