# P19.8 Database Forensics

| Item | Class |
|---|---|
| Intended DB | PostgreSQL (`pg` Pool, docker-compose postgres:16) **FACT** |
| ORM | ABSENT **FACT** |
| Migration runner | `package.json` migrate script; `scripts/` missing **FACT** |
| 001 pgcrypto | FACT |
| 002–005 | empty files **FACT** |
| 006 platform commercial | written P19.6, **NOT APPLIED** |
| `/ready` database | `not-verified` **FACT** |
| `env.ts` requires DATABASE_URL | unused by `createApp` **FACT** |
| Production postgres | **NOT VERIFIED** |

No second database engine. Durable runtime uses **file JSON** when `PLATFORM_DATA_PATH` is set (TRANSITIONAL, not Postgres).
