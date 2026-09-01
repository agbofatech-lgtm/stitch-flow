# P19.7 Control Center Architecture

```
AGBOFA CONTROL CENTER (/control)
  Identity operators
  Tenant list
  Configuration registry
  Billing provider status (DEFERRED)
  Audit
        │ access policy only
        ▼
STITCHFLOW product + Trusted Core
```

No Control Center → pattern formula path. `tailoringAuthority: false` on `/control/status`.
