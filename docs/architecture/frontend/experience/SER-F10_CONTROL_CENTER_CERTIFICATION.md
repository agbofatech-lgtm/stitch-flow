# STITCHFLOW SER-F10

CONTROL CENTER + OPERATOR PLANE RECONSTRUCTION

CERTIFICATION REPORT

**SER-F10 STATUS: CONDITIONALLY CERTIFIED**  
**OWNER ACCEPTANCE: PENDING**

## Baseline

Branch `arena/01a05677-stitch-flow`.  
HEAD before: `46974583767eae322527ff2ae3a97cdfb84462fc`.

Working-tree dirt preserved (`package-lock.json`, `pnpm-*.yaml`, nested `stitch-flow/`).

## Forensic authority

See [`SER-F10_CONTROL_CENTER_FORENSIC_AUDIT.md`](./SER-F10_CONTROL_CENTER_FORENSIC_AUDIT.md).

## Implementation

See [`SER-F10_CONTROL_CENTER_IMPLEMENTATION.md`](./SER-F10_CONTROL_CENTER_IMPLEMENTATION.md).

Control Center rebuilt as the StitchFlow operator plane using `AtelierWorkroom` and existing `data-plane="control"`. Sections: Workspace, System, Operations, Platform. Mutation of profile/branding/plan simulation remains in Settings. Platform section is honest ADR-007 copy plus an optional `/control` probe. No fabricated AGBOFA product.

F1 Control Center relationship document is **not rewritten**. F10 supersedes its conceptual identity: this plane is workspace operations, not AGBOFA operator JWT as the product.

## Continuity

Atelier rooms remain the garment thread. Control Center is the other room in the same building. Return to atelier restores `data-plane="atelier"`. Settings remains a workspace room, not a platform console.

## Tests / build

```
test:studio       17/17 pass
test:experience   24/24 pass
test:workflow     8/8 pass
vite build        exit 0
```

`tsc --noEmit` inherited FAIL.

`main-Bok4r1YF.js` **478.80 kB** / gzip **123.10 kB** (F9 was 473.24 / 121.66). FPS **NOT VERIFIED**.

## Protected hashes (unchanged, LF-normalized)

| Asset | SHA-256 |
|---|---|
| patternEngine.ts | `d02000d6b8e96b2665bde245056367d5c72f05d3447893469ca91e84510e16dc` |
| productionAssistant.ts | `140a646d2bfa933e47951169b953f29bef108b6e0e48dd8dfe99a3c66ad571c4` |
| shared/types/index.ts | `424ef6181705cffcbcbbf7008ddf85c61b65cd3a820bb167d1fb4033eee3d0d9` |
| productionStageService.ts | `eef8854f42b6aa41930f74d18e7ab35cfc709240c5a3254c60981e0dfccd67c8` |
| DesignStudio.tsx | `8e68e8bb665202e71757a8067629bba35907cd42cc06c4c5ad271549cc1d40db` |

## SAC

No `/shop` migration. No remount of unauthenticated CRUD as authority. No schema. No sync. No PSP. No tenant authority invention. No auth redesign.

## Visual lab

See [`SER-F10_VISUAL_LAB.md`](./SER-F10_VISUAL_LAB.md). Product `/` at 1280 / 768 / 390 plus System / Operations / Platform stills.

## Conditions

- Settings still probes unmounted HTTP settings/members; failures are not treated as shop SoT. Not remounted.
- Backend `/control` routes exist and may self-label `AGBOFA_PLATFORM_CONTROL_CENTER`. That is an API field, not a product. UI does not claim the platform is connected.
- Optional probe can surface whatever the API returns; empty remains empty.
- Visual lab later failed waiting Floor after ledger-390. Control stills were captured.
- Motion video not captured.
- AT/FPS deferred. Programme-wide responsive/a11y/performance remain F11–F13.

## Deferred / locked

SER-F11 Responsive Certification  
SER-F12 Accessibility Certification  
SER-F13 Performance Certification  
SER-F14 SAC UI Convergence  
SER-F15 Final Experience Certification  
`/shop` UI, sync, PostgreSQL schema, tenant authority, auth redesign, billing, PSP, Phase 20, 3D, Design Studio / Pattern Engine / Production Assistant rewrites.

## Acceptance matrix

| Axis | Result |
|---|---|
| Operator-plane identity | PASS |
| Atelier vs Control distinction | PASS |
| Authority classification | PASS |
| No invented mutation | PASS |
| AGBOFA platform honesty | PASS |
| Protected engines untouched | PASS |
| Settings remains existing mutation home | PASS |
| Status honesty (no Synced) | PASS |
| Responsive runtime demonstrated at 1280/768/390 | PASS (Control Center stills) |
| Full lab sequence after 390 | CONDITION — Floor wait flake |

## Explicitly not implemented

AGBOFA Platform Control Center. Tenant admin. Live billing. Feature entitlement server. Domain engine switches. Chart dashboard. Cyberpunk overlay.

**SER-F10 STATUS: CONDITIONALLY CERTIFIED**

STOP. Do not begin SER-F11.
