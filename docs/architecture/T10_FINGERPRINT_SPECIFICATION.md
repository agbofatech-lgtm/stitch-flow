# T10 Fingerprint Specification

**Status:** IMPLEMENTED  
**Date:** 2026-08-31

## Algorithm

**FNV-1a 64-bit** over UTF-8 code units of the canonical JSON string (JavaScript `charCodeAt`, BMP-oriented).

| Claim | Value |
|---|---|
| Purpose | Stable identity for equivalent canonical payloads |
| Cryptographic / business security guarantee | **NONE** |
| Algorithm id | `fnv1a-64` |

Do not treat this fingerprint as a MAC, signature, or audit seal.

## Canonical JSON

1. Recursively sort object keys (UTF-16 code unit order, `localeCompare` not used).
2. Omit keys whose value is `undefined`.
3. Omit keys whose value is `null` (optional absences must not flip identity vs omitted).
4. Arrays keep order (semantic).
5. `JSON.stringify` of the canonicalized value.
6. Reject non-finite numbers.

## Fingerprint payload

```
{
  algorithm: 'fnv1a-64',
  computationType,
  computationVersion,
  inputContractVersion,
  engineIdentity,
  configurationIdentity,
  canonicalUnit: 'cm',
  canonicalInput
}
```

**Excluded:** `generatedAt`, `Date.now()`, UUID, UI/session, locale, insertion-order accidents, display units.

## Guarantees (T10.1)

Same canonical input + same versions + same config identity → same fingerprint.

Different kind or different numeric field → different fingerprint (collision residual exists; not certified).
