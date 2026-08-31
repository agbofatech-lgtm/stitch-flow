# P19 Billing Architecture (paper)

Status: **PAPER** — P19.6 **LOCKED** (OD-P19-04).

## Two money domains

| Domain | Records | Authority |
|---|---|---|
| Shop-floor | Customer job Invoice, Payment | StitchFlow operational (ADR-003) |
| SaaS | Platform subscription, SaaS invoice, provider events | Commercial platform (ABSENT) |

Do not migrate shop invoices into SaaS subscriptions.

## Provider-neutral port (PROPOSAL)

```
BillingProvider
  CreateCustomer
  CreateCheckout
  VerifyPayment
  CreateSubscription
  CancelSubscription
  HandleWebhook
  QuerySubscription
```

Adapters (Stripe / Paystack / Flutterwave / other) stay outside domain authority. **None is selected.**

## Authoritative sequence (when built)

Customer initiates → provider processes → **verified server event** → server validates → billing state → subscription state → entitlements recomputed.

**Forbidden:** browser success message upgrades the account.

Webhook secrets never in the client (STOP-P19-K).
