# Phase 7 — Future AI / n8n Integration Architecture

Status: FOUNDATION IMPLEMENTED (interfaces + placeholders only). **No OpenAI / Gemini / Claude / n8n / WhatsApp runtime dependency exists in this repository.** No SDKs, no API keys, no credentials, no paid calls.

## The four event classes (STRICTLY SEPARATE — never collapse)

| Class | Store | Purpose | Retention/derivation |
|---|---|---|---|
| Security & compliance audit | `audit_logs` | Who did what, redacted, immutable | per Phase 6 policy |
| Business timeline | `customer_timeline_entries` | Customer-visible history, sync-aware | business data |
| Product analytics | `usage_events` | Aggregate usage intelligence | bounded metadata, retention policy applies |
| Integration events | `integration_outbox` | Outbound webhooks/automation queue | PENDING → DISPATCHED |

Each has different consumers, retention, and trust models. Phase 7 added the last two WITHOUT touching the first two.

## Event flow map (Phase 7)

Business routes (customers, orders, payments, appointments, referrals) fire **best-effort, non-fatal** side effects:

```
route success path
  ├─ void timelineService.record(...)        → customer_timeline_entries
  ├─ void outboxService.record(...)          → integration_outbox  (idempotent per entity)
  └─ (audit via auditLogService, as Phase 6)
```

Failures in any side effect NEVER fail the business request (analytics and integrations are subordinate to core operations).

## Provider contracts (`src/providers/contracts.ts`)

Four interfaces, deliberately provider-neutral:

1. **AIProvider** — generate / analyze / classify / summarize. Requests carry `purpose`, `actorId`, `workspaceId`, `requestId`, `inputClassification` (`operational` | `pseudonymized` | `tenant-data`) and cost metadata. Tenant data is never sent to an external provider automatically.
2. **DiagnosticProvider** — `analyzeIncident()` → advisory diagnosis with `aiGenerated`, `confidence`, `advisory: true`. Implemented today by the deterministic, dependency-free `RuleBasedDiagnosticProvider` (same input ⇒ same output, no network, no cost).
3. **AutomationProvider** — future n8n bridge: `emitEvent` / `triggerWorkflow` / `getWorkflowStatus`. The outbox table is the durable queue it will drain.
4. **CommunicationProvider** — future WhatsApp/SMS/email/push: `send` / `getStatus`.

Nothing self-registers; `providerRegistry` starts EMPTY. The app is fully functional with every provider absent (verified by tests — core flows never touch providers).

### Rules every future implementation must follow

- Secrets are server-only env (never `VITE_*`, never committed).
- Provider failure must never break core workflows.
- AI output is ADVISORY, labeled `AI-GENERATED`, never auto-executed.
- AI is read-only + suggestion-only. No autonomous production agents.
- Requests carry purpose + actor + workspace + requestId for the audit trail.

## Developer Control Plane (`/platform`)

- Roles: `platform_owner, platform_admin, platform_support, platform_analyst` (users.role). **Distinct from workspace roles** — a workspace OWNER has NO platform privileges. The legacy site `admin` maps to bootstrap `platform_owner` (documented; seeded operator only).
- Read level: all platform roles. Operate (incident status): +support. Write (feature flags): owner/admin only.
- Endpoints: overview (DAU/WAU/MAU by workspace, version health), workspaces overview (plan, members, customers, orders, errors 7d, sync failures 7d), feature usage, health signals, error center, incidents (+ advisory diagnosis), feature flags.

## Feature flags (server-authoritative)

`feature_flags` table, platform-managed, audited on change. Seeded ALL FALSE:

`AI_DIAGNOSTICS, OPENAI, GEMINI, CLAUDE, N8N, CUSTOMER_PORTAL, WHATSAPP, ADVANCED_ANALYTICS`

The server NEVER trusts client-supplied flags/plan/role/entitlements; flags are resolved server-side per request.

## Customer portal (separate authorization boundary)

- `portal_customers` — distinct accounts, NOT staff `users`.
- Portal tokens: JWT audience `stitchflow-portal` (staff audience is `stitchflow-clients`) — **structural crossover rejection both ways** (tested).
- Portal scope: own profile + explicit consent state, own orders (read-only), own upcoming appointments. No staff routes, no workspace switching.
- Marketing consent defaults FALSE; absence of a record ≠ consent.

## Telemetry data minimization

- `usage_events.metadata` is size-capped (8 KB, CHECK-enforced) and key-filtered at ingest (`password|token|secret|apikey|authorization|databaseurl` stripped — tested).
- Event names are allowlisted; batches bounded (≤ 200).
- No passwords, JWTs, API keys, payment secrets, or full auth headers are ever recorded. Error messages are truncated to 500 chars.
- Default retention is bounded (no unlimited telemetry retention by default) — enforcement hook is the retention policy constant in `usageService` (future: scheduled job).

## Prompt-injection boundary (documented obligation)

Customer-entered content (notes, feedback, fit observation text, case descriptions) is **untrusted input**. When a future AI provider consumes it:

1. It must be passed as DATA (structured `context`), never concatenated into instructions.
2. Instructions live only in server-controlled prompts.
3. Model output is advisory and must never be executed (no SQL, no state changes, no messages sent) without human approval.

`AIRequest.context` enforces this shape at the contract level.

## n8n future wiring (NO second sync engine)

- Business mutation sync continues to use `sync_changes` / `processed_mutations` / `clientMutationId` (unchanged Phase 5 machinery).
- Automation events flow ONLY through `integration_outbox` (idempotent unique key per `(workspace, event_type, entity)`; tested).
- A future n8n AutomationProvider drains the outbox; no new sync table, no second rate limiter (the existing global limiter covers new routes).

## Migration numbering

Phase 7 used 013 (customer growth) and 014 (intelligence) — next is **015**, per the repository's migration directory (source of truth).
