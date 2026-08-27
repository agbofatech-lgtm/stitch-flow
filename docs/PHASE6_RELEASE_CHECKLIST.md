# STITCHFLOW PHASE 6 RELEASE CHECKLIST

Executed 2026-08-27. Every box reflects an actually-run command in the final battery unless explicitly marked.

## Engineering gates (all executed)

- [x] Git checkpoint verified — `phase-5-commercial-foundation-complete` → `d377182` remote-verified
- [x] Phase 5 tag preserved (never moved/deleted)
- [x] Phase 6 checkpoint tags — `phase-6-before-production-hardening` → d377182; `phase-6-before-final-verification` → `feb7836` (both pushed)
- [x] TypeScript clean — web `tsc --noEmit` 0 errors
- [x] Frontend lint — exactly the 16 documented legacy protected findings, 0 new
- [x] Backend lint — `tsc --noEmit` 0 errors
- [x] Existing tests pass — 129 Phase 5 backend + 41 client, all green in final run
- [x] New Phase 6 tests pass — 52 new backend tests (181/181 total backend; 222 overall)
- [x] Protected IP tests — smoke 13/13 PASS (bodice/shirt/trouser/skirt/kaftan/production assistant)
- [x] Protected IP zero-diff — `git diff d377182 HEAD -- <3 protected files>` EMPTY
- [x] Build passes — web (vite + PWA precache 17 entries) + backend (tsc) + root `npm run build`
- [x] Secret scan clean — full Phase 6 diff scanned; only redaction test fixtures (dummy strings); bundle scan clean; only `.env.example` tracked
- [x] Environment matrix reviewed — PHASE6_ENVIRONMENT_MATRIX.md (no SERVER-ONLY value in bundle)
- [x] Database migrations verified — 001–012 applied by the real runner on every CI run; inventory test green; additive-only audit
- [x] Database integrity verified — integrity checker CLEAN pass + violation-detection + read-only tests
- [x] Tenant isolation verified — Phase 3/4/5 suites green + restored-database tenancy containment + cross-tenant usage detection
- [x] Authentication verified — full JWT lifecycle suite green
- [x] RBAC verified — role matrix suite green
- [x] Rate limiting verified — LIVE production-mode 429 + standard headers
- [x] Error sanitization verified — envelope tests + live checks; 413/400 taxonomy fixed
- [x] Financial invariants verified — financial-integrity suite green; totals survive backup/restore exactly
- [x] Inventory invariants verified — non-insertable negative stock (constraint-proven); restoration suite green
- [x] Billing regression verified — Phase 5 commercial + billing suites green (52 tests)
- [x] Paystack boundary verified — signature/idempotency/out-of-order via test provider; **live operation = VERIFICATION REQUIRED**
- [x] Offline workflow verified — 41/41 client offline suites green (repos, queue, engine, payment-offline, integration)
- [x] Sync verified — sync v1/v2 suites green: idempotency, duplicates, cursors, ordering, 207 batch semantics
- [x] PWA verified — manifest (StitchFlow branding), SW config audit (autoUpdate, precache shell only, API denylist, no runtime caching of mutations), build artifacts generated; **browser-matrix manual pass = VERIFICATION REQUIRED**
- [x] Android verified where possible — static config audit (cleartext denied, allowBackup=false, id com.stitchflow.app, versionName 1.0.0); **real device = MANUAL VERIFICATION REQUIRED**
- [x] Performance measured — PHASE6_PERFORMANCE_REPORT.md (measured values only)
- [x] Health endpoints verified — 4-endpoint contract + DB-down semantics
- [x] Request IDs verified — passthrough/generation/hostile-rejection/error-body correlation
- [x] Logging verified — pino JSON + redaction (redactDeep tested)
- [x] Backup procedure verified — db-backup.js executed (CI), manifest + checksums
- [x] Restore tested — END-TO-END in CI incl. independent verification; production-environment drill = procedure documented
- [x] Graceful shutdown verified — unit tests + live SIGTERM timing (< 10 s)
- [x] Documentation complete — 14 Phase 6 documents

## External verification items (cannot be executed in this environment)

- [ ] Production deployment verified — DEPLOYMENT VERIFICATION PENDING (runbook ready)
- [ ] Real-device Android QA — MANUAL DEVICE VERIFICATION REQUIRED
- [ ] Live Paystack transaction — LIVE VERIFICATION REQUIRED (external credentials)
- [ ] Production monitoring/alerting wiring — VERIFICATION REQUIRED (needs a deployment target)
