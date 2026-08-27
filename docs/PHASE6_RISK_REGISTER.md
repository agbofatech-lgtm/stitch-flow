# STITCHFLOW PHASE 6 RISK REGISTER

Live register; updated as subsystems complete. Classifications: P0 release blocker · P1 critical · P2 important · P3 enhancement.

## Open at baseline (2026-08-27, commit d377182)

| ID | Risk | Class | Status | Notes |
|---|---|---|---|---|
| R-01 | Production deployment not yet executed from this environment; no production credentials | P1 | OPEN — verification item | Will be reported as `DEPLOYMENT VERIFICATION PENDING` unless environment provided; must not be claimed as verified |
| R-02 | Live Paystack operation unverified (no production secret key, no dashboard webhook, no real transaction) | P1 | OPEN — external dependency | Acceptable Phase 6 result: `IMPLEMENTED — LIVE VERIFICATION REQUIRED` |
| R-03 | Android real-device QA not possible in this environment (no device/emulator) | P1 | OPEN — manual item | Will be reported `MANUAL DEVICE VERIFICATION REQUIRED` |
| R-04 | Android `network_security_config.xml` permits cleartext to hardcoded dev LAN IP `10.64.37.239`; manifest `usesCleartextTraffic="true"` | P1 | MITIGATION PLANNED (P6 security subsystem) | Dev-era config; must not ship in production build |
| R-05 | Android versionName "1.0" drifts from app version 1.0.0 | P2 | MITIGATION PLANNED (P6 versioning) | |
| R-06 | Brand naming drift: PWA manifest "TailorPro - Design Studio", root capacitor.config.ts "Tailor Studio" vs product StitchFlow | P2 | OPEN — product decision | Not an engineering defect; root capacitor config is stale/unused (actual platform under apps/mobile). Recorded for owner decision; not churned in Phase 6 beyond the stale-config note |
| R-07 | `MAX_PAYLOAD_SIZE` default in code is 10mb while `.env.example` documents 1mb | P2 | MITIGATION PLANNED (P6 hardening) | Align default to documented 1mb |
| R-08 | No liveness/readiness/version health split; health does not probe DB | P2 | MITIGATION PLANNED (P6 health subsystem) | |
| R-09 | No graceful shutdown; pool lacks limits/timeouts/error handler | P1 | MITIGATION PLANNED (P6 reliability subsystem) | |
| R-10 | No redaction configured on pino logger | P2 | MITIGATION PLANNED (P6 logging subsystem) | |
| R-11 | No metrics collection | P2 | MITIGATION PLANNED (P6 observability subsystem) | |
| R-12 | Web bundle 2634.51 KiB precache; single >500 kB JS chunk warning | P2 | OPEN — measured, not blocking | Record performance baseline; optimize only verified bottlenecks |
| R-13 | `apps/api/src` legacy directory + stale root `capacitor.config.ts` may confuse future agents | P3 | OPEN | Documented in baseline; removal is safe housekeeping but not required for launch |
| R-14 | Restore/backup never exercised end-to-end | P1 | MITIGATION PLANNED (P6 backup subsystem) | Will execute logical backup→destroy→restore→verify against embedded PostgreSQL 18.4 |
| R-15 | `docs/api.md` references port 5000-era endpoints (legacy doc) | P3 | OPEN | Documented; low priority |

## Resolved during Phase 6

(appended as subsystems complete)
