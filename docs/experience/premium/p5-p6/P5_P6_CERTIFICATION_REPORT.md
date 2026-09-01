# P5/P6 Independent Certification Report

Predecessor P3/P4: `4ead15d119ad44913983d6d6771b4ea32843532c`
P5/P6 implementation: `f3c28f558c9c6dd4c10e3b3c066c1f2ec9895871`
Independent recertification performed against repository at P7/P8 start (working tree then CLEAN).

Classification legend: PASS | CONDITIONAL | FAIL | NOT TESTABLE | NOT CLAIMED

## Shell

| Check | Result |
|---|---|
| Global nav sections Atelier / Operations / Workspace / Platform | PASS (source `workspaces.ts`) |
| Atelier identity in shell | PASS |
| Command palette Ctrl/Cmd+K | PASS (source) |
| Skip link + `#workspace-main` | PASS (test) |
| Keyboard focus ring tokens | PASS (CSS) |
| Browser zoom / reduced-motion lab | NOT TESTABLE |
| Mobile 6-room bar | PASS (source) |

## Workroom grammar

| Surface | Workroom | PageHeader h2 | Loading | Empty | Error+retry |
|---|---|---|---|---|---|
| Atelier Home | PASS | PASS (level default 1 inside canvas; shell already h1) | N/A | PASS | N/A |
| Customers | PASS | PASS | PASS | PASS | PASS |
| Orders | PASS | PASS | NOT CLAIMED (no HTTP load gate) | PASS | N/A |
| Production | PASS | PASS | PASS | PASS | PASS |
| Materials | PASS | PASS | NOT CLAIMED | PASS | N/A |
| Invoices | PASS | PASS | PASS | PASS | PASS |
| Reports | PASS | PASS | N/A (store-derived) | CONDITIONAL (section empties) | N/A |
| Settings | FAIL at P5 close (no Workroom) | FAIL at P5 close | CONDITIONAL | N/A | CONDITIONAL |
| Design Studio | Frame only | N/A | PROTECTED | PROTECTED | PROTECTED |
| Control Center | PASS | PASS | PASS | PASS empty payload | PASS |
| Measurements | FAIL at P5 close (own h1) | FAIL at P5 close | N/A | PASS | CONDITIONAL |

Duplicate title: shell `WorkspaceHeader` is h1 and rooms may still render PageHeader. Rooms use `level={2}`. CONDITIONAL, not FAIL.

## FeatureGate / commercial honesty

- Fake `alert()` Upgrade: PASS (absent)
- Live PSP implied: PASS not implied in FeatureGate
- Settings still said "Upgrade to Studio" / "You're on Pro" at P5 close: CONDITIONAL (copy residue)

## Control Center

- Values from `/control/*` only: PASS
- No invented revenue: PASS
- Live PSP deferred / Postgres not verified badges: PASS
- Finished-product IA (Plans/Usage/Account): NOT CLAIMED — those APIs do not exist as UI destinations

## Protected assets

DesignStudio `5059c0db…` PASS
patternEngine `d02000d6…` PASS
productionAssistant `140a646d…` PASS
shared/types `424ef618…` PASS

## Tests / build at P5/P6 commit

experience 13, studio 7, remaining domain suites PASS, backend 26 PASS, vite build PASS.
TypeScript: inherited FAIL (`materials.ts`, `reports.ts`, `types.ts`) — not relabelled PASS.

## Scores

NOT CLAIMED. Previous 76/78/77 figures are withdrawn as methodology-unsupported.

## Final

P5: CONDITIONAL
P6: CONDITIONAL
Protected assets: PASS
Functional regression (automated): PASS
P5/P6 FINAL: CONDITIONALLY CERTIFIED
Owner acceptance: PENDING
