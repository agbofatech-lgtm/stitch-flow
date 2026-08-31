# T10 Computation Versioning Model

**Status:** IMPLEMENTED as identity strings. Formulas unchanged.  
**Date:** 2026-08-31

| ComputationVersion | Meaning | Engine |
|---|---|---|
| `pattern-v1` | Governed wrap of current Pattern Engine geometry | `patternEngine` T0 hash |
| `production-plan-v1` | Governed wrap of current Production Assistant plan **excluding** `generatedAt` | `productionAssistant` T0 hash |

`ENGINE_VERSION_UNKNOWN` — engines have no semantic version field. Identity is `SOURCE_IDENTITY_AVAILABLE` as the T0 SHA-256 hex of the protected file.

Input contract: `measurement-input-v1` — centimetre canonical map + pattern kind / garment type.

Bump `pattern-v1` / `production-plan-v1` only when the **governed contract** changes, not when HEAD moves. Formula change still requires a separate ADR and owner authorization (T9 condition 10).

Do not infer historical reproducibility from git HEAD alone.
