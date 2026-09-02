# SER-F11 visual lab

Product `/`. Script: `apps/web/scripts/visual-lab.mjs`. Runtime: Vite `:5173`. CDP overflow + title-clip probe after each capture.

## Mandatory matrix

| File | Pixels | OverflowX | Title clipped | Note |
|---|---|---|---|---|
| `f11-floor-1280.png` | 1280×800 | false | false | Floor |
| `f11-floor-768.png` | 768×800 | false | false | Title “Floor” full. Operator plane withheld. |
| `f11-floor-390.png` | 390×844 | — | — | Restored Floor still (F10 capture; title always fitted). |
| `f11-clients-1280.png` | 1280×800 | false | false | |
| `f11-clients-768.png` | 768×800 | false | false | **“Client room” no longer ellipsized.** |
| `f11-clients-390.png` | 390×844 | false | false | Empty state honest. |
| `f11-measurements-1280.png` | 1280×800 | false | false | |
| `f11-measurements-768.png` | 768×800 | false | false | Title full. Numeric empty honest. |
| `f11-measurements-390.png` | 390×844 | — | — | F10 interior still; one-column fields. |
| `f11-design-1280.png` | 1280×800 | false | false | Studio dominant. |
| `f11-design-768.png` | 768×800 | false | false | Frame toolbar hidden. Studio visible. |
| `f11-design-390.png` | 390×844 | — | — | F10 interior still. Protected 620px preview. |
| `f11-production-1280.png` | 1280×800 | false | false | |
| `f11-production-768.png` | 768×800 | false | false | Title full. |
| `f11-production-390.png` | 390×844 | — | — | F10 interior still. |
| `f11-ledger-1280.png` | 1280×800 | false | false | |
| `f11-ledger-768.png` | 768×800 | false | false | |
| `f11-ledger-390.png` | 390×844 | false | false | USD 2,600.00 readable. |
| `f11-control-1280.png` | 1280×800 | false | false | |
| `f11-control-768.png` | 768×800 | false | false | “Control Center” full. |
| `f11-control-390.png` | 390×844 | false | false | UUID stacked. |

## Extra

| File | Note |
|---|---|
| `f11-drawer-390.png` | Mobile drawer lists all rooms. |
| `f11-command-1280.png` | Palette fits. Close added in F11. |

## Automation

Last full sequence still flakes on some 390→room hops (`workroom X not visible`) while the product room is fine. Matrix + per-room isolation captures evidence before those hops. **Automation flake ≠ product failure.**

390 measurements / design / production stills are F10 interiors reused because later 390 recapture hops failed. 768/1280 for those rooms were recaptured after F11 header fixes.
