# Execution Provenance Model

**FACT:** T10 `ComputationProvenance` covers one engine call.

**PROPOSAL** for Phase 16 envelope (adapt, do not duplicate engine provenance):

```
executionContractVersion
measurementVersionId
specificationVersionId
compositionVersionId
configurationIdentity / configurationFingerprint
patternComputationVersion
productionComputationVersion
inputFingerprint
patternOutputFingerprint
productionOutputFingerprint
executionResultFingerprint
```

References only. No copied measurement maps as a second SoT in the snapshot **beyond** fingerprints and classifications.
