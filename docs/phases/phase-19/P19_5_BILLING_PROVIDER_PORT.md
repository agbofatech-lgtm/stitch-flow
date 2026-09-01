# P19.5 Billing Provider Port

```
Commercial domain → Billing port → adapter
```

**PROVIDER SELECTION = DEFERRED.**

Only adapter: `test` (HMAC webhook). `/platform/billing/webhooks/stripe` (or Paystack/Flutterwave) → `PROVIDER_DEFERRED`.

No SDK. No merchant credentials. Env name only: `BILLING_WEBHOOK_SECRET`.
