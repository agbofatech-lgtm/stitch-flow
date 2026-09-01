# P8 — Performance Perception Audit

| Evidence | Class |
|---|---|
| Forced 1800ms splash | FACT — always waits even if ready |
| Vite production `main-*.js` ~916 kB / 257 kB gzip | FACT (P19.11 build) |
| Chunk warning >500 kB | FACT |
| DesignStudio.tsx ~4048 lines, canvas redraw on many deps | FACT |
| Experience Skeleton primitive | EXISTS; little use on CRUD lists |
| Inter from Google Fonts (render-blocking link) | FACT |
| No route-level code split of DesignStudio | INFERENCE from App import graph |

Feel: **ACCEPTABLE** after splash; splash itself can feel **SLOW**. Canvas work **NOT instrumented** (P18 condition: browser perf not measured).

Do not claim INSTANT.
