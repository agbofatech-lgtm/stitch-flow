# STITCHFLOW SER-F6

CLIENT + MEASUREMENT EXPERIENCE RECONSTRUCTION

FINAL CERTIFICATION REPORT

**SER-F6 STATUS: CONDITIONALLY CERTIFIED**  
**OWNER ACCEPTANCE: PENDING**

## Executive summary

The Client room is a relationship workspace over the same AppContext people as the Floor. The person is the workroom title. Selecting a person starts the object thread. The Measurement table is a precision capture surface: body and garment are separate, pattern is derived, freeze remains the commitment. Shell thread now follows the workflow client. Neither room mounts `/shop` or unauthenticated CRUD.

## Baseline

Branch `arena/01a05677-stitch-flow`.

HEAD before this reconstruction pass: `fbca2195d87c0c27528854972398c16de4c1ec4b` (`docs(experience): record SER-F6 Client and Measurement experience`).

Predecessor F5 checkpoint: `2e8e059`.

## Starting forensic findings

F5 framed both rooms. An earlier F6 pass replaced HTTP `/customers` with an AppContext dossier and introduced body/garment capture. Remaining defects this pass corrected:

- Shell thread followed `selectedOrderId` only, so a client without an order appeared as “No client selected”.
- Shell “Continue to measurements” showed with no client.
- Workroom repeated place name + thread already in the shell.
- “Live profile opened … until frozen” falsely triggered MILESTONE.
- T2/T10 tools competed with capture as the primary surface.
- Floor continue did not call `workflow.selectOrder`, so Measurement could lose the Floor thread.
- Workflow did not hydrate `customerId` from a persisted selected order.

## Files changed

Principal: `Customers.tsx`, `MeasurementWorkspace.tsx`, `AtelierHome.tsx`, `StudioShell.tsx`, `WorkflowContext.tsx`, `WorkspaceInspector.tsx`, `atelier.tsx`, tests, visual lab, SER-F6 docs.

## Files intentionally not changed

`DesignStudio.tsx`, `patternEngine.ts`, `productionAssistant.ts`, `shared/types/index.ts`, `productionStageService.ts`, SAC/backend, AppContext authority model, localStorage schema, measurement field catalogues.

## Client room

See [`SER-F6_CLIENT_ROOM.md`](./SER-F6_CLIENT_ROOM.md).

## Measurement table

See [`SER-F6_MEASUREMENT_TABLE.md`](./SER-F6_MEASUREMENT_TABLE.md).

## Object thread

`selectCustomer` sets or clears `selectedOrderId`. Workflow hydrates client/profile from a persisted selected order. Floor continue and people rows start that thread. Shell `AtelierThread` prefers `workflow.customerId`.

## Truthful data/status language

Local workspace. Same people as the Floor. Live profiles are not frozen shop snapshots. No unmounted API URLs. No “synced”.

## Cinematic motion implementation

F3 only: MICRO on list rows; CONTEXTUAL on dossier/profile enter; MILESTONE only on freeze/fingerprint/version. Opening a live profile is quiet.

## Responsive implementation

Client 1280 / 768 / 390 captured. Measurement 1280 / 768 / 390 captured. Dossier is primary below `xl`. Measurement fields stack to one column below `sm`. 44px targets on lists, primary actions, and numeric capture fields.

## Accessibility safeguards

h2 workroom titles (person identity), labeled search, `aria-current` on selected rows, shared Dialog, numeric fields associated via Field, missing required fields via `aria-invalid` plus text (not color alone). No AT audit.

## Visual lab evidence

[`SER-F6_VISUAL_LAB.md`](./SER-F6_VISUAL_LAB.md).

## Performance measurements

`vite build`: `main-D8otJBXS.js` **927.48 kB** / gzip **264.28 kB**. Prior F6 main was 924.64 / 263.61. F5 main was 920.80 / 261.86. FPS **NOT VERIFIED**. No new animation or chart libraries.

## Tests and exact results

```
test:studio       13/13 pass
test:experience   23/23 pass
test:workflow     8/8 pass
vite build        exit 0
```

`tsc --noEmit` inherited FAIL. Not re-claimed.

## Protected asset verification

LF-normalized SHA-256, unchanged:

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

- Shell chrome still repeats place identity (F4 header + workroom kicker).
- 768 shell title truncates “Client room”.
- Capture-1280 is a scrolled still; freeze milestone is not a video.
- Final lab pass timed out waiting for the 390 Client workroom; 390 stills retained from an earlier successful runtime capture in this session.
- Seed `measurementProfiles` remains empty; live profiles are created in-session.
- Full screen-reader audit not performed (F12).
- Runtime FPS not measured (F13).

## Explicitly deferred

F7 Design Studio frame, F8 Production, F9 Ledger, F10 Control Center, F11–F15, SAC UI (`/shop`) for clients.

## Acceptance matrix

| Axis | Result |
|---|---|
| Client Room identity | PASS |
| Client context continuity | PASS |
| No fake active context | PASS |
| Client selection experience | PASS |
| Measurement experience | PASS |
| Measurement semantic preservation | PASS |
| Atelier materiality | PASS |
| F2 design-system consistency | PASS |
| F3 motion causality | PASS |
| Empty states | PASS |
| Loading states | CONDITIONAL (AppContext is local; no remote load) |
| Error honesty | PASS |
| Journey continuity | PASS |
| Responsive desktop | PASS |
| Responsive tablet | PASS |
| Responsive mobile | PASS |
| Accessibility baseline | CONDITIONAL |
| Reduced motion | CONDITIONAL (foundation tests; no video) |
| Runtime visibility | PASS |
| Visual evidence | PASS |
| Performance | CONDITIONAL |
| Protected integrity | PASS |
| SAC integrity | PASS |
| Regression | PASS |

## Commit hashes

- Feat: `03790d6` `feat(experience): reconstruct client and measurement workrooms`
- Docs: this commit

## Push confirmation / working-tree preservation

Unrelated dirt (`package-lock.json`, lockfiles, pnpm files, nested `stitch-flow/`) not staged.

## Final certification status

**SER-F6 STATUS: CONDITIONALLY CERTIFIED**  
**OWNER ACCEPTANCE: PENDING**

Next locked phase: **SER-F7 — Design Studio frame integration**.
