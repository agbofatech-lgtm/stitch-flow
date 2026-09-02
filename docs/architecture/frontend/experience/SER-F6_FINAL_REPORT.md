# STITCHFLOW SER-F6

CLIENT + MEASUREMENT EXPERIENCE

FINAL CERTIFICATION REPORT

**SER-F6 STATUS: CONDITIONALLY CERTIFIED**  
**OWNER ACCEPTANCE: PENDING**

## Executive summary

The Client room is now a relationship workspace over the same AppContext people as the Floor. Selecting a person starts the object thread. The Measurement table is a precision capture surface: body and garment are separate, pattern is derived, freeze remains the commitment. Neither room mounts `/shop` or unauthenticated CRUD.

## Baseline

Branch `arena/01a05677-stitch-flow`. Started from F5 HEAD `2e8e059`.

## Starting forensic findings

F5 framed both rooms. Client interior was still HTTP `/customers` (error wall / separate population). Measurement interior was a DataTable plus freeze tool strip; thread was honest, capture was not a table.

## Files changed

Principal: `Customers.tsx`, `MeasurementWorkspace.tsx`, `AtelierHome.tsx`, `StudioShell.tsx`, `WorkflowContext.tsx`, `WorkflowPanel.tsx`, `WorkspaceInspector.tsx`, tests, visual lab, SER-F6 docs.

## Files intentionally not changed

`DesignStudio.tsx`, `patternEngine.ts`, `productionAssistant.ts`, `shared/types/index.ts`, `productionStageService.ts`, SAC/backend, AppContext authority model, localStorage schema.

## Client room

See [`SER-F6_CLIENT_ROOM.md`](./SER-F6_CLIENT_ROOM.md).

## Measurement table

See [`SER-F6_MEASUREMENT_TABLE.md`](./SER-F6_MEASUREMENT_TABLE.md).

## Object thread

`selectCustomer` now sets or clears `selectedOrderId` so the shell thread cannot keep a previous garment. Floor people and command-palette Work entries open the dossier of the named person.

## Truthful data/status language

Local workspace. Same people as the Floor. Live profiles are not frozen shop snapshots. No unmounted API URLs. No “synced”.

## Cinematic motion implementation

F3 only: MICRO on list rows; CONTEXTUAL on dossier/profile enter; MILESTONE on freeze/fingerprint. No milestone on navigation.

## Responsive implementation

Client 1280 / 768 / 390 captured. Measurement 1280 / 390 captured. Dossier is primary below `xl` when a client is selected. 44px targets on lists and primary actions.

## Accessibility safeguards

h2 workroom titles, labeled search, `aria-current` on selected rows, shared Dialog, numeric fields associated via Field. No AT audit.

## Visual lab evidence

[`SER-F6_VISUAL_LAB.md`](./SER-F6_VISUAL_LAB.md).

## Performance measurements

`vite build`: `main-DfrE3yE2.js` **924.64 kB** / gzip **263.61 kB**. F5 main was 920.80 / 261.86. FPS **NOT VERIFIED**.

## Tests and exact results

```
test:studio       13/13 pass
test:experience   22/22 pass
test:workflow     8/8 pass
vite build        exit 0
```

`tsc --noEmit` inherited FAIL. Not re-claimed.

## Protected asset verification

| Asset | SHA-256 | Diff |
|---|---|---|
| patternEngine.ts | `d02000d6…0e16dc` | none |
| productionAssistant.ts | `140a646d…d571c4` | none |
| shared/types/index.ts | `424ef618…e3d0d9` | none |
| productionStageService.ts | `eef8854f…cd67c8` | none |
| DesignStudio.tsx | `8e68e8bb…1d40db` | none |

## SAC authority verification

No `/shop` screen migration. No unauthenticated remount. No schema. No auto-sync. AppContext remains UI SoT. Client room left HTTP `/customers`.

## Known limitations

- Shell thread still repeats the workroom thread (F5 residue).
- Shell “Continue to measurements” remains the place-next even when no client is selected.
- 768 shell title truncates “Client room”.
- Capture-1280 still is a scrolled still; freeze milestone is not a video.
- Seed `measurementProfiles` remains empty; live profiles are created in-session.

## Explicitly deferred

F7 Design Studio frame, F8 Production, F9 Ledger, F10 Control Center, F11–F15, SAC UI (`/shop`) for clients.

## Acceptance matrix

| Axis | Result |
|---|---|
| Client identity (person, not CRUD) | PASS |
| Client history truthfulness | PASS |
| Object thread start | PASS |
| Measurement body/garment separation | PASS |
| Precision capture | PASS |
| Freeze remains commitment | PASS |
| Visual coherence | CONDITIONAL (shell/workroom thread repeat) |
| Cinematic continuity | CONDITIONAL |
| Motion causality | PASS |
| Empty/loading/error language | PASS |
| Data authority integrity | PASS |
| SAC integrity | PASS |
| Responsive desktop | PASS |
| Responsive tablet | PASS |
| Responsive mobile | PASS |
| Accessibility regression | CONDITIONAL |
| Reduced motion | CONDITIONAL |
| Runtime visual evidence | PASS |
| Performance | CONDITIONAL |
| Protected asset integrity | PASS |
| Regression | CONDITIONAL |

## Commit hashes

- Feat: `f62726a` `feat(experience): add SER-F6 Client and Measurement workspaces`
- Docs: this commit

## Push confirmation / working-tree preservation

Unrelated dirt (`package-lock.json`, lockfiles, pnpm files, nested `stitch-flow/`) not staged.

## Final certification status

**SER-F6 STATUS: CONDITIONALLY CERTIFIED**  
**OWNER ACCEPTANCE: PENDING**

Next locked phase: **SER-F7 — Design Studio frame integration**.
