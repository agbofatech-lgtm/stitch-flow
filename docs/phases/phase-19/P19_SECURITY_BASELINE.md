# P19 Security Baseline

Status: **REQUIREMENTS** — not a certified control set. Runtime auth **INCOMPLETE**.

When commercial runtime is authorized, verify:

- Server-side authentication and authorization
- Tenant isolation not spoofable from the client
- Billing webhook signature verification
- Secrets as env names only (no client billing/JWT/DB/AI/admin secrets)
- Rate limiting where appropriate
- Audit of admin and billing events
- No client-authoritative entitlement or tenant selection
- Administrative access governed

**FACT now:** empty auth middleware; unfiltered payment SQL if mounted; FeatureGate client-side; P18 did not live-test tenant isolation.

Do not expose secrets. Do not impersonate the Owner.
