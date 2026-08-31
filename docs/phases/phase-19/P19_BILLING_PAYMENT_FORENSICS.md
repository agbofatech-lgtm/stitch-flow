# P19 Billing & Payment Forensics

## SaaS billing

| Item | Finding |
|---|---|
| Stripe / Paystack / Flutterwave / MoMo SDK | **ABSENT** |
| Checkout | **ABSENT** (alert: “opens the upgrade flow in a full billing setup”) |
| Webhook | **ABSENT** for SaaS |
| Idempotency | **NOT APPLICABLE** (no provider) |
| Refunds / reconciliation | **ABSENT** |

## Shop-floor payments (NOT SaaS)

| Item | Finding |
|---|---|
| Invoice / Payment types | AUTHORITATIVE operational domain |
| AppContext addPayment | TRANSITIONAL live SoT |
| backend paymentRoutes | SQL on `payments`; **unmounted by default** (T1) |
| Invoices UI “Mobile Money” option | UI label only |

Do **not** select a provider in Stage 0.
