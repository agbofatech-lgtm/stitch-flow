# SER-F6 Measurement table

The Measurement table is a precision capture workspace. Body, garment, and derived pattern stay separate.

## Purpose

Capture centimetres for the named client. Live profiles remain transitional until an explicit freeze.

## Data

| Surface | Source | Honesty |
|---|---|---|
| Live profiles | AppContext `measurementProfiles` | Transitional |
| Capture fields | T3 `BODY_MEASUREMENT_FIELDS` / `GARMENT_MEASUREMENT_FIELDS` | No invented keys |
| Completeness | `assessPatternInputCompleteness` | Engine defaults are not applied |
| Pattern strip | `projectPatternMeasurements` | Derived. Not editable. |
| Freeze onto order | `workflow.freezeMeasurementsOnOrder` | Order snapshot; live edits do not silently rewrite it |
| Freeze version / governed / snapshot | Existing T2 / T10 tools | Unchanged semantics |

Does **not** import `patternEngine`. Does **not** merge body into garment. Does **not** invent a second measurement authority. Incomplete sets are not sent to the engine.

## Composition

| Slot | Implementation |
|---|---|
| Place | `Measurement table` |
| Thread | Workflow client — never `rows[0]` |
| Confidence | Live profiles are not frozen shop snapshots |
| Primary action | Continue to design |
| Canvas | Selected live profile: body column + garment column + derived pattern |
| Tools | Pattern kind, freeze onto order, T2 version tools |
| Empty | No live profile for this client / select a profile / open client room |

`Begin a live profile` writes through `addCustomerMeasurementProfile`. Field blur writes through `updateCustomerMeasurementProfile`. Numeric type uses `font-numeric`. Missing required keys for the selected pattern kind are marked, not filled.

## Motion

- MICRO on profile selection.
- CONTEXTUAL on canvas enter.
- MILESTONE only when a freeze / fingerprint message exists (`AtelierMilestone`).

## Capture vs freeze

Typing updates the live profile. Freeze is the commitment. That distinction is the table's professional contract.
