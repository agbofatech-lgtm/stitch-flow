# STITCHFLOW PHASE 6 — FUTURE AI PROVIDER EXTENSION ARCHITECTURE

**Status: documentation only. Phase 6 introduces NO AI provider dependency, NO provider SDK, NO API cost. The system is fully functional with all AI providers absent.**

## Established extension points (already in the codebase)

1. **Correlation spine** (Phase 6): `X-Request-Id` + request context (workspace/actor via AsyncLocalStorage) + correlated audit rows — every future AI/diagnostic consumer gets a join key for free.
2. **Structured logs** (pino JSON) — machine-consumable incident evidence.
3. **Metrics snapshot** (`GET /admin/metrics`, JSON) — operational telemetry feed.
4. **Audit trail** (`audit_logs` with workspace/request correlation) — behavioral history.

## Future `AIProvider` boundary (recommended shape — to be implemented in a later phase)

```
interface AIProvider {            // NOT implemented in Phase 6 — boundary only
  readonly name: 'openai' | 'gemini' | 'claude' | ...;
  complete(input: DiagnosticInput): Promise<DiagnosticOutput>;
}
```

- A registry/factory mirroring the existing `src/billing/providers` pattern (BillingProvider → TestBillingProvider/PaystackProvider) is the proven house style for pluggable providers: constructor-injected config, a deterministic test double, live implementation behind a config flag.
- Candidate consumers (future phases): incident diagnosis (feed: logs + metrics + audit by requestId), usage intelligence, feature recommendations, developer agents for the Control Plane.
- Cost control: providers must sit behind an explicit env flag defaulting to OFF, exactly like `BILLING_PROVIDER=none` today.

## Rules carried forward

- Never make customer-app correctness depend on an AI provider.
- Never send confidential payload data to a provider without an explicit data-classification decision.
- Provider secrets are SERVER-ONLY (same matrix row style as PAYSTACK_SECRET_KEY).

**NOT REQUIRED FOR PHASE 6.**
