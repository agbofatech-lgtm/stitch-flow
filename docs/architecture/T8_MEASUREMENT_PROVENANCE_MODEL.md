# T8 Measurement Provenance Model

**Date:** 2026-08-31  
**Status:** Domain contract. Does not rewrite AppContext blobs.

Every important measurement value in the T8 contract carries:

| Field | Meaning |
|---|---|
| value | Finite number |
| unit | `cm` or `in` at capture; canonical store is `cm` |
| source | `body-capture` \| `profile` \| `order-snapshot` \| `studio-session` \| `derived-formula` \| `legacy-blob` |
| capturedBy | Actor id when known; otherwise null |
| capturedAt | ISO-8601 |
| version | Monotonic integer on the frozen set |
| verification | `unverified` \| `verified` \| `rejected` |

Rules:

1. `derived-formula` and PatternMeasurement are **not** body capture.
2. A frozen `MeasurementVersion` is immutable. Updates create a **new** version; they do not patch the frozen payload.
3. Historical orders must keep the version id / capturedAt used at freeze time. Live profile changes must not mutate that record.
4. Unknown units STOP. Do not guess `mm`/`ft`.
5. Engine consumption is always centimetres (`toCentimetres` then T3/T7 wrappers).
