# P19.10 Control Center

Plane: `AGBOFA_PLATFORM_CONTROL_CENTER`. Distinct from Settings.

Operators: in-memory/file `platformOperators` set, granted only by runtime (tests/ops), not HTTP.

May: configuration kill-switch `disabledCapabilities`, tenant list, audit tail, provider status DEFERRED.

Must not: tailoring formulas, Design Studio, Pattern Engine. `tailoringAuthority: false`.

`pricing.amountsAuthoritative` immutable false.
