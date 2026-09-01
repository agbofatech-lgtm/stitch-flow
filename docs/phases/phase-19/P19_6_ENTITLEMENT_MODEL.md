# P19.6 Entitlement Model

`can(tenant, capability, { principal, workspace })`.

Reasons: ENTITLED, SUBSCRIPTION_REQUIRED, SUBSCRIPTION_CANCELLED/EXPIRED/PAST_DUE, UNKNOWN_CAPABILITY, FEATURE_DISABLED, PERMISSION_REQUIRED.

Does not mutate MeasurementVersion / execution.
