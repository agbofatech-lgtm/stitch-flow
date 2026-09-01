# P10 Performance Final

MEASURED: `main-CmHCTvjm.js` 1016.24 kB / gzip 294.04 kB
P7/P8: 1019.13 / 294.20
P5/P6: 1024.25 / 295.56
P3/P4: 1030.18 / 296.12

Architectural reason for ~1MB: DesignStudio + html2canvas/jspdf + room components in the main chunk. Safe opportunity: dynamic import of DesignStudio / pdf libs. Not executed (would be routing/split, out of polish if risky).

NOT MEASURED: TTI, INP, CLS, long tasks.
Chunk warning inherited.
