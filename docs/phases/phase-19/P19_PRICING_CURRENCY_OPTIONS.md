# OD-P19-03 — Pricing & Currency Options

**QUESTION:** How should StitchFlow represent prices without hardcoding a market strategy?

This is **not** “which currency wins?” PLAN ≠ PRICE. **No amounts are recommended.**

## FACT

- USD simulation: mock `monthlyPrice` 0 / 29 / 79 and FEATURE_COMPARISON `$0/$29/$79`.
- GHS simulation: `TIER_META` 0 / 45 / 90.
- Shop `CurrencyCode` already `'USD' | 'GHS' | 'NGN' | 'GBP'`.
- Mock workspace `defaultCurrency: 'GHS'`, Accra address, shop invoices mix USD and GHS.
- No SaaS price catalog. ADR-006: do not add a third table.

**INFERENCE (not law):** launch market likely Ghana (mock copy + GHS). Not an Owner decision.

## OPTIONS

### A — Single-currency architecture

Pick one ISO code for all SaaS prices. Fights existing shop `CurrencyCode` and mixed mock invoices. Simple accounting. Blocks later NGN/USD expansion.

### B — Multi-currency catalog with launch-market activation (recommended)

```
PLAN
 └── PRICE CATALOG
      ├── currency
      ├── amount          (Owner later — not in this package)
      ├── billing interval
      ├── market
      └── effective dates
```

Activate **one launch currency** in operations without deleting other ISO codes from the type system. Shop job currency remains independent of SaaS price currency.

### C — Provider-controlled currency

Provider dictates settlement currency. Couples OD-P19-04 too early. **Rejected as architecture** until a provider exists.

## Ghana / expansion / FX / subscriptions

- Ghana: GHS + Mobile Money matter for **shop** and possibly SaaS; still not amounts.
- International: `CurrencyCode` already anticipates NGN/GBP/USD.
- FX: do not build an exchange engine in P19; store price in its catalog currency.
- Accounting: UNKNOWN (no books in repo).

## RECOMMENDATION

**B**. Do not treat 29/79 or 45/90 as law. Do not put amounts in product code in P19.2. Launch-market activation currency is an Owner sub-choice (GHS vs other) **without** selecting amounts.

**Confidence:** High for PLAN≠PRICE and no amounts; Medium for launch currency.

**OWNER DECISION REQUIRED:** YES  
STOP-P19-1.5-E avoided: no actual prices selected.
