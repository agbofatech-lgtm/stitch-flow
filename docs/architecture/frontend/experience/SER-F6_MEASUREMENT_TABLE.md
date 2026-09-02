# SER-F6 Measurement table

The Measurement table is a precision capture workspace. Body, garment, and derived pattern stay separate.

## Purpose

Capture centimetres for the named client. Live profiles remain transitional until an explicit freeze.

## Data

See [`SER-F6_FORENSIC_DATA_BOUNDARY.md`](./SER-F6_FORENSIC_DATA_BOUNDARY.md).

Does **not** import `patternEngine`. Does **not** merge body into garment. Does **not** invent missing values or completeness percentages. Incomplete sets are not sent to the engine.

## Composition

| Slot | Implementation |
|---|---|
| Place | Shell: `Measurement table`. Workroom title is the client, or `Select a client`. |
| Thread | Workflow client — never `rows[0]`. |
| Journey | `AtelierJourney` with Measurements current. |
| Confidence | Live profiles are not frozen shop snapshots. |
| Primary action | Client present: Continue to design (shell). Else: Open client room. |
| Canvas | Selected live profile: body column + garment column + derived pattern. |
| Tools | Pattern kind. Freeze onto order is the fitting commitment. T2/T10 version tools sit under “Version and governed tools”. |
| Empty | No live profile for this client / select a profile / open client room |

`Begin a live profile` writes through `addCustomerMeasurementProfile`. Field blur writes through `updateCustomerMeasurementProfile`. Numeric fields use `font-numeric` and `min-h-11`. Missing required keys for the selected pattern kind are marked, not filled. “Show all body/garment fields” discloses the rest of the T3 catalogues without inventing values.

## Motion

- MICRO on profile selection.
- CONTEXTUAL on canvas enter.
- MILESTONE only on actual freeze / fingerprint / version messages.
- Opening a live profile is not a milestone (`until frozen` must not trigger one).

## Capture vs freeze

Typing updates the live profile. Freeze onto order is the commitment. T2 version freeze remains available and unchanged.
