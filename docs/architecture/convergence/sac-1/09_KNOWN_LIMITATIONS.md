# Known Limitations

- Canvas `useMemo` still Path A (intentional).
- Trusted artifact is not AppContext/order SoT.
- T2 persist is best-effort; absence is session-only.
- Completeness uses engine required keys, not Studio slider map (dress → bodice keys).
- Hip 98/100/102 unresolved.
- Shop APIs, Postgres, offline sync, 3D, Phase 20 not started.
- DesignStudio.tsx hash changes (minimal seam). Engines/types do not.
- Web `tsc` inherited FAIL (`types.ts`, materials, reports).
- Backend Jest not reproduced this environment (ts-jest).
- Runtime performance NOT MEASURED. Bundle measured at verification if build run.
