# P19.11 Security Certification

Do not read as PCI or pentest.

| Surface | Result |
|---|---|
| JWT secret from env (test fallback only in NODE_ENV=test) | PASS |
| Forged tenant header | PASS |
| Forged role JWT | PASS |
| Forged operator HTTP | PASS |
| Client entitlement flags | PASS (ignored) |
| Webhook unsigned | PASS |
| Webhook named PSP | PROVIDER_DEFERRED |
| Secrets in source | env names only (FACT of examples) |
| CORS origin: true | CONDITIONAL (dev-shaped) |
| File store hashes on disk | CONDITIONAL |
| FeatureGate server enforcement | **NOT CERTIFIED** (UX_ONLY) |

**SECURITY CERTIFIED: NO**  
**SECURITY FOUNDATION: CONDITIONAL**
