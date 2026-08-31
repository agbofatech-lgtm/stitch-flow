# P18 Authority Chain Verification

| Layer | Artifact | Immutable | Fingerprint | Consumed by |
|---|---|---|---|---|
| Measurement | MeasurementVersion | YES | via engineInput map (P16 measurementFingerprint) | P14 optional id; P16 required |
| Specification | GarmentSpecificationVersion | YES | fnv1a-64 | P15 required |
| Composition | GarmentCompositionVersion | YES | fnv1a-64 | P16 required |
| Execution | TrustedTailoringExecution | YES | fnv1a-64 non-crypto | P17 read-only |
| AI | TailoringIntelligenceResult | advisory | inputFingerprint | none (must not write back) |

**FACT:** fingerprints are implementation fingerprints, not cryptographic certificates.

**FACT:** T6 `GarmentSpecification` projection remains transitional and is **not** `GarmentSpecificationVersion`.

Chain integrity at domain: **PASS**. Exclusive product path: **CONDITIONAL**.
