# P19.6 Commercial Authority

Server `POST /platform/access/check` is entitlement law. FeatureGate = UX_ONLY (config).

Checkout/cancel: `TENANT_OWNER` only (`PERMISSION_REQUIRED` otherwise).

Control Center configuration registry is the only mutable operational policy store this slice (`disabledCapabilities`). Pricing amounts are **immutable** here.
