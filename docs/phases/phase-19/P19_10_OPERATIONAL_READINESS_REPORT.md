# P19.10 Operational Readiness

| Endpoint | Behavior |
|---|---|
| `/health` | ok |
| `/ready` | `database: not-verified`, `postgres: not-verified`, `billingProvider: deferred` |
| Kill-switch | `disabledCapabilities` → FEATURE_DISABLED |
| Audit | identity + commercial + control sources |
| Offline entitlement | config `UNKNOWN` — no indefinite bypass implemented |
| JWT TTL | 15m default |

**SECURITY FOUNDATION = CONDITIONAL**  
**PCI = NOT CLAIMED**  
**PENETRATION TEST = NOT CLAIMED**
