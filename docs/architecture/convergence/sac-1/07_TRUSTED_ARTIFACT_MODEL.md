# Trusted Artifact Model

Reuses P13–P16 records. Wrapper only:

`TrustedTailoringArtifact`: MeasurementVersion + GarmentSpecificationVersion + GarmentCompositionVersion + TrustedTailoringExecution + result + `persistence: t2 | session`.

**Where it lives:** session result in Studio React state; optional T2 create if `startDataAuthorityRuntime` is up.  
**Authority:** trusted computation for that explicit finalization.  
**Reload:** session badge is gone unless T2 retained the snapshot (not wired back into AppContext).  
**Not durable as shop SoT.** SAC-2 owns data-authority convergence.
