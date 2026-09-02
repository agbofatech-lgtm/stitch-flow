# SER-F4 IMPLEMENTATION REPORT

Atelier shell + workspace orchestration in the **real** Vite runtime (`main.tsx` → `StudioShell` → `AtelierShell`). Rooms were not rebuilt. Design Studio internals were not rewritten. SAC was not touched.

**SER-F4 STATUS: CONDITIONALLY CERTIFIED**  
**OWNER ACCEPTANCE: PENDING**

---

## 1. Executive Summary

F4 turns the F2/F3 visual shell into a spatial operating environment: named rooms, a persistent client/order thread, one honest next action per place, Control Center as the darker operator plane, and a command palette that goes to rooms.

The user can now see **where they are**, **whether a client is selected**, **what they can do next**, and **where they can go**, without leaving AppContext navigation.

## 2. Starting State

| Item | Value |
|---|---|
| Branch | `arena/01a05677-stitch-flow` |
| HEAD before F4 | `9ee802853bb513cb3a80ed091134d1a8b04ae365` (SER-F3 docs) |
| Runtime | AppContext `currentView`; measurements seam already existed |
| F2/F3 | Conditionally certified. Floor visual language + motion grammar present |
| Dirt preserved | `WorkflowContext.tsx` stub, lockfiles, pnpm workspace files, nested `stitch-flow/` |

Forensic note: `lab/floor-1280.png` from F3 still showed “Atelier Home / Client Studio”. F4 recaptured it.

## 3. Files Changed

### Feat (product)

- `apps/web/src/studio/atelierGrammar.ts` **(new)**
- `apps/web/src/studio/StudioShell.tsx`
- `apps/web/src/studio/workspaces.ts`
- `apps/web/src/studio/studio.test.ts`
- `apps/web/src/atelier/AtelierHome.tsx`
- `apps/web/src/atelier/DesignStudioFrame.tsx`
- `apps/web/src/experience/shell/AtelierShell.tsx`
- `apps/web/src/experience/shell/AtelierNavigation.tsx`
- `apps/web/src/experience/shell/CommandPalette.tsx`
- `apps/web/src/experience/experience.test.ts`
- `apps/web/scripts/visual-lab.mjs`

### Docs

- `docs/architecture/frontend/experience/SER-F4_*.md`
- `docs/architecture/frontend/experience/lab/*.png`
- pointers in `docs/architecture/AGENT_START_HERE.md`, `docs/architecture/README.md`, `docs/architecture/frontend/experience/README.md`

## 4. Files Not Changed (protected)

| Asset | SHA-256 (git blob / LF) | Status |
|---|---|---|
| `patternEngine.ts` | `d02000d6b8e96b2665bde245056367d5c72f05d3447893469ca91e84510e16dc` | unchanged |
| `productionAssistant.ts` | `140a646d2bfa933e47951169b953f29bef108b6e0e48dd8dfe99a3c66ad571c4` | unchanged |
| `shared/types/index.ts` | `424ef6181705cffcbcbbf7008ddf85c61b65cd3a820bb167d1fb4033eee3d0d9` | unchanged |
| `productionStageService.ts` | `eef8854f42b6aa41930f74d18e7ab35cfc709240c5a3254c60981e0dfccd67c8` | unchanged |
| `DesignStudio.tsx` | `8e68e8bb665202e71757a8067629bba35907cd42cc06c4c5ad271549cc1d40db` | unchanged (post-SAC-1) |

No React Router. No new design tokens. No new motion library. No backend/API/schema files.

## 5. Shell Architecture

See [`SER-F4_SHELL_ARCHITECTURE.md`](./SER-F4_SHELL_ARCHITECTURE.md).

Five layers in the existing `AtelierShell`: identity, spatial nav, work context, workspace canvas, status. `data-atelier-place` identifies the current place for tests and the visual lab.

## 6. Navigation Grammar

See [`SER-F4_NAVIGATION_GRAMMAR.md`](./SER-F4_NAVIGATION_GRAMMAR.md).

Room movement is `goTo` → workspace state + `setView` when an `AppView` exists. Measurements still has no `AppView`. Next actions never invent save/sync/billing.

## 7. Client / Order Continuity

See [`SER-F4_CONTEXT_THREAD.md`](./SER-F4_CONTEXT_THREAD.md).

Source: `selectedOrderId`. Display: `AtelierThread`. Floor no longer borrows the first recent customer. Empty copy is “No client selected” / “No active client”.

## 8. Motion Integration

Reuses F3 `motion.ts` only:

