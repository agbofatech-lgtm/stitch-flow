# PHASE 5 — BILLING ARCHITECTURE

Date: 2026-08-27 · Source of truth: code (`apps/backend/src/billing/`, `apps/backend/src/services/billingService.ts`).

## 1. THE TWO FINANCIAL DOMAINS (MANDATORY SEPARATION)

| | A. StitchFlow SaaS subscription billing | B. Tailor's customer payments |
|---|---|---|
| Flow | Workspace → StitchFlow → subscription | Customer → Tailor → invoice/payment |
| Tables | `subscriptions`, `billing_events` | `invoices`, `invoice_items`, `payments`, `order_material_usages` |
| Money | plan price (GHS 45/90 monthly) paid **to StitchFlow** via Paystack | garment/order money paid **to the tailor**, recorded in the app |
| Code | `billingService`, `subscriptionService`, `entitlementService`, `billingRoutes` | `paymentRoutes`, `invoiceRoutes`, Phase 3 financial-integrity engine |
| Invariants | webhook idempotency, state machine, out-of-order guard | overpay guard, FOR UPDATE invoice lock, atomic payment+reconciliation+sync events |

They never share tables, rows or invariants. Regression-tested: processing a subscription webhook writes **zero** rows into `payments`/`invoices` (`billing.test.ts` "financial domain separation"). The Phase 3/4 tailor-payment engine is untouched (see git diff — `paymentRoutes.ts` unmodified).

## 2. Provider abstraction

```
BillingProvider (interface)
 ├── initializeCheckout(input) -> { reference, authorizationUrl }
 ├── verifyWebhookSignature(rawBody, signature) -> boolean
 └── parseWebhookEvent(rawBody) -> NormalizedBillingEvent | 'irrelevant' | null
```

Only operations the Phase 5 model actually needs are declared (no speculative `createCustomer`/`fetchSubscription` — YAGNI per Step 16). Normalized event vocabulary: `payment.succeeded`, `payment.failed`, `subscription.cancelled`, `subscription.expired`, `subscription.paused`, `subscription.resumed`.

### TestBillingProvider — IMPLEMENTED + TESTED
Deterministic; mirrors Paystack's signature scheme (HMAC-SHA512 over the raw body, timing-safe compare) with a fixture secret (`TEST_BILLING_SECRET`, not a credential). Drives all automated billing tests: success, failure, cancellation, expiration, duplicates (2×, 10×, concurrent), out-of-order, invalid signature, malformed payload, amount mismatch, unresolvable workspace.

### PaystackProvider — IMPLEMENTED AS BOUNDARY, REQUIRES EXTERNAL CREDENTIALS
- Checkout: `POST https://api.paystack.co/transaction/initialize` with server reference and amount in pesewas.
- Webhook: `x-paystack-signature` = HMAC-SHA512(raw body, `PAYSTACK_SECRET_KEY`), timing-safe verified.
- Event mapping: `charge.success`→`payment.succeeded`, `invoice.payment_failed`→`payment.failed`, `subscription.disable`/`subscription.not_renew`→`subscription.cancelled`; all other Paystack event types → `'irrelevant'` (acknowledged 200, no retries provoked).
- **Live verification is NOT claimed.** Anything requiring a real `PAYSTACK_SECRET_KEY` (live checkout, live webhook, dashboard webhook URL registration) is EXTERNAL CREDENTIAL REQUIRED and deferred to Phase 6 production validation. Provider choice rationale: Paystack operates in Ghana with GHS settlement and mobile-money support — the deployment target of this product; Stripe was not auto-selected (Step 18/prompt §14).

Registry (`billing/providers/index.ts`): test env → TestBillingProvider; else Paystack only when `BILLING_PROVIDER=paystack` **and** `PAYSTACK_SECRET_KEY` set; else `null` → checkout returns `503 BILLING_PROVIDER_ERROR`, webhook returns `404`.

## 3. Checkout flow (reference ledger = trusted workspace mapping)

```
owner/admin POST /billing/checkout {planCode}
  ├─ validate planCode against catalogue (INVALID_PLAN otherwise; BASIC not purchasable)
  ├─ reference = sf_<uuid> (server-generated)
  ├─ ledger row: billing_events(provider_event_id='checkout:<ref>',
  │              event_type='checkout.initialized', workspace_id, payload
  │              {planCode, amountMinor, currency, userId})   ← trusted mapping
  ├─ provider.initializeCheckout(...)
  └─ 201 { reference, authorizationUrl, planCode, amountMinor, currency }
```

The workspace in the ledger comes from the **verified membership** (`req.workspaceId`), never from the body.

## 4. Webhook pipeline

```
POST /billing/webhook  (raw body captured by express.json verify hook)
 1  verify HMAC signature over RAW body       → 401 INVALID_WEBHOOK_SIGNATURE + audit
 2  parse/normalize                           → 400 BILLING_EVENT_INVALID (malformed)
                                              → 200 {result:'irrelevant'} (non-domain)
 3  BEGIN
 4  INSERT billing_events ON CONFLICT (provider, provider_event_id) DO NOTHING
      no row → COMMIT → 200 {result:'duplicate'}          ← idempotency gate
 5  resolve workspace: provider_subscription_id mapping, else checkout ledger
      unresolved → row status='rejected' → 200 {result:'rejected'}
 6  SELECT subscription ... FOR UPDATE                     ← serializes concurrent events
 7  occurredAt <= last_event_at → status='ignored_stale' → 200  ← out-of-order guard
 8  payment amount ≠ checkout amount → status='rejected' → 200  ← forged-amount guard
 9  state machine transition (illegal → status='rejected' → 200)
10  UPDATE ledger row status='processed' + audit (PAYMENT_VERIFIED /
    SUBSCRIPTION_* / BILLING_WEBHOOK_RECEIVED) — same transaction
11  COMMIT → 200 {result:'processed', subscriptionStatus}
```

Failure atomicity: any error inside the transaction rolls back the ledger row, the subscription state AND the audit rows together — no partial updates. A rolled-back delivery is re-processable on provider retry (controlled states per Step 27: processed = COMMITTED, thrown/rolled back = RETRYABLE, rejected/ignored_stale = FAILED_WITH_REASON recorded durably).

Rate limiting: dedicated `webhookRateLimit` (600/min prod) — deliberately lenient so legitimate provider retries are never dropped; authenticity is the signature, not the limiter.

## 5. Money handling

Provider amounts are integers in **minor units (pesewas)** end to end (`amountMinor = round(monthlyPrice * 100)`); no floating-point arithmetic is performed on money in the billing path. The tailor-side financial engine keeps its existing convention (unchanged). Amount integrity: a `payment.succeeded` that resolves through a checkout reference must match the checkout's `amountMinor` exactly or it is rejected (tested with a forged 100-pesewa payment).

## 6. Observability

Processed webhooks log structured entries (pino): provider, eventId, eventType, workspaceId, subscriptionId, resulting status. Request correlation via existing `requestId` (pino-http). Never logged: secrets, keys, JWTs, signatures.
