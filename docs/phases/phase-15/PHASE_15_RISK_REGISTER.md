# Phase 15 Risk Register

| ID | Risk | Class | Mitigation |
|---|---|---|---|
| P15-R1 | Promoting cutting lists to composition law | FACT | Keep Category F; owner must authorize any OBSERVED→AUTHORITATIVE move |
| P15-R2 | Inventing Agbada/Dress required-component sets | STOP-P15-C | Do not implement graph until rules exist |
| P15-R3 | Silent `if (garmentType===dress) defaultComponents` | STOP-P15-F | Forbidden |
| P15-R4 | Consuming live Studio instead of frozen spec | STOP-P15-E | Consume P14 version only |
| P15-R5 | Coercing unknown types to bodice | STOP-P15-G | P14 unknown stays unknown |
| P15-R6 | Treating canvas as structure | STOP-P15-B / T10 C4 | visual ≠ component |
| P15-R7 | New mutable composition store | second SoT | If later versioning, T2 create-only freeze only |
| P15-R8 | Phase 16 leakage (compose then execute engines) | STOP | Phase 16 LOCKED |
| P15-R9 | Engine rewrite to emit multi-block dress | STOP-P15-D | engines protected |
| P15-R10 | Historical orders have no composition snapshot | FACT | Do not claim reproducibility of past structure |
