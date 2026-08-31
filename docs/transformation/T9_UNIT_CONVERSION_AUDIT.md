# T9 Unit Conversion Audit

**Date:** 2026-08-31

| Family | Canonical unit | Conversion | Constant |
|---|---|---|---|
| Body / pattern length | centimetres | T8 `toCentimetres` / `fromCentimetres` | `CM_PER_INCH = 2.54` |
| Fabric quantity | Production Assistant default **yards** | `toYards` / `fromYards` | `METRES_PER_YARD = 0.9144` |

## FACT

- Pattern Engine consumes centimetres.
- Production Assistant measurement inputs are centimetres; `fabricEstimate.unit` defaults to `'yards'`.
- T9 does **not** convert body centimetres into fabric yards. Mixing families throws `STOP: body centimetres are not fabric yards`.

## INFERENCE

Job-sheet numeric pattern inputs remain centimetres because the engine was not rewritten and job-sheet still forwards order measurements without a new conversion.

## UNKNOWN

Whether any PDF millimetre / pixel mapping is internally consistent. PDF visual equivalence remains **UNKNOWN**, not PASS.