- MICRO: rail `sf-micro-press`
- CONTEXTUAL: `AtelierThread` key change
- WORKSPACE: canvas `workspacePreset(journeyFrom, workspace)`
- MILESTONE: unchanged (measurement freeze only; not used for shell navigation)

## 9. Responsive Implementation

See [`SER-F4_RESPONSIVE_SHELL.md`](./SER-F4_RESPONSIVE_SHELL.md).

Desktop rail; 768 hamburger; 390 drawer + full-width canvas + sheet inspector. Evidence at required 1280×800 and 390×844.

## 10. Accessibility

- Skip link and `#workspace-main` retained
- Rail `aria-current="page"`
- Nav / primary / icon / palette targets `min-h-11` (44px)
- Command palette remains a `Dialog` (focus trap, Escape, restore)
- No screen-reader audit this phase → **CONDITIONAL**

## 11. Performance

Measured `vite build` (F4 tree):

| Chunk | Raw | gzip |
|---|---|---|
| `main-BUHTN65l.js` | 919.16 kB | 261.24 kB |
| `DataTable-CZIXm9Zr.js` | 313.38 kB | 101.45 kB |

F3 main was 917.34 / 260.73. Delta is the grammar/host strip, not a new library.

FPS / CLS / memory: **NOT VERIFIED**.

## 12. Visual Evidence

See [`SER-F4_VISUAL_LAB.md`](./SER-F4_VISUAL_LAB.md). All listed PNGs exist at the stated pixel sizes.

## 13. Test Results

```
npm --workspace=apps/web run test:studio
# tests 11, pass 11, fail 0

npm --workspace=apps/web run test:experience
# tests 21, pass 21, fail 0

npm --workspace=apps/web run build
# exit 0 (chunk warning >500 kB inherited)
```

`tsc --noEmit` remains an **inherited FAIL** (`materials.ts` / `reports.ts` / corrupted `types.ts` barrel). Not treated as an F4 regression; not re-run as a pass claim.

## 14. Protected Integrity

Hashes in section 4. `git diff` on those five paths: empty.

## 15. SAC Integrity

No edits under `apps/backend` shop persistence, `/shop` routes, T2 mirror, tenant isolation, or sync. AppContext remains UI SoT. Connectivity toast: “Workspace probe reachable. UI store is still local.” Status: Offline / Local workspace / Queued. Never “Synced”.

## 16. Known Limitations

- Room interiors (Customers “backend API”, Design Studio chrome inside the host, Production board, Ledger stations) are **not** F4 rebuilds. F5+ owns workroom standard.
- Client room lab shot can show AppContext “5 clients” while the interior still loads unmounted HTTP (existing dual authority; not faked).
- Floor repeats the thread (shell strip + page). Redundant, not false.
- Motion cannot be proven by stills.
- FPS not measured.
- Accessibility: no AT pass.
- Command palette “Work” client entries navigate to the Client room; they do not select the client (no new selection API invented).

## 17. Acceptance Matrix

| Axis | Result |
|---|---|
| Spatial shell coherence | PASS |
| Atelier navigation grammar | PASS |
| Client/order continuity | PASS |
| Workspace orchestration | PASS |
| F2 design-system integration | PASS |
| F3 motion integration | PASS |
| Responsive behavior | PASS |
| Accessibility | CONDITIONAL |
| Reduced motion | CONDITIONAL (code path + still; no video) |
| Performance | CONDITIONAL (bundle measured; FPS NOT VERIFIED) |
| Runtime visibility | PASS |
| Protected asset integrity | PASS |
| SAC integrity | PASS |
| Regression safety | CONDITIONAL (`tsc` inherited fail; rooms interiors unchanged) |

## 18. Git

Branch `arena/01a05677-stitch-flow`. Two-commit pattern. Unrelated dirt not staged.

- Feat: `ab75b9d` `feat(experience): add SER-F4 atelier shell orchestration`
- Docs: this commit (`docs(experience): record SER-F4 atelier shell orchestration`)

## 19. Certification

**SER-F4 STATUS: CONDITIONALLY CERTIFIED**  
**OWNER ACCEPTANCE: PENDING**

Architecture and runtime demonstration are sound. Conditional because interiors remain F5, FPS/AT were not measured, and inherited `tsc` failure remains.

## 20. Next Phase

**Locked:** SER-F5 — Atelier Floor + Standard Workroom Experience.

Do not begin F5 until the owner authorizes it. 3D, Phase 20, PSP, unauthenticated CRUD, and Design Studio internals remain locked.
