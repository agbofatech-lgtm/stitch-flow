# P19.5 Billing Domain

Shop Invoice/Payment **unchanged**. SaaS types: `SaasPayment`, checkout, webhook event. Different store. STOP-P19.5-A not triggered.

Records are **tenantId**-scoped, never `workspaceId` as isolation.

Persistence: **TRANSITIONAL** in-memory (same as IAM).
