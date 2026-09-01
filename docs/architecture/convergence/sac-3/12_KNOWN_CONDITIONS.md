# Known Conditions

Shop persistence is **memory** (process-local). Not Postgres. AppContext remains UI SoT. T2 mirror unchanged. No remote sync. Frontend `shopClient` exists; screens not migrated. Stage machine is an in-memory adapter of protected SQL service rules. Logout/refresh still absent.
