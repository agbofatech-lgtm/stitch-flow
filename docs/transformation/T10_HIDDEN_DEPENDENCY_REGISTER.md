# T10 Hidden Dependency Register

**Date:** 2026-08-31

| ID | Location | Finding | Class |
|---|---|---|---|
| HD-01 | `productionAssistant.generateProductionPlan` | `generatedAt: new Date()` | NON-DETERMINISTIC |
| HD-02 | `domain/measurement/version.ts` `newVersionId` | `crypto.randomUUID` / `Date.now`+`Math.random` | NON-DETERMINISTIC identity |
| HD-03 | `domain/measurement/provenance.ts` | `capturedAt \|\| new Date().toISOString()` | NON-DETERMINISTIC unless supplied |
| HD-04 | `patternEngine.validateAndRead` | missing key → range.default or formula | LIKELY DETERMINISTIC (constant tables) |
| HD-05 | `estimateFabricRequirement` | missing bust/hip/… → 96/102/40/24/75/108 | LIKELY DETERMINISTIC |
| HD-06 | DesignStudio / jobSheet / engine | **different** numeric defaults for hip/bust | UNKNOWN which default a given user path used |
| HD-07 | `inferGarmentTypeFromInspiration` | first keyword in table order; fallback `'bodice'` | LIKELY DETERMINISTIC |
| HD-08 | `dedupeStrings` | `Set` order | LIKELY DETERMINISTIC |
| HD-09 | Pattern engine | does not mutate input object | VERIFIED DETERMINISTIC |
| HD-10 | Production assistant | reads input; does not mutate measurement object | LIKELY DETERMINISTIC |
| HD-11 | DesignStudio drafts | `localStorage` key `stitchflow:design-studio:drafts` (T7 TRANSITIONAL) | UI state; not engine math |
| HD-12 | AppContext | localStorage TRANSITIONAL SoT for orders | not engine math |
| HD-13 | DesignStudio canvas | local silhouette formulas + zoom; pieces mode uses engine points with fitScale | EXPERIENCE; px/cm UNKNOWN |
| HD-14 | jobSheet `formatDate` | `Intl.DateTimeFormat('en-GB')` | display; locale-stable if always en-GB |
| HD-15 | jobSheet QR | `api.qrserver.com` network URL | not computation |
| HD-16 | `productionAlerts` | `Date.now()` vs expectedCompletionDate | NON-DETERMINISTIC clock |
| HD-17 | Duplicate garment→kind maps | Studio, T3, jobSheet, garmentLogic | LIKELY same FACT mapping; must not silently merge |
| HD-18 | T9 envelopes unused by UI | callers use identity re-exports | PARTIAL contract adoption |
| HD-19 | `scalePatternPoints` / SVG path helpers | unused outside engine module | not in live path |
| HD-20 | `garmentLogic.ts` | unused | LEGACY |
| HD-21 | Object key order | engine builds explicit maps; JSON of results not canonicalized | UNKNOWN for future fingerprints |
| HD-22 | Environment | no `process.env` inside engines | VERIFIED none in engine files |
| HD-23 | Hardcoded seam allowance | `seamAllowanceCm: 1.5` on generic drafts | LIKELY DETERMINISTIC constant |
| HD-24 | Ease formulas | e.g. `bust * 0.018` clamped | VERIFIED DETERMINISTIC given bust |

## ENGINE MUTATION RISK

**Engine:** patternEngine  
**Observed Behavior:** `asMeasurementMap` copies via spread; original argument not written.  
**Evidence:** `patternEngine.ts` `asMeasurementMap`.  
**Boundary Mitigation:** none required for mutation.  
**Engine Modified:** NO

**Engine:** productionAssistant  
**Observed Behavior:** reads fields; returns new plan object.  
**Evidence:** `generateProductionPlan` constructs a new object.  
**Engine Modified:** NO
