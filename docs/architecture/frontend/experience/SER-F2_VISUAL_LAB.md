# SER-F2 visual lab

Script: `apps/web/scripts/visual-lab.mjs` → `npm run lab:visual` (Edge/Chrome headless).  
**URL: product `/` (index.html), not experience-preview.html.**

| File | Viewport | Surface | Result |
|---|---|---|---|
| `lab/floor-1280.png` | 1280×800 | Floor after splash | **Captured.** Thread, Local workspace, Open client room, warm paper, production queue. |
| floor-390.png | 390×844 | Floor | **Not written** by headless Edge this environment |

Splash wait via `--virtual-time-budget=5000`.

Visual verification: **CONDITIONAL** (desktop Floor yes; mobile screenshot fail; other rooms not captured).
