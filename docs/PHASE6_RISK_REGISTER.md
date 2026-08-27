# STITCHFLOW PHASE 6 RISK REGISTER

Live register. Classifications: P0 release blocker · P1 critical · P2 important · P3 enhancement.

## Resolved during Phase 6

| ID | Risk | Was | Resolution |
|---|---|---|---|
| R-04 | Android cleartext to hardcoded dev LAN IP; usesCleartextTraffic=true | P1 | RESOLVED (P6-3): network_security_config denies cleartext globally; manifest flags flipped; https scheme |
| R-05 | Android versionName "1.0" drift | P2 | RESOLVED (P6-3): 1.0.0; authoritative versioning module prevents recurrence |
| R-06 | PWA manifest branded "TailorPro"; stale root capacitor config | P2 | RESOLVED (P6-7): manifest → StitchFlow; root capacitor config aligned (com.stitchflow.app) |
| R-07 | MAX_PAYLOAD_SIZE code default 10mb vs documented 1mb | P2 | RESOLVED (P6-3): default 1mb, env-tunable; 413 live-verified |
| R-08 | No liveness/readiness/version split; no DB probe | P2 | RESOLVED (P6-1): four endpoints, DB-probed readiness with sanitized 503 |
| R-09 | No graceful shutdown; bare DB pool | P1 | RESOLVED (P6-2): full SIGTERM/SIGINT sequence + pool limits/timeouts/error handler (tested incl. timing) |
| R-10 | No log redaction | P2 | RESOLVED (P6-2): pino redact paths + recursive redactDeep wired into audit persistence (tested) |
| R-11 | No metrics collection | P2 | RESOLVED (P6-2): counters + latency histograms, admin-gated snapshot endpoint |
| R-14 | Backup/restore never exercised | P1 | RESOLVED IN CI (P6-4): end-to-end drill on embedded PG with independent verification; production-environment drill remains an operating procedure (runbook) |
| R-15 | Legacy docs/api.md port-5000 references | P3 | OPEN (documentation-only; superseded by PHASE6_DEPLOYMENT_RUNBOOK) |

## Open at Phase 6 close

| ID | Risk | Class | Status | Notes |
|---|---|---|---|---|
| R-01 | Production deployment not executed from this environment | P1 | OPEN — external | Reported as DEPLOYMENT VERIFICATION PENDING; runbook provided |
| R-02 | Live Paystack operation unverified | P1 | OPEN — external | IMPLEMENTED — LIVE VERIFICATION REQUIRED (credentials + dashboard webhook + real transaction) |
| R-03 | Android real-device QA not performed | P1 | OPEN — external | MANUAL DEVICE VERIFICATION REQUIRED; static config verified |
| R-12 | Main JS chunk 1.2 MB (no route-level code splitting) | P2 | OPEN — enhancement | Measured (PHASE6_PERFORMANCE_REPORT); no runtime bottleneck at current scale; future lazy-loading of Design Studio/PDF deps |
| R-13 | Legacy `apps/api/src` directory | P3 | OPEN | Unused at runtime; removal is safe housekeeping for a later phase |
| R-16 | Production alerting/monitoring not yet wired to a platform | P2 | OPEN — external | Signals + thresholds documented (operations runbook); requires a deployment target |

P0 open: **none**. P1 open: R-01/R-02/R-03 — all external-verification items, not code defects.
