# OD-P19-04 — Payment Provider Strategy

**QUESTION:** What provider strategy should StitchFlow adopt?

This stage must **not** integrate a provider.

## FACT

- No Stripe / Paystack / Flutterwave / MoMo SDK in package.json.
- Shop Invoice `method` is a string; UI option **“Mobile Money”** is a label.
- Shop Payment ≠ SaaS billing (ADR-006).
- No webhook, no checkout, no reconciliation.

**UNKNOWN:** merchant account, KYC, fee tolerance, settlement bank, recurring-billing need.

**INFERENCE (external market, not repo):** Paystack and Flutterwave are commonly used for Ghana + Mobile Money; Stripe is a global card-first PSP. This is **not** operational evidence.

## Mandatory shape (PROPOSAL)

```
Subscription domain
        ▼
Payment Provider Port
        ├── Adapter A
        ├── Adapter B
        └── Future
```

Never: Subscription → direct SDK.

## OPTIONS

### A — Provider-neutral port only; defer adapter

Matches absent evidence. Unblocks domain design later without picking a vendor.

### B — Name an initial adapter now (Paystack / Flutterwave / Stripe)

**STOP-P19-1.5-F** — no operational evidence (no account, no webhook test, no fee quote in repo). Candidates only.

### C — Defer entire billing runtime (no port, no adapter)

Safest commercially; billing slice stays locked.

## Candidate notes (not selection)

| Candidate | Why it appears | Repo evidence |
|---|---|---|
| Paystack | Ghana / MoMo (INFERENCE) | NONE |
| Flutterwave | Ghana / MoMo (INFERENCE) | NONE |
| Stripe | International cards (INFERENCE) | NONE |

## RECOMMENDATION

**DEFER PROVIDER SELECTION (A + C):** keep a paper port; **do not** authorize an adapter; **do not** install SDKs. Recurring billing, webhooks, MoMo, and fees cannot be certified from this repository.

**Confidence:** High (defer is the only option that does not invent ops evidence).

**OWNER DECISION REQUIRED:** YES
