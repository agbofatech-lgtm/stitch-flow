# SAC-4 — PostgreSQL shop persistence authority

Shop `/shop` records use `SHOP_DATABASE_MODE=postgres` against a migration-governed `shop_*` schema. Platform IAM remains file/memory. Frontend screens, T2 remote sync, SAC-5, 3D, and Phase 20 are unchanged / locked.

Start: [`00_BASELINE.md`](./00_BASELINE.md)  
Decision: [`03_PERSISTENCE_DECISION.md`](./03_PERSISTENCE_DECISION.md)  
Certification: [`SAC4_FINAL_CERTIFICATION.md`](./SAC4_FINAL_CERTIFICATION.md)
