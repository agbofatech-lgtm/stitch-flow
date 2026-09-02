# STITCHFLOW SER-F8

PRODUCTION FLOOR EXPERIENCE RECONSTRUCTION

FINAL CERTIFICATION REPORT

**SER-F8 STATUS: CONDITIONALLY CERTIFIED**  
**OWNER ACCEPTANCE: PENDING**

## Baseline

Branch `arena/01a05677-stitch-flow`.  
HEAD before: `9c943907e6cb3beb30a57fe6c0357ba40a074b9c`.

Working-tree dirt preserved (`package-lock.json`, pnpm files, nested `stitch-flow/`).

## Forensic authority

See [`SER-F8_PRODUCTION_AUTHORITY.md`](./SER-F8_PRODUCTION_AUTHORITY.md).

The previous interior was an HTTP queue/Kanban over unmounted `/orders` and `/customers`, with `buildStagesFromStatus` inventing stage progress and `filteredOrders[0]` as fake selection.

## Implementation

Rebuilt `ProductionBoard.tsx` on AppContext + workflow thread. Floor `openProduction` now uses `workflow.selectOrder`. Journey includes Production. Inspector names the thread and does not transition stages.

Not changed: `DesignStudio.tsx`, Pattern Engine, Production Assistant, types, productionStageService, SAC/backend.

## Continuity

Selecting a garment calls `workflow.selectOrder`. No first-order fallback. Missing thread is named.

## Trusted finalization

No second Finalize. Design table remains the finalize room.

## Visual / motion / responsive

F2 workroom. F3 journey + MICRO on rows. 1280 / 768 / 390 captured (empty + active).

## Performance

`vite build`: `main-DfSx4xGh.js` **912.98 kB** / gzip **260.50 kB**. F7 main was 928.76 / 264.59 (HTTP board removed). FPS **NOT VERIFIED**.

## Tests

```
test:studio       14/14 pass
test:experience   24/24 pass
test:workflow     8/8 pass
vite build        exit 0
```

`tsc --noEmit` inherited FAIL.

## Protected hashes (unchanged)

| Asset | SHA-256 |
|---|---|
| patternEngine.ts | `d02000d6b8e96b2665bde245056367d5c72f05d3447893469ca91e84510e16dc` |
| productionAssistant.ts | `140a646d2bfa933e47951169b953f29bef108b6e0e48dd8dfe99a3c66ad571c4` |
| shared/types/index.ts | `424ef6181705cffcbcbbf7008ddf85c61b65cd3a820bb167d1fb4033eee3d0d9` |
| productionStageService.ts | `eef8854f42b6aa41930f74d18e7ab35cfc709240c5a3254c60981e0dfccd67c8` |
| DesignStudio.tsx | `8e68e8bb665202e71757a8067629bba35907cd42cc06c4c5ad271549cc1d40db` |

## SAC

No `/shop` migration. No remount. No schema. No sync activation.

## Known conditions

- Stage transitions not executable on this floor (unmounted HTTP / F14 `/shop`).
- Many seed orders have recorded stages without an `active` stage — the UI says so.
- Motion video not captured. Lab timeout after production stills (Floor at 768).
- AT audit and FPS deferred.

## Deferred

F9 Ledger, F10 Control Center, F11–F15, `/shop` UI, 3D, Phase 20, PSP.

## Acceptance

| Axis | Result |
|---|---|
| Production Floor identity | PASS |
| Client/order continuity | PASS |
| Garment continuity | PASS |
| Production-stage integrity | PASS |
| Task hierarchy | PASS |
| Deterministic authority preservation | PASS |
| Pattern Engine / Production Assistant | PASS |
| Trusted finalization boundary | PASS |
| Status honesty | PASS |
| Empty / error | PASS / CONDITIONAL (no remote load; HTTP error path removed) |
| Responsive 1280 / 768 / 390 | PASS |
| Accessibility / reduced motion | CONDITIONAL |
| Motion causality | CONDITIONAL |
| Visual evidence | PASS |
| Performance | CONDITIONAL |
| TypeScript | INHERITED FAIL |
| SAC / protected / regression | PASS |

## Commits

- Feat: `e24d1b3` `feat(experience): reconstruct production floor workroom`
- Docs: this commit

**SER-F8 STATUS: CONDITIONALLY CERTIFIED**
