# STITCHFLOW PHASE 6 OPERATIONS RUNBOOK

## Health & readiness

| Endpoint | Meaning | Use |
|---|---|---|
| GET /health | app metadata + version | quick check |
| GET /health/live | process alive | orchestrator liveness probe |
| GET /health/ready | DB reachable (probed, 2s timeout) | load-balancer readiness; 503 = pull from rotation |
| GET /health/version | version/commit/uptime/node/env | release verification |

DB down: live stays 200, ready 503 — the platform must route on **ready**, not live.

## Observability (implemented, in-process)

- **Correlation**: every response carries `X-Request-Id` (validated passthrough or generated UUID); the same id appears in pino request logs, error bodies (`error.requestId`), and audit rows (`audit_logs.request_id`, indexed). Trace a request: grep logs by id → query `audit_logs WHERE request_id = '...'`.
- **Logs**: pino JSON on stdout. Level via LOG_LEVEL (prod default info). Redaction: pino standard paths + `redactDeep` on audit metadata.
- **Metrics** (admin-only `GET /admin/metrics` JSON snapshot): http.requests/responses/4xx/5xx, http.latency_ms (p50/p95/p99 histogram), auth.failures, sync.failures, payment.failures, webhook.failures, database.errors. No personal data collected.
- Export path for future control plane/n8n/AI: metrics snapshot + structured logs + audit table are the three feeds; documented in PHASE6_AI_EXTENSION_ARCHITECTURE.md / PHASE6_AUTOMATION_EXTENSION_ARCHITECTURE.md — **no external dependency introduced in Phase 6**.

## Alerts worth wiring (when a monitor exists — VERIFICATION REQUIRED in production)

| Signal | Condition | Severity |
|---|---|---|
| /health/ready | 503 persisting > 2 min | P1 |
| http.5xx rate | > 1% of responses over 10 min | P1 |
| auth.failures spike | > 10× baseline over 15 min | P2 (credential stuffing) |
| sync.failures | any sustained growth | P2 |
| webhook.failures | repeated invalid-signature bursts | P2 (probing) |
| database.errors | sustained growth | P1 |

## Routine operations

- **Daily**: backup completed (see backup runbook); /health/ready green.
- **Weekly**: `npm --workspace=apps/backend run integrity:check` against production (read-only; exit 0 required — investigate any VIOLATION before it becomes an incident).
- **Per release**: PHASE6_RELEASE_CHECKLIST.md; verify /health/version.
- **Incident sequence**: detect (ready/5xx/metrics) → correlate (request id → logs → audit rows) → mitigate (rollback per deployment runbook / restore per backup runbook) → verify (integrity checker + smoke matrix) → post-mortem entries into the risk register.

## Known operational facts

- BullMQ queues are declared but NOT started in-process (no Worker instantiation) — Redis is not a runtime dependency of the API today.
- Test environment relaxes rate limits (NODE_ENV=test); production thresholds are the live-verified ones in PHASE6_SECURITY_AUDIT.md §4.
- `SHUTDOWN_TIMEOUT_MS` bounds drain time; supervisor should still set its own SIGKILL deadline above it.
