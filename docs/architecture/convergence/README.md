# SAC-0 — Authority Convergence Forensic Pack

**Date:** 2026-09-01  
**Mode:** Forensic investigation only. **Implementation not granted.**  
**SAC-1:** LOCKED pending owner review.

Start: [`00_SAC0_EXECUTIVE_SUMMARY.md`](./00_SAC0_EXECUTIVE_SUMMARY.md)

Labels used throughout:

| Label | Meaning |
|---|---|
| **FACT** | Observed in repository source or git at SAC-0 baseline |
| **EVIDENCE** | Path / test / hash supporting a FACT |
| **INFERENCE** | Reasonable conclusion from FACT; not observed runtime |
| **RECOMMENDATION** | Proposed programme shape; not authorization |
| **OWNER DECISION REQUIRED** | Must not be guessed |
| **UNKNOWN** | Not verified this pass |

This pack does not rewrite T0 maps, ADRs, or the continuity pack. Continuity describes *current* truth. This pack asks *how authorities can converge* without rewriting protected assets.

SAC-1 implementation (owner acceptance pending): [`sac-1/README.md`](./sac-1/README.md).  
SAC-2 local T2 mirror (UI SoT still AppContext): [`sac-2/README.md`](./sac-2/README.md).  
SAC-3 authenticated `/shop` API: [`sac-3/README.md`](./sac-3/README.md). SAC-4 remains locked.
