# SER-F11 responsive forensic audit

Stage 0–1. Runtime inspection preceded remediation. F11 is presentation-level. No authority migration.

## Baseline

| Item | Value |
|---|---|
| Branch | `arena/01a05677-stitch-flow` |
| HEAD before | `35db4538f02ed9238e4174f7f179fbe51e0efd99` (SER-F10 docs) |
| Breakpoints | `sm 640` / `md 768` / `lg 1024` / `xl 1280` (`tokens.ts`) |
| Shell | `AtelierShell` rail `lg:static`; inspector `xl:block`; hamburger `<lg` |
| Unrelated dirt | `package-lock.json`, `pnpm-*.yaml`, nested `stitch-flow/` — preserved |

## Method

Product `/` at Vite `:5173`. CDP visual lab with `overflowX` / `titleClipped` probes after each capture. Navigation through the reconstructed rooms, not isolated mocks.

Mandatory viewports: 390×844, 768×800, 1280×800.

## Programme-wide findings (before remediation)

| Surface | 390 | 768 | 1280 |
|---|---|---|---|
| Shell | P2 duplicate thread/CTA | **P1** `h1.truncate` → “Client…”; Operator plane + next action + hamburger | PASS |
| Floor | PASS hierarchy; P2 duplicate chrome | P2 description ellipsis | PASS |
| Client room | PASS empty + dossier interiors | **P1** title clipped | PASS |
| Measurement table | PASS one-column; freeze in-flow | PASS 2-col fields; title full | PASS |
| Design frame | P1 nested `min-h-[70vh]` + toolbar chrome | P2 chrome | PASS frame |
| Design Studio internals | **PROTECTED** `w-[620px]` preview | PROTECTED | PROTECTED |
| Production | PASS identity/actions | PASS | PASS |
| Ledger | PASS money readable | PASS | PASS |
| Control Center | P2 UUID wrap | PASS after F10 quieting | PASS |
| Dialog / palette | P1 no visible Close | PASS overlay | PASS |
| Drawer | PASS (`floor-390-nav`) | hamburger | rail |

## Known hypotheses re-tested

| Hypothesis | Current reality |
|---|---|
| 768 “Client room” truncated | **Confirmed P1.** `WorkspaceHeader` used `truncate` while md+ packed Operator plane + next action + hamburger. |
| Design Studio fixed preview | **Confirmed protected limitation.** `DesignStudio.tsx` `h-[500px] w-[620px]`. Host now `overflow-x-auto`. |
| Visual lab Floor timeouts | **Confirmed automation.** Product rooms render; 390→nav hops flake. Matrix + per-room isolation added. |
