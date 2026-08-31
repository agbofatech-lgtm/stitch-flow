# Execution Authority Chain

Desired (PROPOSAL):

```
MeasurementVersion
+ GarmentSpecificationVersion
+ GarmentCompositionVersion
+ ExecutionConfiguration (T10 registry identity)
        ↓
TrustedTailoringExecution (immutable snapshot, references only)
```

**FACT today:** T10 provenance carries `measurementVersionId` optionally. No specificationVersionId / compositionVersionId.

Authority order (binding):

1. Frozen versions  
2. Explicit execution request  
3. T10 governed wrappers  
4. Protected engines (unchanged)  
5. UNKNOWN — never live AppContext
