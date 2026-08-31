# P14 Determinism Contract

Canonicalization reuses T10 `canonicalize` (sorted keys, omit null/undefined).

Fingerprint: **fnv1a-64**, `cryptographic: false`. Same semantic intent → same fingerprint across key order and 20 repeats. Clock `createdAt` excluded.

Does not normalize unknown types into known types. Does not fill optional fields.
