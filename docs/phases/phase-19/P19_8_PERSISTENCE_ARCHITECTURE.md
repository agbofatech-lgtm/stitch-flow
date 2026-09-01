# P19.8 Persistence Architecture

```
createApp
  loadOrCreateStore(PLATFORM_DATA_PATH)
    memory  — tests / no path
    file    — durable JSON snapshot (TRANSITIONAL)
  postgres  — DEFERRED until connection verified (006 not applied)
```

Driver is not SQLite. Postgres remains the intended production engine.

Restart test: register → new runtime from file → login.
