# Workroom standard

**THE SHELL MUST NOT BE THE ONLY CINEMATIC PART OF STITCHFLOW.**

A room is incomplete if it only wraps legacy UI in `Workroom` + `PageHeader`.

Every major room must eventually provide:

| Slot | Requirement |
|---|---|
| Title hierarchy | kicker (atelier vocabulary) → title → one-line purpose |
| Context | Named current client and/or order if the journey has one |
| Navigation | Room remains in shell; no nested apps |
| Primary action | One, visible, verb of craft |
| Secondary actions | Overflow / command, not a toolbar of equals |
| Composition | Primary canvas ≥ tools ≥ inspector |
| Status | Honest data state (local / queued / unavailable) |
| Feedback | Success/error in the same spatial language |
| Empty | Next action, not a void |
| Loading | Same geometry skeleton |
| Error | Atelier language; no unmounted-API URLs |
| Responsive | Canvas survives; inspector → sheet |
| Animation | WORKSPACE on enter; MICRO on selection; MILESTONE only for commitment |
| Accessibility | Heading order, focus, dialog = shared Dialog |

## Room-specific future bar (not a redesign now)

| Room | Primary canvas | Primary action (intended) | Failure of F0 |
|---|---|---|---|
| Floor | Work needing a human | Open the thread | Closest today |
| Client | Person, not a CRUD grid | Continue to measurements | HTTP error wall |
| Measurement | Separated body/garment | Freeze version | Technical but honest |
| Design | Hosted protected studio | Finalize when ready | Frame too thin |
| Production | Stage sequence of **this** order | Legal transition only | HTTP error wall |
| Ledger stations | Document/list of craft objects | Create order locally until SAC UI is authorized | Mixed AppContext vs HTTP |

Settings and Control Center are **not** craft rooms; they still owe loading/error/focus, but not the Floor journey.
