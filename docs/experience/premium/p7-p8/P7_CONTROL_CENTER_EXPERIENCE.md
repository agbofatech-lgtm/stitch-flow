# P7 Control Center Experience

IA actually implemented (APIs exist):

SYSTEM: Overview `/control/status`, Configuration `/control/configuration`
TENANCY: Tenants `/control/tenants`
COMMERCIAL: Billing port `/control/billing/provider` (provider-neutral; live PSP deferred)
GOVERNANCE: Audit `/control/audit`

Empty payloads stay empty. Nested objects may still JSON-stringify as a field value (CONDITIONAL, not invented metrics).

Not built: Plans, Entitlements, Subscriptions, Usage, Account as separate product modules — no supporting UI authority beyond the billing provider port.
