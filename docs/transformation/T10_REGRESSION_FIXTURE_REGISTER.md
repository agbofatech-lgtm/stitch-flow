# T10 Regression Fixture Register

**Date:** 2026-08-31  
**Source:** observed protected-engine behavior. Formulas not rewritten.

| Fixture ID | Purpose | Units | Version | Status |
|---|---|---|---|---|
| FX-PATTERN-BODICE-01 | Bodice geometry | cm | pattern-v1 | observed-behavior |
| FX-PATTERN-SHIRT-01 | Shirt geometry | cm | pattern-v1 | observed-behavior |
| FX-PATTERN-TROUSER-01 | Trouser geometry | cm | pattern-v1 | observed-behavior |
| FX-PATTERN-SKIRT-01 | Skirt geometry | cm | pattern-v1 | observed-behavior |
| FX-PATTERN-KAFTAN-01 | Kaftan geometry | cm | pattern-v1 | observed-behavior |
| FX-PRODUCTION-SHIRT-01 | Shirt plan + fabric yards | cm in / yards out | production-plan-v1 | observed-behavior |
| FX-PRODUCTION-TROUSER-01 | Trouser plan + fabric yards | cm in / yards out | production-plan-v1 | observed-behavior |
| FX-PRODUCTION-DRESS-01 | Dress plan + fabric yards | cm in / yards out | production-plan-v1 | observed-behavior |
| FX-MEASUREMENT-FREEZE-BODICE | T8 freeze → pattern wrap | cm | pattern-v1 | observed-behavior (in test, fixed version id) |

Tolerance: exact equality of `normalizedOutput` after canonicalize. `generatedAt` excluded.

Files: `apps/web/src/domain/tailoring/deterministic/fixtures/*.json`

NOT certified as tailoring accuracy. Observed computational regression only.
