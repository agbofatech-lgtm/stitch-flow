# P19.7 Configuration Registry

Canonical keys live in `defaultPlatformConfiguration()`.

| Key | Mutable via Control Center |
|---|---|
| persistence.driver | no |
| billing.provider | no |
| subscription.cancelledAccess | no (Owner later) |
| subscription.pastDueAccess | no |
| offline.entitlementPolicy | no (UNKNOWN) |
| pricing.amountsAuthoritative | no (false) |
| featureGate.authority | no (UX_ONLY) |
| disabledCapabilities | **yes** |

No third price table. No frontend duplicate of these keys.
