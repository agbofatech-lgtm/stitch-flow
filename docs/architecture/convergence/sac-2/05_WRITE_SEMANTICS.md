# Write Semantics

```
AppContext mutation
  → saveAppStorage (legacy SoT, unchanged keys)
  → projectLegacyShopToT2 (fire-and-forget mirror)
       → EntityRepository.putLocalCanonical(id)
            no remote enqueue
            skip if existing payload.frozen === true
```

Bootstrap: `startDataAuthorityRuntime` then `projectLegacyShopFromStorage`.

Not T2-primary. Not dual-write ambiguity: **legacy is SoT; T2 is projection.**
