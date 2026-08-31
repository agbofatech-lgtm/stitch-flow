# P18 Performance Audit

## Protocol

| Field | Value |
|---|---|
| Date | 2026-08-31 |
| Environment | Arena sandbox (Linux, Node 22, no end-user browser session) |
| Device | UNKNOWN (host VM) |
| Browser | **NOT TESTABLE** (no certified Lighthouse/WebPageTest run) |
| Network | N/A for UI; local disk for vite |
| Dataset | repository default |
| Tool | `npx vite build`; node:test durations |

## Targets vs evidence

| Metric | Target | Measurement | Verdict |
|---|---|---|---|
| Initial page load | < 2s | not measured in browser | **NOT TESTABLE** |
| UI interaction | < 100ms | not measured | **NOT TESTABLE** |
| API p95 | < 500ms | `/health` not load-tested | **NOT TESTABLE** |
| Offline | no degradation | not browser-matrix | **UNKNOWN** |
| Memory growth | none uncontrolled | not profiled | **UNKNOWN** |
| vite production build | n/a | ~8s transform 2843 modules | **FACT** (build time ≠ page load) |
| Main bundle | n/a | `main-*.js` ~916 kB / ~256 kB gzip | **FACT** — large; not automatically FAIL |

Forbidden language avoided: no “looks fast”.

Performance certification: **UNKNOWN / NOT TESTABLE** for user-facing targets.
