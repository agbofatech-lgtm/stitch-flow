# P19.6+P19.7 Risk Register

| ID | Risk | Mitigation |
|---|---|---|
| O-R1 | Memory store lost on restart | Schema 006 not applied; classified TRANSITIONAL |
| O-R2 | FeatureGate still independent UX | config UX_ONLY |
| O-R3 | Immediate cancel vs period-end | TRANSITIONAL_DEFAULT documented |
| O-R4 | Operator grant only in runtime | no HTTP promote |
| O-R5 | Applying 006 against empty 002 | do not auto-migrate |
| O-R6 | Control Center formula access | status.tailoringAuthority false |
