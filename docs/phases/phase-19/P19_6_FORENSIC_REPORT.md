# P19.6 Forensic Report

Predecessor P19.5: `f92a382b4aa27185e934fef90f522cf5c0c6b20d`. Tree clean. Protected hashes UNCHANGED.

| Finding | Class |
|---|---|
| Postgres in docker-compose; `/ready` `database: not-verified` | FACT |
| `002`–`005` migrations empty; no `scripts/run-migrations.js` | FACT |
| `initDb.ts` shop tables without tenant | FACT — not IAM |
| In-memory platform store | FACT / TRANSITIONAL |
| FeatureGate UX comment | FACT — still not wired to server |
| Live PSP | ABSENT / DEFERRED |
| Prices 29/79 45/90 | simulation-not-law |
| Control Center app | ABSENT before this slice |
