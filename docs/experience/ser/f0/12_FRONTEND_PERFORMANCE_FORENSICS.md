# Frontend performance forensics

## Measured (this conversation and SAC-4/PEX inheritance)

| Item | Result | Grade |
|---|---|---|
| Vite HTML boot | 200 on :5173 and :5174 | MEASURED |
| Last product `vite build` (SAC-4 session) | ~2864 modules; `main-*.js` **1041.19 kB** / gzip **301.57 kB**; chunk warning >500 kB | MEASURED (prior) |
| Design Studio code-split | not split; in main | OBSERVED (source/build) |
| html2canvas / jspdf | separate chunks in that build | MEASURED (prior) |
| Experience preview second Rollup input | `experience-preview.html` | SOURCE |
| Runtime FPS / TTI / memory | — | **NOT VERIFIED** |
| Rerender cost of AppContext | large provider | INFERRED |
| Path A useMemo in Studio | CPU on measurement edits | INFERRED |
| Animation jank | 220ms panel + splash keyframes | INFERRED |

## Architecture risks (INFERRED)

- AppContext is a broad provider; StudioShell subscribes to customers, orders, alerts, member, view.
- DesignStudio is a giant component; not lazy-loaded.
- No screenshot/perf lab in SER-F0.

Do not add dependencies to “fix” this in F0.
